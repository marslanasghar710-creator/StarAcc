from datetime import datetime, timezone

UTC = timezone.utc
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import BillStatus, InventorySourceEntityType, TaxCodeAppliesTo
from app.core.exceptions import forbidden, not_found
from app.repositories.account_repository import AccountRepository
from app.repositories.audit import AuditRepository
from app.repositories.bill_repository import BillRepository
from app.repositories.supplier_repository import SupplierRepository
from app.services.bill_calculation_service import BillCalculationService
from app.services.bill_posting_service import BillPostingService
from app.services.branding_service import BrandingService
from app.services.inventory_service import InventoryService
from app.services.numbering_service import NumberingService
from app.services.tax_calculation_service import TaxCalculationService
from app.services.tax_settings_service import TaxSettingsService


class BillService:
    def __init__(self, db: Session):
        self.db = db
        self.bills = BillRepository(db)
        self.suppliers = SupplierRepository(db)
        self.accounts = AccountRepository(db)
        self.audit = AuditRepository(db)
        self.tax = TaxCalculationService(db)
        self.tax_settings = TaxSettingsService(db)
        self.branding = BrandingService(db)
        self.numbering = NumberingService(db)
        self.inventory = InventoryService(db)

    def create(self, organization_id, actor_user_id, payload):
        if payload["due_date"] < payload["issue_date"]:
            raise forbidden("Due date cannot be before issue date")
        supplier = self.suppliers.get(organization_id, payload["supplier_id"])
        if not supplier:
            raise not_found("Supplier not found")
        number = self.numbering.next_number(organization_id, "bill")
        bill = self.bills.create(
            organization_id=organization_id,
            supplier_id=payload["supplier_id"],
            bill_number=number,
            issue_date=payload["issue_date"],
            due_date=payload["due_date"],
            currency_code=payload["currency_code"],
            reference=payload.get("reference"),
            notes=payload.get("notes"),
            terms=payload.get("terms") or self.branding.get_or_create(organization_id).bill_terms_default,
            prices_entered_are=payload.get("prices_entered_are") or self.tax_settings.get_or_create(organization_id).prices_entered_are.value,
            created_by_user_id=actor_user_id,
            amount_paid=Decimal("0"),
            amount_due=Decimal("0"),
        )
        for i, item in enumerate(payload.get("items", []), start=1):
            self.add_item(organization_id, bill.id, item, i)
        self._recalc(bill)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="bill.created", entity_type="bill", entity_id=str(bill.id))
        self.db.commit()
        return bill

    def _resolve_item_context(self, organization_id, src):
        item = self.inventory._resolve_line_item(organization_id, src)
        account_id = src.get("account_id")
        tax_code_id = src.get("tax_code_id")
        description = src["description"]
        item_code = src.get("item_code")
        if item:
            description = src.get("description") or item.name
            item_code = src.get("item_code") or item.sku
            if item.is_tracked_inventory:
                account_id = item.inventory_asset_account_id
            elif not account_id:
                account_id = item.expense_account_id
            if not tax_code_id:
                tax_code_id = item.purchase_tax_code_id
        if not account_id:
            raise forbidden("Bill item requires an account or linked item default account")
        return item, account_id, tax_code_id, description, item_code

    def add_item(self, organization_id, bill_id, item, line_number=None):
        bill = self.bills.get(organization_id, bill_id)
        if not bill:
            raise not_found("Bill not found")
        if bill.status != BillStatus.DRAFT:
            raise forbidden("Only draft bill can be modified")
        src = item if isinstance(item, dict) else item.__dict__
        linked_item, account_id, tax_code_id, description, item_code = self._resolve_item_context(organization_id, src)
        account = self.accounts.get(organization_id, account_id)
        if not account or not account.is_postable or not account.is_active:
            raise forbidden("Invalid account for bill item")
        calc = self.tax.calculate_line(
            organization_id,
            quantity=src["quantity"],
            unit_price=src["unit_price"],
            discount_percent=src.get("discount_percent"),
            discount_amount=src.get("discount_amount"),
            tax_code_id=tax_code_id,
            usage=TaxCodeAppliesTo.PURCHASES,
        )
        line_number = line_number or (len(self.bills.list_items(bill_id)) + 1)
        self.bills.create_item(
            bill_id=bill_id,
            organization_id=organization_id,
            line_number=line_number,
            item_id=linked_item.id if linked_item else None,
            location_id=src.get("location_id"),
            item_code=item_code,
            description=description,
            quantity=src["quantity"],
            unit_price=src["unit_price"],
            discount_percent=src.get("discount_percent"),
            discount_amount=src.get("discount_amount"),
            tax_code_id=tax_code_id,
            account_id=account_id,
            tax_breakdown_json=calc.tax_breakdown,
            line_taxable_amount=calc.taxable_amount,
            line_subtotal=calc.taxable_amount,
            line_tax_amount=calc.tax_amount,
            line_total=calc.gross_amount,
            effective_tax_rate=calc.effective_tax_rate,
            tax_inclusive_flag=calc.tax_inclusive,
        )

    def _recalc(self, bill):
        lines = self.bills.list_items(bill.id)
        subtotal, discount, tax, total = BillCalculationService.calculate_header(lines)
        bill.subtotal_amount = subtotal
        bill.discount_amount = discount
        bill.tax_amount = tax
        bill.total_amount = total
        bill.amount_due = total - Decimal(bill.amount_paid or 0)

    def update(self, organization_id, bill_id, actor_user_id, payload):
        bill = self.bills.get(organization_id, bill_id)
        if not bill:
            raise not_found("Bill not found")
        if bill.status != BillStatus.DRAFT:
            raise forbidden("Only draft bill editable")
        if payload.get("due_date") and payload["due_date"] < bill.issue_date:
            raise forbidden("Due date cannot be before issue date")
        for k, v in payload.items():
            setattr(bill, k, v)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="bill.updated", entity_type="bill", entity_id=str(bill.id))
        self.db.commit()
        return bill

    def approve(self, organization_id, bill_id, actor_user_id):
        bill = self.bills.get(organization_id, bill_id)
        if not bill:
            raise not_found("Bill not found")
        if bill.status != BillStatus.DRAFT:
            raise forbidden("Only draft can be approved")
        if len(self.bills.list_items(bill.id)) == 0:
            raise forbidden("Bill needs at least one line")
        bill.status = BillStatus.APPROVED
        bill.approved_by_user_id = actor_user_id
        bill.approved_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="bill.approved", entity_type="bill", entity_id=str(bill.id))
        self.db.commit()
        return bill

    def post(self, organization_id, bill_id, actor_user_id):
        return BillPostingService(self.db).post(organization_id, bill_id, actor_user_id)

    def delete_draft(self, organization_id, bill_id):
        bill = self.bills.get(organization_id, bill_id)
        if not bill:
            raise not_found("Bill not found")
        if bill.status != BillStatus.DRAFT:
            raise forbidden("Only draft can be deleted")
        bill.deleted_at = datetime.now(UTC)
        self.db.commit()

    def void(self, organization_id, bill_id, actor_user_id):
        bill = self.bills.get(organization_id, bill_id)
        if not bill:
            raise not_found("Bill not found")
        if bill.amount_paid > 0:
            raise forbidden("Cannot void paid/partially paid bill")
        if bill.posted_journal_id and not bill.voided_journal_id:
            from app.services.journal_service import JournalService

            reversal = JournalService(self.db).reverse(organization_id, bill.posted_journal_id, actor_user_id, bill.issue_date, "Bill void")
            self.inventory.reverse_document_movements(
                organization_id,
                InventorySourceEntityType.BILL,
                bill.id,
                actor_user_id,
                datetime.combine(bill.issue_date, datetime.min.time(), tzinfo=UTC),
                f"Bill {bill.bill_number} void reversal",
            )
            bill.voided_journal_id = reversal.id
        bill.status = BillStatus.VOIDED
        bill.voided_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="bill.voided", entity_type="bill", entity_id=str(bill.id))
        self.db.commit()
        return bill
