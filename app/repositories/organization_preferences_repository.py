from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import OrganizationPreferences


class OrganizationPreferencesRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, organization_id):
        return self.db.scalar(select(OrganizationPreferences).where(OrganizationPreferences.organization_id == organization_id))

    def create(self, **kwargs):
        row = OrganizationPreferences(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row
