from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import ReportRunStatus
from app.db.models import CustomReportDefinition, CustomReportExecution

UTC = timezone.utc


class CustomReportRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_definition(
        self,
        *,
        organization_id: str | UUID,
        name: str,
        description: str | None,
        dataset_id: str,
        columns_json: list,
        filters_json: list,
        groupings_json: list,
        sorting_json: list,
        display_options_json: dict | None,
        is_system_template: bool,
        created_by_user_id: str | UUID | None,
    ) -> CustomReportDefinition:
        row = CustomReportDefinition(
            organization_id=organization_id,
            name=name,
            description=description,
            dataset_id=dataset_id,
            columns_json=columns_json,
            filters_json=filters_json,
            groupings_json=groupings_json,
            sorting_json=sorting_json,
            display_options_json=display_options_json,
            is_system_template=is_system_template,
            created_by_user_id=created_by_user_id,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def list_definitions(self, organization_id: str | UUID) -> list[CustomReportDefinition]:
        query = (
            select(CustomReportDefinition)
            .where(
                CustomReportDefinition.organization_id == organization_id,
                CustomReportDefinition.archived_at.is_(None),
                CustomReportDefinition.deleted_at.is_(None),
            )
            .order_by(CustomReportDefinition.updated_at.desc(), CustomReportDefinition.created_at.desc())
        )
        return list(self.db.scalars(query).all())

    def get_definition(self, organization_id: str | UUID, report_id: str | UUID) -> CustomReportDefinition | None:
        return self.db.scalar(
            select(CustomReportDefinition).where(
                CustomReportDefinition.organization_id == organization_id,
                CustomReportDefinition.id == report_id,
                CustomReportDefinition.deleted_at.is_(None),
            )
        )

    def update_definition(self, row: CustomReportDefinition, *, fields: dict) -> CustomReportDefinition:
        for key, value in fields.items():
            setattr(row, key, value)
        row.updated_at = datetime.now(UTC)
        self.db.flush()
        return row

    def archive_definition(self, row: CustomReportDefinition) -> CustomReportDefinition:
        now = datetime.now(UTC)
        row.archived_at = now
        row.deleted_at = now
        row.updated_at = now
        self.db.flush()
        return row

    def create_execution(
        self,
        *,
        organization_id: str | UUID,
        report_definition_id: str | UUID | None,
        dataset_id: str,
        requested_by_user_id: str | UUID | None,
        filters_json: list,
        groupings_json: list,
        sorting_json: list,
        columns_json: list,
        status: ReportRunStatus = ReportRunStatus.PENDING,
    ) -> CustomReportExecution:
        row = CustomReportExecution(
            organization_id=organization_id,
            report_definition_id=report_definition_id,
            dataset_id=dataset_id,
            requested_by_user_id=requested_by_user_id,
            filters_json=filters_json,
            groupings_json=groupings_json,
            sorting_json=sorting_json,
            columns_json=columns_json,
            execution_status=status,
            started_at=datetime.now(UTC),
        )
        self.db.add(row)
        self.db.flush()
        return row

    def complete_execution(self, row: CustomReportExecution, *, totals_json: dict | None, row_count: int, status: ReportRunStatus = ReportRunStatus.COMPLETED):
        now = datetime.now(UTC)
        row.execution_status = status
        row.totals_json = totals_json
        row.row_count = row_count
        row.completed_at = now
        row.updated_at = now
        self.db.flush()
        return row

    def list_executions_for_reports(self, organization_id: str | UUID, report_ids: Iterable[UUID]) -> list[CustomReportExecution]:
        report_ids = tuple(report_ids)
        if not report_ids:
            return []
        query = (
            select(CustomReportExecution)
            .where(
                CustomReportExecution.organization_id == organization_id,
                CustomReportExecution.report_definition_id.in_(report_ids),
            )
            .order_by(CustomReportExecution.created_at.desc())
        )
        return list(self.db.scalars(query).all())

    def latest_execution_for_report(self, organization_id: str | UUID, report_id: str | UUID) -> CustomReportExecution | None:
        return self.db.scalar(
            select(CustomReportExecution)
            .where(
                CustomReportExecution.organization_id == organization_id,
                CustomReportExecution.report_definition_id == report_id,
            )
            .order_by(CustomReportExecution.created_at.desc())
        )
