from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import EmailLog


class EmailLogRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs):
        row = EmailLog(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get(self, organization_id, email_log_id):
        return self.db.scalar(select(EmailLog).where(EmailLog.organization_id == organization_id, EmailLog.id == email_log_id))

    def list(self, organization_id, *, entity_type=None, entity_id=None):
        query = select(EmailLog).where(EmailLog.organization_id == organization_id)
        if entity_type:
            query = query.where(EmailLog.entity_type == entity_type)
        if entity_id:
            query = query.where(EmailLog.entity_id == str(entity_id))
        return list(self.db.scalars(query.order_by(EmailLog.created_at.desc())).all())
