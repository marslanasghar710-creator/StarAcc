from datetime import datetime, UTC

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import CustomerPayment, CustomerPaymentAllocation


class CustomerPaymentRepository:
    def __init__(self, db: Session):
        self.db = db

    def next_number(self, organization_id, prefix="PAY"):
        count = self.db.scalar(select(func.count(CustomerPayment.id)).where(CustomerPayment.organization_id == organization_id)) or 0
        return f"{prefix}-{count + 1:06d}"

    def create(self, **kwargs):
        obj = CustomerPayment(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def get(self, organization_id, payment_id):
        return self.db.scalar(select(CustomerPayment).where(CustomerPayment.organization_id == organization_id, CustomerPayment.id == payment_id, CustomerPayment.deleted_at.is_(None)))

    def list(self, organization_id):
        return list(self.db.scalars(select(CustomerPayment).where(CustomerPayment.organization_id == organization_id, CustomerPayment.deleted_at.is_(None))).all())

    def allocate(self, **kwargs):
        obj = CustomerPaymentAllocation(created_at=datetime.now(UTC), **kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def list_allocations(self, payment_id):
        return list(self.db.scalars(select(CustomerPaymentAllocation).where(CustomerPaymentAllocation.customer_payment_id == payment_id)).all())
