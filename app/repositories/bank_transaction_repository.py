from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import BankTransactionStatus
from app.db.models import BankTransaction


class BankTransactionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs) -> BankTransaction:
        txn = BankTransaction(**kwargs)
        self.db.add(txn)
        self.db.flush()
        return txn

    def get(self, organization_id, transaction_id):
        return self.db.scalar(
            select(BankTransaction).where(
                BankTransaction.organization_id == organization_id,
                BankTransaction.id == transaction_id,
                BankTransaction.deleted_at.is_(None),
            )
        )

    def list(self, organization_id, bank_account_id=None, status: BankTransactionStatus | None = None):
        q = select(BankTransaction).where(BankTransaction.organization_id == organization_id, BankTransaction.deleted_at.is_(None))
        if bank_account_id:
            q = q.where(BankTransaction.bank_account_id == bank_account_id)
        if status:
            q = q.where(BankTransaction.status == status)
        return list(self.db.scalars(q.order_by(BankTransaction.transaction_date, BankTransaction.created_at)).all())
