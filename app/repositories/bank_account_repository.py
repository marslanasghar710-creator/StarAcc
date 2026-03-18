from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.models import BankAccount


class BankAccountRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs) -> BankAccount:
        bank_account = BankAccount(**kwargs)
        self.db.add(bank_account)
        self.db.flush()
        return bank_account

    def get(self, organization_id, bank_account_id):
        return self.db.scalar(
            select(BankAccount).where(
                BankAccount.organization_id == organization_id,
                BankAccount.id == bank_account_id,
                BankAccount.deleted_at.is_(None),
            )
        )

    def get_by_account(self, organization_id, account_id):
        return self.db.scalar(
            select(BankAccount).where(
                BankAccount.organization_id == organization_id,
                BankAccount.account_id == account_id,
                BankAccount.deleted_at.is_(None),
            )
        )

    def list(self, organization_id, search: str | None = None):
        q = select(BankAccount).where(BankAccount.organization_id == organization_id, BankAccount.deleted_at.is_(None))
        if search:
            term = f"%{search}%"
            q = q.where(or_(BankAccount.name.ilike(term), BankAccount.bank_name.ilike(term)))
        return list(self.db.scalars(q.order_by(BankAccount.name)).all())
