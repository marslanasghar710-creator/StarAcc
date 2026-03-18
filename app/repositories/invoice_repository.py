from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Invoice, InvoiceItem


class InvoiceRepository:
    def __init__(self, db: Session):
        self.db = db

    def next_number(self, organization_id, prefix="INV"):
        count = self.db.scalar(select(func.count(Invoice.id)).where(Invoice.organization_id == organization_id)) or 0
        return f"{prefix}-{count + 1:06d}"

    def create(self, **kwargs):
        obj = Invoice(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def get(self, organization_id, invoice_id):
        return self.db.scalar(select(Invoice).where(Invoice.organization_id == organization_id, Invoice.id == invoice_id, Invoice.deleted_at.is_(None)))

    def list(self, organization_id):
        return list(self.db.scalars(select(Invoice).where(Invoice.organization_id == organization_id, Invoice.deleted_at.is_(None))).all())

    def create_item(self, **kwargs):
        obj = InvoiceItem(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def list_items(self, invoice_id):
        return list(self.db.scalars(select(InvoiceItem).where(InvoiceItem.invoice_id == invoice_id, InvoiceItem.deleted_at.is_(None)).order_by(InvoiceItem.line_number)).all())

    def get_item(self, item_id):
        return self.db.scalar(select(InvoiceItem).where(InvoiceItem.id == item_id, InvoiceItem.deleted_at.is_(None)))
