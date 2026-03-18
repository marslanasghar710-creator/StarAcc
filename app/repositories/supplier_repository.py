from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.models import Supplier


class SupplierRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs):
        obj = Supplier(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def get(self, organization_id, supplier_id):
        return self.db.scalar(select(Supplier).where(Supplier.organization_id == organization_id, Supplier.id == supplier_id, Supplier.deleted_at.is_(None)))

    def list(self, organization_id, search: str | None = None):
        q = select(Supplier).where(Supplier.organization_id == organization_id, Supplier.deleted_at.is_(None))
        if search:
            term = f"%{search}%"
            q = q.where(or_(Supplier.display_name.ilike(term), Supplier.email.ilike(term)))
        return list(self.db.scalars(q.order_by(Supplier.display_name)).all())
