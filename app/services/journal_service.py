from datetime import datetime, UTC

from sqlalchemy.orm import Session

from app.core.enums import JournalStatus
from app.core.exceptions import forbidden, not_found
from app.repositories.account_repository import AccountRepository
from app.repositories.audit import AuditRepository
from app.repositories.journal_repository import JournalRepository
from app.repositories.period_repository import PeriodRepository
from app.services.journal_posting_service import JournalPostingService
from app.services.journal_validation_service import JournalValidationService


class JournalService:
    def __init__(self, db: Session):
        self.db = db
        self.journals = JournalRepository(db)
        self.periods = PeriodRepository(db)
        self.accounts = AccountRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id, actor_user_id, payload):
        period = self.periods.resolve_by_date(organization_id, payload["entry_date"])
        if not period:
            raise forbidden("No financial period for entry date")
        JournalValidationService.validate_period_open(period)
        JournalValidationService.validate_lines(payload["lines"])
        number = self.journals.next_entry_number(organization_id)
        journal = self.journals.create_journal(
            organization_id=organization_id,
            entry_number=number,
            period_id=period.id,
            created_by_user_id=actor_user_id,
            **{k: v for k, v in payload.items() if k != "lines"},
        )
        for i, line in enumerate(payload["lines"], start=1):
            account = self.accounts.get(organization_id, line.account_id)
            if not account or not account.is_active or not account.is_postable or account.deleted_at is not None:
                raise forbidden("Line contains invalid account")
            self.journals.add_line(
                journal_entry_id=journal.id,
                organization_id=organization_id,
                line_number=i,
                account_id=line.account_id,
                description=line.description,
                debit_amount=line.debit_amount,
                credit_amount=line.credit_amount,
                currency_code=line.currency_code,
                exchange_rate=line.exchange_rate,
                base_debit_amount=line.debit_amount,
                base_credit_amount=line.credit_amount,
            )
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="journal.created", entity_type="journal", entity_id=str(journal.id))
        self.db.commit()
        return journal

    def update(self, organization_id, journal_id, actor_user_id, payload):
        journal = self.journals.get(organization_id, journal_id)
        if not journal:
            raise not_found("Journal not found")
        JournalValidationService.validate_editable(journal.status)
        if payload.get("lines") is not None:
            JournalValidationService.validate_lines(payload["lines"])
            self.journals.delete_lines(journal.id)
            for i, line in enumerate(payload["lines"], start=1):
                self.journals.add_line(
                    journal_entry_id=journal.id,
                    organization_id=organization_id,
                    line_number=i,
                    account_id=line.account_id,
                    description=line.description,
                    debit_amount=line.debit_amount,
                    credit_amount=line.credit_amount,
                    currency_code=line.currency_code,
                    exchange_rate=line.exchange_rate,
                    base_debit_amount=line.debit_amount,
                    base_credit_amount=line.credit_amount,
                )
        for k in ["description", "reference"]:
            if k in payload and payload[k] is not None:
                setattr(journal, k, payload[k])
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="journal.updated", entity_type="journal", entity_id=str(journal.id))
        self.db.commit()
        return journal

    def delete_or_void(self, organization_id, journal_id, actor_user_id):
        journal = self.journals.get(organization_id, journal_id)
        if not journal:
            raise not_found("Journal not found")
        if journal.status == JournalStatus.DRAFT:
            journal.deleted_at = datetime.now(UTC)
            self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="journal.voided", entity_type="journal", entity_id=str(journal.id))
            self.db.commit()
            return
        raise forbidden("Posted journals cannot be deleted; reverse instead")

    def post(self, organization_id, journal_id, actor_user_id):
        return JournalPostingService(self.db).post(organization_id, journal_id, actor_user_id)

    def reverse(self, organization_id, journal_id, actor_user_id, reversal_date, reason):
        original = self.journals.get(organization_id, journal_id)
        if not original:
            raise not_found("Journal not found")
        if original.status != JournalStatus.POSTED:
            raise forbidden("Only posted journal can be reversed")
        lines = self.journals.lines(original.id)
        payload = {
            "entry_date": reversal_date,
            "description": f"REVERSAL {original.entry_number}: {reason}",
            "reference": original.entry_number,
            "source_module": "ledger",
            "source_type": "reversal",
            "source_id": str(original.id),
            "lines": [
                type("L", (), {
                    "account_id": l.account_id,
                    "description": l.description,
                    "debit_amount": l.credit_amount,
                    "credit_amount": l.debit_amount,
                    "currency_code": l.currency_code,
                    "exchange_rate": l.exchange_rate,
                })
                for l in lines
            ],
        }
        reversal = self.create(organization_id, actor_user_id, payload)
        posted = self.post(organization_id, reversal.id, actor_user_id)
        original.status = JournalStatus.REVERSED
        original.reversal_journal_id = posted.id
        posted.reversed_from_journal_id = original.id
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="journal.reversed", entity_type="journal", entity_id=str(original.id))
        self.db.commit()
        return posted

    def void(self, organization_id, journal_id, actor_user_id, reason):
        journal = self.journals.get(organization_id, journal_id)
        if not journal:
            raise not_found("Journal not found")
        if journal.status == JournalStatus.POSTED:
            raise forbidden("Posted journal cannot be voided directly; use reverse")
        journal.status = JournalStatus.VOIDED
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="journal.voided", entity_type="journal", entity_id=str(journal.id), metadata_json={"reason": reason})
        self.db.commit()
        return journal
