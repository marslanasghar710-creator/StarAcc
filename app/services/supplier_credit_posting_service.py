from datetime import datetime, timezone

UTC = timezone.utc
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import SupplierCreditStatus
from app.core.exceptions import forbidden
from app.db.models import AccountingSettings
from app.repositories.audit import AuditRepository
from app.repositories.supplier_credit_repository import SupplierCreditRepository
from app.services.journal_service import JournalService


class SupplierCreditPostingService:
    def __init__(self, db: Session):
        self.db = db
        self.supplier_credits = SupplierCreditRepository(db)
        self.audit = AuditRepository(db)

    def post(self, organization_id, supplier_credit_id, actor_user_id):
        credit = self.supplier_credits.get(organization_id, supplier_credit_id)
        if not credit:
            raise forbidden("Supplier credit not found")
        if credit.status != SupplierCreditStatus.APPROVED:
            raise forbidden("Supplier credit must be approved")
        if credit.posted_journal_id:
            raise forbidden("Supplier credit already posted")
        settings = self.db.query(AccountingSettings).filter(AccountingSettings.organization_id == organization_id).first()
        if not settings or not settings.accounts_payable_control_account_id:
            raise forbidden("AP control account missing")

        lines = self.supplier_credits.list_items(credit.id)
        if not lines:
            raise forbidden("Supplier credit requires at least one line")

        journal_lines = [{"account_id": settings.accounts_payable_control_account_id, "description": f"Supplier credit {credit.supplier_credit_number}", "debit_amount": Decimal(credit.total_amount), "credit_amount": Decimal("0"), "currency_code": credit.currency_code, "exchange_rate": credit.exchange_rate}]
        for line in lines:
            journal_lines.append({"account_id": line.account_id, "description": line.description, "debit_amount": Decimal("0"), "credit_amount": Decimal(line.line_total), "currency_code": credit.currency_code, "exchange_rate": credit.exchange_rate})

        payload = {
            "entry_date": credit.issue_date,
            "description": f"Supplier credit {credit.supplier_credit_number}",
            "reference": credit.reference,
            "source_module": "accounts_payable",
            "source_type": "supplier_credit",
            "source_id": str(credit.id),
            "lines": [type("L", (), l) for l in journal_lines],
        }
        journal = JournalService(self.db).create(organization_id, actor_user_id, payload)
        journal = JournalService(self.db).post(organization_id, journal.id, actor_user_id)

        credit.posted_journal_id = journal.id
        credit.posted_at = datetime.now(UTC)
        credit.status = SupplierCreditStatus.POSTED
        credit.unapplied_amount = Decimal(credit.total_amount)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="supplier_credit.posted", entity_type="supplier_credit", entity_id=str(credit.id))
        self.db.commit()
        return credit
