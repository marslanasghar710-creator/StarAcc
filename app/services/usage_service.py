from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.ap import Bill
from app.db.models.ar import Invoice
from app.db.models.banking import BankAccount
from app.db.models.integrations import IntegrationConnection
from app.db.models.membership import OrganizationUser
from app.db.models.reporting import ConsolidationGroup, GroupEntity


@dataclass
class UsageSnapshot:
    org_id: str
    invoices_this_period: int
    bills_this_period: int
    users_count: int
    entities_count: int
    bank_accounts_count: int
    integrations_count: int
    period_start: str
    period_end: str


class UsageService:
    def __init__(self, db: Session):
        self.db = db

    def current_period(self) -> tuple[date, date]:
        today = date.today()
        start = date(today.year, today.month, 1)
        if today.month == 12:
            end = date(today.year + 1, 1, 1)
        else:
            end = date(today.year, today.month + 1, 1)
        return start, end

    def get_snapshot(self, org_id: str) -> UsageSnapshot:
        org_uuid = UUID(org_id)
        period_start, period_end = self.current_period()

        invoices_this_period = self.db.scalar(
            select(func.count()).select_from(Invoice).where(
                Invoice.organization_id == org_uuid,
                Invoice.deleted_at.is_(None),
                Invoice.issue_date >= period_start,
                Invoice.issue_date < period_end,
            )
        ) or 0
        bills_this_period = self.db.scalar(
            select(func.count()).select_from(Bill).where(
                Bill.organization_id == org_uuid,
                Bill.deleted_at.is_(None),
                Bill.issue_date >= period_start,
                Bill.issue_date < period_end,
            )
        ) or 0
        users_count = self.db.scalar(
            select(func.count()).select_from(OrganizationUser).where(
                OrganizationUser.organization_id == org_uuid,
                OrganizationUser.deleted_at.is_(None),
            )
        ) or 0
        grouped_entity_ids = {
            str(entity_id)
            for entity_id in self.db.scalars(
                select(GroupEntity.organization_id)
                .join(ConsolidationGroup, ConsolidationGroup.id == GroupEntity.group_id)
                .where(
                    ConsolidationGroup.organization_id == org_uuid,
                    ConsolidationGroup.deleted_at.is_(None),
                    GroupEntity.deleted_at.is_(None),
                )
            ).all()
        }
        grouped_entity_ids.add(str(org_uuid))
        entities_count = len(grouped_entity_ids)
        bank_accounts_count = self.db.scalar(
            select(func.count()).select_from(BankAccount).where(
                BankAccount.organization_id == org_uuid,
                BankAccount.deleted_at.is_(None),
                BankAccount.is_active.is_(True),
            )
        ) or 0
        integrations_count = self.db.scalar(
            select(func.count()).select_from(IntegrationConnection).where(
                IntegrationConnection.organization_id == org_uuid,
                IntegrationConnection.deleted_at.is_(None),
            )
        ) or 0

        return UsageSnapshot(
            org_id=org_id,
            invoices_this_period=int(invoices_this_period),
            bills_this_period=int(bills_this_period),
            users_count=int(users_count),
            entities_count=int(entities_count),
            bank_accounts_count=int(bank_accounts_count),
            integrations_count=int(integrations_count),
            period_start=period_start.isoformat(),
            period_end=period_end.isoformat(),
        )
