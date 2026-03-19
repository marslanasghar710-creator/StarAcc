from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import OrganizationNotificationSettings, UserNotificationPreference


class OrganizationNotificationSettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, organization_id):
        return self.db.scalar(select(OrganizationNotificationSettings).where(OrganizationNotificationSettings.organization_id == organization_id))

    def create(self, **kwargs):
        row = OrganizationNotificationSettings(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row


class UserNotificationPreferenceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, organization_id, user_id):
        return self.db.scalar(
            select(UserNotificationPreference).where(
                UserNotificationPreference.organization_id == organization_id,
                UserNotificationPreference.user_id == user_id,
            )
        )

    def create(self, **kwargs):
        row = UserNotificationPreference(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row
