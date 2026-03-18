from app.core.enums import JournalStatus
from datetime import datetime, UTC

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.models import Account, AccountBalance, AccountPeriodBalance, JournalEntry, JournalLine


class AccountRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs) -> Account:
        account = Account(**kwargs)
        self.db.add(account)
        self.db.flush()
        return account

    def get(self, organization_id, account_id):
        return self.db.scalar(
            select(Account).where(Account.organization_id == organization_id, Account.id == account_id, Account.deleted_at.is_(None))
        )

    def get_by_code(self, organization_id, code: str):
        return self.db.scalar(select(Account).where(Account.organization_id == organization_id, Account.code == code, Account.deleted_at.is_(None)))

    def list(self, organization_id, search: str | None = None):
        q = select(Account).where(Account.organization_id == organization_id, Account.deleted_at.is_(None))
        if search:
            term = f"%{search}%"
            q = q.where(or_(Account.code.ilike(term), Account.name.ilike(term)))
        return list(self.db.scalars(q.order_by(Account.code)).all())

    def get_balance(self, organization_id, account_id):
        bal = self.db.scalar(
            select(AccountBalance).where(AccountBalance.organization_id == organization_id, AccountBalance.account_id == account_id)
        )
        if bal:
            return bal
        bal = AccountBalance(
            organization_id=organization_id,
            account_id=account_id,
            opening_debit=0,
            opening_credit=0,
            period_debit=0,
            period_credit=0,
            closing_debit=0,
            closing_credit=0,
            updated_at=datetime.now(UTC),
        )
        self.db.add(bal)
        self.db.flush()
        return bal

    def get_period_balance(self, organization_id, account_id, period_id):
        bal = self.db.scalar(
            select(AccountPeriodBalance).where(
                AccountPeriodBalance.organization_id == organization_id,
                AccountPeriodBalance.account_id == account_id,
                AccountPeriodBalance.period_id == period_id,
            )
        )
        if bal:
            return bal
        bal = AccountPeriodBalance(
            organization_id=organization_id,
            account_id=account_id,
            period_id=period_id,
            opening_debit=0,
            opening_credit=0,
            period_debit=0,
            period_credit=0,
            closing_debit=0,
            closing_credit=0,
            updated_at=datetime.now(UTC),
        )
        self.db.add(bal)
        self.db.flush()
        return bal

    def ledger_for_account(self, organization_id, account_id, start_date=None, end_date=None):
        q = (
            select(JournalLine, JournalEntry)
            .join(JournalEntry, JournalLine.journal_entry_id == JournalEntry.id)
            .where(
                JournalLine.organization_id == organization_id,
                JournalLine.account_id == account_id,
                JournalEntry.status == JournalStatus.POSTED,
            )
            .order_by(JournalEntry.entry_date, JournalEntry.entry_number, JournalLine.line_number)
        )
        if start_date:
            q = q.where(JournalEntry.entry_date >= start_date)
        if end_date:
            q = q.where(JournalEntry.entry_date <= end_date)
        return self.db.execute(q).all()

    def account_has_non_zero_balance(self, organization_id, account_id) -> bool:
        bal = self.get_balance(organization_id, account_id)
        return any([bal.closing_debit != 0, bal.closing_credit != 0, bal.period_debit != 0, bal.period_credit != 0])
