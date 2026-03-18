from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.models import Customer


class CustomerRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs):
        obj = Customer(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def get(self, organization_id, customer_id):
        return self.db.scalar(select(Customer).where(Customer.organization_id == organization_id, Customer.id == customer_id, Customer.deleted_at.is_(None)))

    def list(self, organization_id, search: str | None = None):
        q = select(Customer).where(Customer.organization_id == organization_id, Customer.deleted_at.is_(None))
        if search:
            term = f"%{search}%"
            q = q.where(or_(Customer.display_name.ilike(term), Customer.email.ilike(term)))
        return list(self.db.scalars(q.order_by(Customer.display_name)).all())
