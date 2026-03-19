from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import NumberingSettings


class NumberingSettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, organization_id, *, for_update: bool = False):
        query = select(NumberingSettings).where(NumberingSettings.organization_id == organization_id)
        if for_update:
            query = query.with_for_update()
        return self.db.scalar(query)

    def create(self, **kwargs):
        row = NumberingSettings(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row
