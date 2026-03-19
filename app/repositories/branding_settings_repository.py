from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import BrandingSettings


class BrandingSettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, organization_id):
        return self.db.scalar(select(BrandingSettings).where(BrandingSettings.organization_id == organization_id))

    def create(self, **kwargs):
        row = BrandingSettings(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row
