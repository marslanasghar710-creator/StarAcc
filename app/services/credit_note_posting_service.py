from datetime import datetime, UTC
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import CreditNoteStatus
from app.core.exceptions import forbidden
from app.db.models import AccountingSettings
from app.repositories.audit import AuditRepository
from app.repositories.credit_note_repository import CreditNoteRepository
from app.services.journal_service import JournalService


class CreditNotePostingService:
    def __init__(self, db: Session):
        self.db = db
        self.credit_notes = CreditNoteRepository(db)
        self.audit = AuditRepository(db)

    def post(self, organization_id, credit_note_id, actor_user_id):
        note = self.credit_notes.get(organization_id, credit_note_id)
        if not note:
            raise forbidden("Credit note not found")
        if note.status != CreditNoteStatus.APPROVED:
            raise forbidden("Credit note must be approved")
        if note.posted_journal_id:
            raise forbidden("Credit note already posted")
        settings = self.db.query(AccountingSettings).filter(AccountingSettings.organization_id == organization_id).first()
        if not settings:
            raise forbidden("Accounting settings missing")
        lines = self.credit_notes.list_items(note.id)
        if not lines:
            raise forbidden("Credit note requires at least one line")

        journal_lines = []
        for line in lines:
            journal_lines.append({"account_id": line.account_id, "description": line.description, "debit_amount": Decimal(line.line_total), "credit_amount": Decimal("0"), "currency_code": note.currency_code, "exchange_rate": note.exchange_rate})
        journal_lines.append({"account_id": settings.accounts_receivable_control_account_id, "description": f"Credit note {note.credit_note_number}", "debit_amount": Decimal("0"), "credit_amount": Decimal(note.total_amount), "currency_code": note.currency_code, "exchange_rate": note.exchange_rate})

        payload = {
            "entry_date": note.issue_date,
            "description": f"Credit note {note.credit_note_number}",
            "reference": note.reference,
            "source_module": "accounts_receivable",
            "source_type": "credit_note",
            "source_id": str(note.id),
            "lines": [type("L", (), l) for l in journal_lines],
        }
        journal = JournalService(self.db).create(organization_id, actor_user_id, payload)
        journal = JournalService(self.db).post(organization_id, journal.id, actor_user_id)
        note.posted_journal_id = journal.id
        note.posted_at = datetime.now(UTC)
        note.status = CreditNoteStatus.POSTED
        note.unapplied_amount = Decimal(note.total_amount)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="credit_note.posted", entity_type="credit_note", entity_id=str(note.id))
        self.db.commit()
        return note
