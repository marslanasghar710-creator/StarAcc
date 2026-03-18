from datetime import datetime, UTC
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import InvoiceStatus
from app.core.exceptions import forbidden, not_found
from app.repositories.account_repository import AccountRepository
from app.repositories.audit import AuditRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.services.invoice_calculation_service import InvoiceCalculationService
from app.services.invoice_posting_service import InvoicePostingService


class InvoiceService:
    def __init__(self, db: Session):
        self.db = db
        self.invoices = InvoiceRepository(db)
        self.customers = CustomerRepository(db)
        self.accounts = AccountRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id, actor_user_id, payload):
        if payload["due_date"] < payload["issue_date"]:
            raise forbidden("Due date cannot be before issue date")
        customer = self.customers.get(organization_id, payload["customer_id"])
        if not customer:
            raise not_found("Customer not found")
        number = self.invoices.next_number(organization_id)
        invoice = self.invoices.create(
            organization_id=organization_id,
            customer_id=payload["customer_id"],
            invoice_number=number,
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
            self.add_item(organization_id, invoice.id, item, i)
        self._recalc(invoice)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="invoice.created", entity_type="invoice", entity_id=str(invoice.id))
        self.db.commit()
        return invoice

    def add_item(self, organization_id, invoice_id, item, line_number=None):
        inv = self.invoices.get(organization_id, invoice_id)
        if not inv:
            raise not_found("Invoice not found")
        if inv.status != InvoiceStatus.DRAFT:
            raise forbidden("Only draft invoice can be modified")
        account = self.accounts.get(organization_id, item["account_id"]) if isinstance(item, dict) else self.accounts.get(organization_id, item.account_id)
        if not account or not account.is_postable or not account.is_active:
            raise forbidden("Invalid account for invoice item")
        src = item if isinstance(item, dict) else item.__dict__
        subtotal, tax, total = InvoiceCalculationService.calculate_line(src["quantity"], src["unit_price"], src.get("discount_percent"), src.get("discount_amount"), src.get("line_tax_amount", 0))
        line_number = line_number or (len(self.invoices.list_items(invoice_id)) + 1)
        self.invoices.create_item(
            invoice_id=invoice_id,
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

    def _recalc(self, invoice):
        lines = self.invoices.list_items(invoice.id)
        subtotal, discount, tax, total = InvoiceCalculationService.calculate_header(lines)
        invoice.subtotal_amount = subtotal
        invoice.discount_amount = discount
        invoice.tax_amount = tax
        invoice.total_amount = total
        invoice.amount_due = total - Decimal(invoice.amount_paid or 0)

    def update(self, organization_id, invoice_id, actor_user_id, payload):
        inv = self.invoices.get(organization_id, invoice_id)
        if not inv:
            raise not_found("Invoice not found")
        if inv.status != InvoiceStatus.DRAFT:
            raise forbidden("Only draft invoice editable")
        if payload.get("due_date") and payload["due_date"] < inv.issue_date:
            raise forbidden("Due date cannot be before issue date")
        for k, v in payload.items():
            setattr(inv, k, v)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="invoice.updated", entity_type="invoice", entity_id=str(inv.id))
        self.db.commit()
        return inv

    def approve(self, organization_id, invoice_id, actor_user_id):
        inv = self.invoices.get(organization_id, invoice_id)
        if not inv:
            raise not_found("Invoice not found")
        if inv.status != InvoiceStatus.DRAFT:
            raise forbidden("Only draft can be approved")
        if len(self.invoices.list_items(inv.id)) == 0:
            raise forbidden("Invoice needs at least one line")
        inv.status = InvoiceStatus.APPROVED
        inv.approved_by_user_id = actor_user_id
        inv.approved_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="invoice.approved", entity_type="invoice", entity_id=str(inv.id))
        self.db.commit()
        return inv

    def send(self, organization_id, invoice_id, actor_user_id):
        inv = self.invoices.get(organization_id, invoice_id)
        if not inv:
            raise not_found("Invoice not found")
        if inv.status not in {InvoiceStatus.APPROVED, InvoiceStatus.SENT}:
            raise forbidden("Invoice must be approved")
        inv.status = InvoiceStatus.SENT
        inv.sent_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="invoice.sent", entity_type="invoice", entity_id=str(inv.id))
        self.db.commit()
        return inv

    def post(self, organization_id, invoice_id, actor_user_id):
        return InvoicePostingService(self.db).post(organization_id, invoice_id, actor_user_id)

    def delete_draft(self, organization_id, invoice_id):
        inv = self.invoices.get(organization_id, invoice_id)
        if not inv:
            raise not_found("Invoice not found")
        if inv.status != InvoiceStatus.DRAFT:
            raise forbidden("Only draft can be deleted")
        inv.deleted_at = datetime.now(UTC)
        self.db.commit()

    def void(self, organization_id, invoice_id, actor_user_id):
        inv = self.invoices.get(organization_id, invoice_id)
        if not inv:
            raise not_found("Invoice not found")
        if inv.amount_paid > 0:
            raise forbidden("Cannot void paid/partially paid invoice")
        inv.status = InvoiceStatus.VOIDED
        inv.voided_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="invoice.voided", entity_type="invoice", entity_id=str(inv.id))
        self.db.commit()
        return inv
