from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import FinancialPeriod


class PeriodRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs):
        p = FinancialPeriod(**kwargs)
        self.db.add(p)
        self.db.flush()
        return p

    def get(self, organization_id, period_id):
        return self.db.scalar(
            select(FinancialPeriod).where(
                FinancialPeriod.organization_id == organization_id,
                FinancialPeriod.id == period_id,
                FinancialPeriod.deleted_at.is_(None),
            )
        )

    def list(self, organization_id):
        return list(
            self.db.scalars(
                select(FinancialPeriod).where(FinancialPeriod.organization_id == organization_id, FinancialPeriod.deleted_at.is_(None))
            ).all()
        )

    def resolve_by_date(self, organization_id, entry_date):
        return self.db.scalar(
            select(FinancialPeriod).where(
                FinancialPeriod.organization_id == organization_id,
                FinancialPeriod.start_date <= entry_date,
                FinancialPeriod.end_date >= entry_date,
                FinancialPeriod.deleted_at.is_(None),
            )
        )
