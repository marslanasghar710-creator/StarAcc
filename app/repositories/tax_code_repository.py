from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.db.models import TaxCode, TaxCodeComponent


class TaxCodeRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs):
        obj = TaxCode(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def get(self, organization_id, tax_code_id):
        return self.db.scalar(select(TaxCode).where(TaxCode.organization_id == organization_id, TaxCode.id == tax_code_id, TaxCode.deleted_at.is_(None)))

    def get_by_code(self, organization_id, code: str):
        return self.db.scalar(select(TaxCode).where(TaxCode.organization_id == organization_id, TaxCode.code == code, TaxCode.deleted_at.is_(None)))

    def list(self, organization_id, search: str | None = None):
        q = select(TaxCode).where(TaxCode.organization_id == organization_id, TaxCode.deleted_at.is_(None)).order_by(TaxCode.code)
        if search:
            term = f"%{search}%"
            q = q.where(or_(TaxCode.code.ilike(term), TaxCode.name.ilike(term)))
        return list(self.db.scalars(q).all())

    def create_component(self, **kwargs):
        obj = TaxCodeComponent(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def list_components(self, tax_code_id):
        q = select(TaxCodeComponent).where(TaxCodeComponent.tax_code_id == tax_code_id, TaxCodeComponent.deleted_at.is_(None)).order_by(TaxCodeComponent.sequence_number)
        return list(self.db.scalars(q).all())

    def delete_components(self, tax_code_id):
        for component in self.list_components(tax_code_id):
            component.deleted_at = component.updated_at
            self.db.flush()
