from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import InAppNotification


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs):
        row = InAppNotification(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get(self, organization_id, notification_id, user_id):
        return self.db.scalar(
            select(InAppNotification).where(
                InAppNotification.organization_id == organization_id,
                InAppNotification.id == notification_id,
                InAppNotification.user_id == user_id,
            )
        )

    def list_for_user(self, organization_id, user_id, *, unread_only: bool = False):
        query = select(InAppNotification).where(
            InAppNotification.organization_id == organization_id,
            InAppNotification.user_id == user_id,
        )
        if unread_only:
            query = query.where(InAppNotification.is_read.is_(False))
        return list(self.db.scalars(query.order_by(InAppNotification.created_at.desc())).all())

    def unread_count(self, organization_id, user_id):
        return self.db.scalar(
            select(func.count(InAppNotification.id)).where(
                InAppNotification.organization_id == organization_id,
                InAppNotification.user_id == user_id,
                InAppNotification.is_read.is_(False),
            )
        ) or 0
