from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import SupplierCredit, SupplierCreditItem


class SupplierCreditRepository:
    def __init__(self, db: Session):
        self.db = db

    def next_number(self, organization_id, prefix="SCN"):
        count = self.db.scalar(select(func.count(SupplierCredit.id)).where(SupplierCredit.organization_id == organization_id)) or 0
        return f"{prefix}-{count + 1:06d}"

    def create(self, **kwargs):
        obj = SupplierCredit(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def get(self, organization_id, supplier_credit_id):
        return self.db.scalar(
            select(SupplierCredit).where(SupplierCredit.organization_id == organization_id, SupplierCredit.id == supplier_credit_id, SupplierCredit.deleted_at.is_(None))
        )

    def list(self, organization_id):
        return list(self.db.scalars(select(SupplierCredit).where(SupplierCredit.organization_id == organization_id, SupplierCredit.deleted_at.is_(None))).all())

    def create_item(self, **kwargs):
        obj = SupplierCreditItem(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def list_items(self, supplier_credit_id):
        return list(
            self.db.scalars(
                select(SupplierCreditItem)
                .where(SupplierCreditItem.supplier_credit_id == supplier_credit_id, SupplierCreditItem.deleted_at.is_(None))
                .order_by(SupplierCreditItem.line_number)
            ).all()
        )
