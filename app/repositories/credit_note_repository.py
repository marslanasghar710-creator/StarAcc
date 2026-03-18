from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import CreditNote, CreditNoteItem


class CreditNoteRepository:
    def __init__(self, db: Session):
        self.db = db

    def next_number(self, organization_id, prefix="CRN"):
        count = self.db.scalar(select(func.count(CreditNote.id)).where(CreditNote.organization_id == organization_id)) or 0
        return f"{prefix}-{count + 1:06d}"

    def create(self, **kwargs):
        obj = CreditNote(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def get(self, organization_id, credit_note_id):
        return self.db.scalar(select(CreditNote).where(CreditNote.organization_id == organization_id, CreditNote.id == credit_note_id, CreditNote.deleted_at.is_(None)))

    def list(self, organization_id):
        return list(self.db.scalars(select(CreditNote).where(CreditNote.organization_id == organization_id, CreditNote.deleted_at.is_(None))).all())

    def create_item(self, **kwargs):
        obj = CreditNoteItem(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def list_items(self, credit_note_id):
        return list(self.db.scalars(select(CreditNoteItem).where(CreditNoteItem.credit_note_id == credit_note_id, CreditNoteItem.deleted_at.is_(None)).order_by(CreditNoteItem.line_number)).all())
