from sqlalchemy.orm import Session

from app.core.exceptions import forbidden
from app.repositories.audit import AuditRepository
from app.repositories.membership import MembershipRepository
from app.repositories.notification_settings_repository import (
    OrganizationNotificationSettingsRepository,
    UserNotificationPreferenceRepository,
)


class NotificationPreferenceService:
    def __init__(self, db: Session):
        self.db = db
        self.org_repo = OrganizationNotificationSettingsRepository(db)
        self.user_repo = UserNotificationPreferenceRepository(db)
        self.memberships = MembershipRepository(db)
        self.audit = AuditRepository(db)

    def get_or_create_org(self, organization_id: str):
        row = self.org_repo.get(organization_id)
        if row:
            return row
        return self.org_repo.create(organization_id=organization_id)

    def update_org(self, organization_id: str, actor_user_id: str, payload: dict):
        row = self.get_or_create_org(organization_id)
        for key, value in payload.items():
            setattr(row, key, value)
        self.audit.create(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="notification_settings.updated",
            entity_type="organization_notification_settings",
            entity_id=str(row.id),
        )
        self.db.commit()
        self.db.refresh(row)
        return row

    def get_or_create_user(self, organization_id: str, user_id: str):
        membership = self.memberships.get_membership(user_id, organization_id)
        if not membership:
            raise forbidden("User is not a member of this organization")
        row = self.user_repo.get(organization_id, user_id)
        if row:
            return row
        return self.user_repo.create(organization_id=organization_id, user_id=user_id)

    def update_user(self, organization_id: str, user_id: str, payload: dict):
        row = self.get_or_create_user(organization_id, user_id)
        for key, value in payload.items():
            setattr(row, key, value)
        self.audit.create(
            organization_id=organization_id,
            actor_user_id=user_id,
            action="notification_settings.updated",
            entity_type="user_notification_preferences",
            entity_id=str(row.id),
        )
        self.db.commit()
        self.db.refresh(row)
        return row

    def in_app_enabled(self, organization_id: str, user_id: str, event_category: str) -> bool:
        pref = self.user_repo.get(organization_id, user_id)
        if pref:
            if not pref.in_app_notifications_enabled:
                return False
            field = f"{event_category}_events_enabled"
            return getattr(pref, field, True)
        return True
