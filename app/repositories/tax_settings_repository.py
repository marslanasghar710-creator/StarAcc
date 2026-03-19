from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import TaxSettings


class TaxSettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, organization_id):
        return self.db.scalar(select(TaxSettings).where(TaxSettings.organization_id == organization_id))

    def create(self, **kwargs):
        obj = TaxSettings(**kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj
