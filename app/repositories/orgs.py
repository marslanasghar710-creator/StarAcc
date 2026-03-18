from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Organization, OrganizationSettings, OrganizationUser


class OrganizationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, payload: dict) -> Organization:
        org = Organization(**payload)
        self.db.add(org)
        self.db.flush()
        settings = OrganizationSettings(organization_id=org.id)
        self.db.add(settings)
        self.db.flush()
        return org

    def list_for_user(self, user_id):
        query = (
            select(Organization)
            .join(OrganizationUser, Organization.id == OrganizationUser.organization_id)
            .where(OrganizationUser.user_id == user_id, OrganizationUser.deleted_at.is_(None), Organization.deleted_at.is_(None))
        )
        return list(self.db.scalars(query).all())

    def get(self, org_id):
        return self.db.scalar(select(Organization).where(Organization.id == org_id, Organization.deleted_at.is_(None)))

    def get_settings(self, org_id):
        return self.db.scalar(select(OrganizationSettings).where(OrganizationSettings.organization_id == org_id))
