from app.core.enums import JournalStatus
from datetime import datetime, timezone

UTC = timezone.utc

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Account, JournalEntry, JournalLine


class JournalRepository:
    def __init__(self, db: Session):
        self.db = db

    def next_entry_number(self, organization_id, prefix: str = "JRN") -> str:
        count = self.db.scalar(select(func.count(JournalEntry.id)).where(JournalEntry.organization_id == organization_id)) or 0
        return f"{prefix}-{count + 1:06d}"

    def create_journal(self, **kwargs):
        j = JournalEntry(**kwargs)
        self.db.add(j)
        self.db.flush()
        return j

    def add_line(self, **kwargs):
        line = JournalLine(created_at=datetime.now(UTC), **kwargs)
        self.db.add(line)
        self.db.flush()
        return line

    def get(self, organization_id, journal_id):
        return self.db.scalar(
            select(JournalEntry).where(JournalEntry.organization_id == organization_id, JournalEntry.id == journal_id, JournalEntry.deleted_at.is_(None))
        )

    def list(self, organization_id):
        return list(
            self.db.scalars(
                select(JournalEntry).where(JournalEntry.organization_id == organization_id, JournalEntry.deleted_at.is_(None))
            ).all()
        )

    def lines(self, journal_id):
        return list(self.db.scalars(select(JournalLine).where(JournalLine.journal_entry_id == journal_id).order_by(JournalLine.line_number)).all())

    def delete_lines(self, journal_id):
        for line in self.lines(journal_id):
            self.db.delete(line)

    def get_posted_ledger(self, organization_id, start_date=None, end_date=None):
        q = (
            select(JournalLine, JournalEntry, Account)
            .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
            .join(Account, Account.id == JournalLine.account_id)
            .where(JournalLine.organization_id == organization_id, JournalEntry.status == JournalStatus.POSTED)
            .order_by(JournalEntry.entry_date, JournalEntry.entry_number, JournalLine.line_number)
        )
        if start_date:
            q = q.where(JournalEntry.entry_date >= start_date)
        if end_date:
            q = q.where(JournalEntry.entry_date <= end_date)
        return self.db.execute(q).all()
