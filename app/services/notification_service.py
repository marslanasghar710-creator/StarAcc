from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.enums import NotificationType
from app.core.exceptions import not_found
from app.repositories.audit import AuditRepository
from app.repositories.notification_repository import NotificationRepository
from app.services.notification_preference_service import NotificationPreferenceService

UTC = timezone.utc


class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = NotificationRepository(db)
        self.audit = AuditRepository(db)
        self.preferences = NotificationPreferenceService(db)

    def create(self, organization_id: str, actor_user_id: str | None, *, user_id: str, notification_type: NotificationType, title: str, message: str, entity_type: str | None = None, entity_id: str | None = None):
        row = self.repo.create(
            organization_id=organization_id,
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            is_read=False,
            created_at=datetime.now(UTC),
        )
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="notification.created", entity_type="notification", entity_id=str(row.id))
        self.db.flush()
        return row

    def maybe_create_event(self, organization_id: str, actor_user_id: str | None, *, user_id: str, event_category: str, notification_type: NotificationType, title: str, message: str, entity_type: str | None = None, entity_id: str | None = None):
        if not self.preferences.in_app_enabled(organization_id, user_id, event_category):
            return None
        return self.create(
            organization_id,
            actor_user_id,
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
        )

    def list_for_user(self, organization_id: str, user_id: str):
        return self.repo.list_for_user(organization_id, user_id)

    def unread_count(self, organization_id: str, user_id: str):
        return self.repo.unread_count(organization_id, user_id)

    def mark_read(self, organization_id: str, user_id: str, notification_id: str):
        row = self.repo.get(organization_id, notification_id, user_id)
        if not row:
            raise not_found("Notification not found")
        row.is_read = True
        row.read_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=user_id, action="notification.read", entity_type="notification", entity_id=str(row.id))
        self.db.commit()
        self.db.refresh(row)
        return row

    def mark_all_read(self, organization_id: str, user_id: str):
        rows = self.repo.list_for_user(organization_id, user_id, unread_only=True)
        now = datetime.now(UTC)
        for row in rows:
            row.is_read = True
            row.read_at = now
            self.audit.create(organization_id=organization_id, actor_user_id=user_id, action="notification.read", entity_type="notification", entity_id=str(row.id))
        self.db.commit()
        return len(rows)
