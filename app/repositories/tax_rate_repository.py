from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.models import TaxRate


class TaxRateRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs):
        obj = TaxRate(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def get(self, organization_id, tax_rate_id):
        return self.db.scalar(select(TaxRate).where(TaxRate.organization_id == organization_id, TaxRate.id == tax_rate_id, TaxRate.deleted_at.is_(None)))

    def get_by_code(self, organization_id, code: str):
        return self.db.scalar(select(TaxRate).where(TaxRate.organization_id == organization_id, TaxRate.code == code, TaxRate.deleted_at.is_(None)))

    def list(self, organization_id, search: str | None = None):
        q = select(TaxRate).where(TaxRate.organization_id == organization_id, TaxRate.deleted_at.is_(None)).order_by(TaxRate.code)
        if search:
            term = f"%{search}%"
            q = q.where(or_(TaxRate.code.ilike(term), TaxRate.name.ilike(term)))
        return list(self.db.scalars(q).all())
