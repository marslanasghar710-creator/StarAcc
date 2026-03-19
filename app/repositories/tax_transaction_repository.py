from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import TaxCode, TaxTransaction

UTC = timezone.utc


class TaxTransactionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs):
        obj = TaxTransaction(created_at=datetime.now(UTC), **kwargs)
        self.db.add(obj)
        self.db.flush()
        return obj

    def list(self, organization_id, *, from_date: date | None = None, to_date: date | None = None, direction=None, tax_code_id=None, report_group=None):
        q = select(TaxTransaction).where(TaxTransaction.organization_id == organization_id).order_by(TaxTransaction.transaction_date, TaxTransaction.created_at)
        if from_date:
            q = q.where(TaxTransaction.transaction_date >= from_date)
        if to_date:
            q = q.where(TaxTransaction.transaction_date <= to_date)
        if direction:
            q = q.where(TaxTransaction.direction == direction)
        if tax_code_id:
            q = q.where(TaxTransaction.tax_code_id == tax_code_id)
        if report_group:
            q = q.where(TaxTransaction.report_group == report_group)
        return list(self.db.scalars(q).all())

    def summary(self, organization_id, *, from_date: date, to_date: date, direction=None, tax_code_id=None, report_group=None):
        q = (
            select(
                TaxTransaction.tax_code_id,
                TaxCode.code.label("tax_code"),
                TaxCode.name.label("tax_code_name"),
                TaxTransaction.tax_rate_name_snapshot,
                TaxTransaction.tax_rate_percentage_snapshot,
                TaxTransaction.report_group,
                TaxTransaction.direction,
                func.coalesce(func.sum(TaxTransaction.net_amount), 0).label("net_amount"),
                func.coalesce(func.sum(TaxTransaction.tax_amount), 0).label("tax_amount"),
                func.coalesce(func.sum(TaxTransaction.gross_amount), 0).label("gross_amount"),
            )
            .select_from(TaxTransaction)
            .join(TaxCode, TaxCode.id == TaxTransaction.tax_code_id, isouter=True)
            .where(TaxTransaction.organization_id == organization_id, TaxTransaction.transaction_date >= from_date, TaxTransaction.transaction_date <= to_date)
            .group_by(TaxTransaction.tax_code_id, TaxCode.code, TaxCode.name, TaxTransaction.tax_rate_name_snapshot, TaxTransaction.tax_rate_percentage_snapshot, TaxTransaction.report_group, TaxTransaction.direction)
            .order_by(TaxCode.code, TaxTransaction.tax_rate_name_snapshot, TaxTransaction.direction)
        )
        if direction:
            q = q.where(TaxTransaction.direction == direction)
        if tax_code_id:
            q = q.where(TaxTransaction.tax_code_id == tax_code_id)
        if report_group:
            q = q.where(TaxTransaction.report_group == report_group)
        return self.db.execute(q).all()
