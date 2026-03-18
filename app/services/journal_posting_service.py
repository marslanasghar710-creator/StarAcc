from datetime import datetime, timezone

UTC = timezone.utc
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import JournalStatus
from app.core.exceptions import forbidden
from app.repositories.account_repository import AccountRepository
from app.repositories.audit import AuditRepository
from app.repositories.journal_repository import JournalRepository
from app.repositories.period_repository import PeriodRepository
from app.services.journal_validation_service import JournalValidationService


class JournalPostingService:
    def __init__(self, db: Session):
        self.db = db
        self.journals = JournalRepository(db)
        self.accounts = AccountRepository(db)
        self.periods = PeriodRepository(db)
        self.audit = AuditRepository(db)

    def post(self, organization_id, journal_id, actor_user_id):
        journal = self.journals.get(organization_id, journal_id)
        if not journal:
            raise forbidden("Journal not found")
        if journal.status != JournalStatus.DRAFT:
            raise forbidden("Only draft journals can be posted")
        period = self.periods.get(organization_id, journal.period_id)
        JournalValidationService.validate_period_open(period)
        lines = self.journals.lines(journal.id)
        JournalValidationService.validate_lines(lines)

        for line in lines:
            account = self.accounts.get(organization_id, line.account_id)
            if not account or not account.is_active or not account.is_postable or account.deleted_at is not None:
                raise forbidden("Line contains invalid account")
            line.base_debit_amount = Decimal(line.debit_amount)
            line.base_credit_amount = Decimal(line.credit_amount)
            bal = self.accounts.get_balance(organization_id, account.id)
            pbal = self.accounts.get_period_balance(organization_id, account.id, period.id)
            bal.period_debit += line.base_debit_amount
            bal.period_credit += line.base_credit_amount
            bal.closing_debit = bal.opening_debit + bal.period_debit
            bal.closing_credit = bal.opening_credit + bal.period_credit
            bal.updated_at = datetime.now(UTC)
            pbal.period_debit += line.base_debit_amount
            pbal.period_credit += line.base_credit_amount
            pbal.closing_debit = pbal.opening_debit + pbal.period_debit
            pbal.closing_credit = pbal.opening_credit + pbal.period_credit
            pbal.updated_at = datetime.now(UTC)

        journal.status = JournalStatus.POSTED
        journal.posted_at = datetime.now(UTC)
        journal.posted_by_user_id = actor_user_id
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="journal.posted", entity_type="journal", entity_id=str(journal.id))
        self.db.commit()
        return journal
