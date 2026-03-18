from datetime import datetime, UTC
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import InvoiceStatus
from app.core.exceptions import forbidden
from app.db.models import AccountingSettings
from app.repositories.account_repository import AccountRepository
from app.repositories.audit import AuditRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.services.journal_service import JournalService


class InvoicePostingService:
    def __init__(self, db: Session):
        self.db = db
        self.invoices = InvoiceRepository(db)
        self.customers = CustomerRepository(db)
        self.accounts = AccountRepository(db)
        self.audit = AuditRepository(db)

    def post(self, organization_id, invoice_id, actor_user_id):
        invoice = self.invoices.get(organization_id, invoice_id)
        if not invoice:
            raise forbidden("Invoice not found")
        if invoice.status not in {InvoiceStatus.APPROVED, InvoiceStatus.SENT}:
            raise forbidden("Invoice must be approved or sent")
        if invoice.posted_journal_id:
            raise forbidden("Invoice already posted")
        customer = self.customers.get(organization_id, invoice.customer_id)
        if not customer or not customer.is_active:
            raise forbidden("Inactive customer")
        settings = self.db.query(AccountingSettings).filter(AccountingSettings.organization_id == organization_id).first()
        if not settings:
            raise forbidden("Accounting settings missing")

        lines = self.invoices.list_items(invoice.id)
        if not lines:
            raise forbidden("Invoice requires at least one line")

        journal_lines = [{"account_id": settings.accounts_receivable_control_account_id, "description": f"AR Invoice {invoice.invoice_number}", "debit_amount": Decimal(invoice.total_amount), "credit_amount": Decimal("0"), "currency_code": invoice.currency_code, "exchange_rate": invoice.exchange_rate}]
        for line in lines:
            journal_lines.append({"account_id": line.account_id, "description": line.description, "debit_amount": Decimal("0"), "credit_amount": Decimal(line.line_total), "currency_code": invoice.currency_code, "exchange_rate": invoice.exchange_rate})

        payload = {
            "entry_date": invoice.issue_date,
            "description": f"Invoice {invoice.invoice_number} for customer {customer.display_name}",
            "reference": invoice.reference,
            "source_module": "accounts_receivable",
            "source_type": "invoice",
            "source_id": str(invoice.id),
            "lines": [type("L", (), l) for l in journal_lines],
        }
        journal = JournalService(self.db).create(organization_id, actor_user_id, payload)
        journal = JournalService(self.db).post(organization_id, journal.id, actor_user_id)

        invoice.posted_journal_id = journal.id
        invoice.posted_at = datetime.now(UTC)
        invoice.amount_due = Decimal(invoice.total_amount) - Decimal(invoice.amount_paid)
        invoice.status = InvoiceStatus.SENT if invoice.amount_due > 0 else InvoiceStatus.PAID
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="invoice.posted", entity_type="invoice", entity_id=str(invoice.id))
        self.db.commit()
        return invoice
