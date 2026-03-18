from datetime import datetime, UTC

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import SupplierPayment, SupplierPaymentAllocation


class SupplierPaymentRepository:
    def __init__(self, db: Session):
        self.db = db

    def next_number(self, organization_id, prefix="SPY"):
        count = self.db.scalar(select(func.count(SupplierPayment.id)).where(SupplierPayment.organization_id == organization_id)) or 0
        return f"{prefix}-{count + 1:06d}"

    def create(self, **kwargs):
        obj = SupplierPayment(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def get(self, organization_id, payment_id):
        return self.db.scalar(
            select(SupplierPayment).where(SupplierPayment.organization_id == organization_id, SupplierPayment.id == payment_id, SupplierPayment.deleted_at.is_(None))
        )

    def list(self, organization_id):
        return list(self.db.scalars(select(SupplierPayment).where(SupplierPayment.organization_id == organization_id, SupplierPayment.deleted_at.is_(None))).all())

    def allocate(self, **kwargs):
        obj = SupplierPaymentAllocation(created_at=datetime.now(UTC), **kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj
