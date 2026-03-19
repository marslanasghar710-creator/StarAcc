from datetime import datetime, timezone

UTC = timezone.utc
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import BillStatus
from app.core.exceptions import forbidden
from app.db.models import AccountingSettings
from app.repositories.audit import AuditRepository
from app.repositories.bill_repository import BillRepository
from app.repositories.supplier_repository import SupplierRepository
from app.services.journal_service import JournalService
from app.services.tax_posting_integration_service import TaxPostingIntegrationService
from app.core.enums import TaxTransactionDirection


class BillPostingService:
    def __init__(self, db: Session):
        self.db = db
        self.bills = BillRepository(db)
        self.suppliers = SupplierRepository(db)
        self.audit = AuditRepository(db)
        self.tax = TaxPostingIntegrationService(db)

    def post(self, organization_id, bill_id, actor_user_id):
        bill = self.bills.get(organization_id, bill_id)
        if not bill:
            raise forbidden("Bill not found")
        if bill.status != BillStatus.APPROVED:
            raise forbidden("Bill must be approved")
        if bill.posted_journal_id:
            raise forbidden("Bill already posted")
        supplier = self.suppliers.get(organization_id, bill.supplier_id)
        if not supplier or not supplier.is_active:
            raise forbidden("Inactive supplier")
        settings = self.db.query(AccountingSettings).filter(AccountingSettings.organization_id == organization_id).first()
        if not settings or not settings.accounts_payable_control_account_id:
            raise forbidden("AP control account missing")

        lines = self.bills.list_items(bill.id)
        if not lines:
            raise forbidden("Bill requires at least one line")

        tax_total = sum((Decimal(line.line_tax_amount or 0) for line in lines), Decimal("0"))
        tax_account_id = self.tax.control_account_id(organization_id, TaxTransactionDirection.INPUT, tax_total)
        journal_lines = []
        for line in lines:
            journal_lines.append({"account_id": line.account_id, "description": line.description, "debit_amount": Decimal(line.line_taxable_amount or line.line_subtotal), "credit_amount": Decimal("0"), "currency_code": bill.currency_code, "exchange_rate": bill.exchange_rate})
        if tax_total > 0:
            journal_lines.append({"account_id": tax_account_id, "description": f"Input tax {bill.bill_number}", "debit_amount": tax_total, "credit_amount": Decimal("0"), "currency_code": bill.currency_code, "exchange_rate": bill.exchange_rate})
        journal_lines.append({"account_id": settings.accounts_payable_control_account_id, "description": f"AP Bill {bill.bill_number}", "debit_amount": Decimal("0"), "credit_amount": Decimal(bill.total_amount), "currency_code": bill.currency_code, "exchange_rate": bill.exchange_rate})

        payload = {
            "entry_date": bill.issue_date,
            "description": f"Bill {bill.bill_number} from supplier {supplier.display_name}",
            "reference": bill.reference,
            "source_module": "accounts_payable",
            "source_type": "bill",
            "source_id": str(bill.id),
            "lines": [type("L", (), l) for l in journal_lines],
        }
        journal = JournalService(self.db).create(organization_id, actor_user_id, payload)
        journal = JournalService(self.db).post(organization_id, journal.id, actor_user_id)

        bill.posted_journal_id = journal.id
        bill.posted_at = datetime.now(UTC)
        bill.amount_due = Decimal(bill.total_amount) - Decimal(bill.amount_paid)
        bill.status = BillStatus.POSTED if bill.amount_due > 0 else BillStatus.PAID
        self.tax.create_transactions(
            organization_id=organization_id,
            source_module="accounts_payable",
            source_type="bill",
            source_id=bill.id,
            journal_entry_id=journal.id,
            transaction_date=bill.issue_date,
            currency_code=bill.currency_code,
            direction=TaxTransactionDirection.INPUT,
            tax_account_id=tax_account_id,
            lines=lines,
        )
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="bill.posted", entity_type="bill", entity_id=str(bill.id))
        self.db.commit()
        return bill
