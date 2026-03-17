from datetime import datetime, UTC

from sqlalchemy.orm import Session

from app.core.enums import PeriodStatus
from app.core.exceptions import forbidden, not_found
from app.repositories.audit import AuditRepository
from app.repositories.period_repository import PeriodRepository


class PeriodService:
    def __init__(self, db: Session):
        self.db = db
        self.periods = PeriodRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id, user_id, payload: dict):
        period = self.periods.create(organization_id=organization_id, **payload)
        self.audit.create(
            organization_id=organization_id,
            actor_user_id=user_id,
            action="period.created",
            entity_type="financial_period",
            entity_id=str(period.id),
        )
        self.db.commit()
        return period

    def update(self, organization_id, period_id, payload: dict):
        period = self.periods.get(organization_id, period_id)
        if not period:
            raise not_found("Period not found")
        if period.status == PeriodStatus.LOCKED:
            raise forbidden("Locked period cannot be updated")
        for k, v in payload.items():
            setattr(period, k, v)
        self.db.commit()
        self.db.refresh(period)
        return period

    def close(self, organization_id, period_id, user_id):
        period = self.periods.get(organization_id, period_id)
        if not period:
            raise not_found("Period not found")
        if period.status == PeriodStatus.LOCKED:
            raise forbidden("Locked period cannot be closed")
        period.status = PeriodStatus.CLOSED
        period.closed_at = datetime.now(UTC)
        period.closed_by_user_id = user_id
        self.audit.create(organization_id=organization_id, actor_user_id=user_id, action="period.closed", entity_type="financial_period", entity_id=str(period.id))
        self.db.commit()
        return period

    def lock(self, organization_id, period_id, user_id):
        period = self.periods.get(organization_id, period_id)
        if not period:
            raise not_found("Period not found")
        period.status = PeriodStatus.LOCKED
        self.audit.create(organization_id=organization_id, actor_user_id=user_id, action="period.locked", entity_type="financial_period", entity_id=str(period.id))
        self.db.commit()
        return period

    def reopen(self, organization_id, period_id, user_id):
        period = self.periods.get(organization_id, period_id)
        if not period:
            raise not_found("Period not found")
        period.status = PeriodStatus.OPEN
        self.audit.create(organization_id=organization_id, actor_user_id=user_id, action="period.reopened", entity_type="financial_period", entity_id=str(period.id))
        self.db.commit()
        return period
