from datetime import datetime, timezone

UTC = timezone.utc
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import BillStatus
from app.core.exceptions import forbidden, not_found
from app.repositories.account_repository import AccountRepository
from app.repositories.audit import AuditRepository
from app.repositories.bill_repository import BillRepository
from app.repositories.supplier_repository import SupplierRepository
from app.services.bill_calculation_service import BillCalculationService
from app.services.bill_posting_service import BillPostingService


class BillService:
    def __init__(self, db: Session):
        self.db = db
        self.bills = BillRepository(db)
        self.suppliers = SupplierRepository(db)
        self.accounts = AccountRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id, actor_user_id, payload):
        if payload["due_date"] < payload["issue_date"]:
            raise forbidden("Due date cannot be before issue date")
        supplier = self.suppliers.get(organization_id, payload["supplier_id"])
        if not supplier:
            raise not_found("Supplier not found")
        number = self.bills.next_number(organization_id)
        bill = self.bills.create(
            organization_id=organization_id,
            supplier_id=payload["supplier_id"],
            bill_number=number,
            issue_date=payload["issue_date"],
            due_date=payload["due_date"],
            currency_code=payload["currency_code"],
            reference=payload.get("reference"),
            notes=payload.get("notes"),
            terms=payload.get("terms"),
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

    def add_item(self, organization_id, bill_id, item, line_number=None):
        bill = self.bills.get(organization_id, bill_id)
        if not bill:
            raise not_found("Bill not found")
        if bill.status != BillStatus.DRAFT:
            raise forbidden("Only draft bill can be modified")
        account = self.accounts.get(organization_id, item["account_id"]) if isinstance(item, dict) else self.accounts.get(organization_id, item.account_id)
        if not account or not account.is_postable or not account.is_active:
            raise forbidden("Invalid account for bill item")
        src = item if isinstance(item, dict) else item.__dict__
        subtotal, tax, total = BillCalculationService.calculate_line(src["quantity"], src["unit_price"], src.get("discount_percent"), src.get("discount_amount"), src.get("line_tax_amount", 0))
        line_number = line_number or (len(self.bills.list_items(bill_id)) + 1)
        self.bills.create_item(
            bill_id=bill_id,
            organization_id=organization_id,
            line_number=line_number,
            item_code=src.get("item_code"),
            description=src["description"],
            quantity=src["quantity"],
            unit_price=src["unit_price"],
            discount_percent=src.get("discount_percent"),
            discount_amount=src.get("discount_amount"),
            tax_code_id=None,
            account_id=src["account_id"],
            line_subtotal=subtotal,
            line_tax_amount=tax,
            line_total=total,
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
        bill.status = BillStatus.VOIDED
        bill.voided_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="bill.voided", entity_type="bill", entity_id=str(bill.id))
        self.db.commit()
        return bill
