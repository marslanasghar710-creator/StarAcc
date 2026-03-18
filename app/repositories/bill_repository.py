from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Bill, BillItem


class BillRepository:
    def __init__(self, db: Session):
        self.db = db

    def next_number(self, organization_id, prefix="BIL"):
        count = self.db.scalar(select(func.count(Bill.id)).where(Bill.organization_id == organization_id)) or 0
        return f"{prefix}-{count + 1:06d}"

    def create(self, **kwargs):
        obj = Bill(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def get(self, organization_id, bill_id):
        return self.db.scalar(select(Bill).where(Bill.organization_id == organization_id, Bill.id == bill_id, Bill.deleted_at.is_(None)))

    def list(self, organization_id):
        return list(self.db.scalars(select(Bill).where(Bill.organization_id == organization_id, Bill.deleted_at.is_(None))).all())

    def create_item(self, **kwargs):
        obj = BillItem(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def list_items(self, bill_id):
        return list(self.db.scalars(select(BillItem).where(BillItem.bill_id == bill_id, BillItem.deleted_at.is_(None)).order_by(BillItem.line_number)).all())

    def get_item(self, item_id):
        return self.db.scalar(select(BillItem).where(BillItem.id == item_id, BillItem.deleted_at.is_(None)))
