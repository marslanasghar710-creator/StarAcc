from datetime import datetime, timezone

UTC = timezone.utc

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import AuditLog


class AuditRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs):
        row = AuditLog(created_at=datetime.now(UTC), **kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def list_for_org(self, organization_id):
        return list(self.db.scalars(select(AuditLog).where(AuditLog.organization_id == organization_id)).all())
