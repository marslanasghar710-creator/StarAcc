from datetime import datetime, timezone

UTC = timezone.utc

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.models import Project, ProjectCostEntry, ProjectRevenueEntry, ProjectStatusHistory, ProjectTimeEntry


class ProjectRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_project(self, **kwargs):
        row = Project(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get_project(self, organization_id, project_id):
        return self.db.scalar(select(Project).where(Project.organization_id == organization_id, Project.id == project_id, Project.deleted_at.is_(None)))

    def get_by_code(self, organization_id, code: str):
        return self.db.scalar(select(Project).where(Project.organization_id == organization_id, Project.code == code, Project.deleted_at.is_(None)))

    def list_projects(self, organization_id, search: str | None = None, status=None, customer_id=None, active_only: bool | None = None):
        query = select(Project).where(Project.organization_id == organization_id, Project.deleted_at.is_(None))
        if search:
            term = f"%{search}%"
            query = query.where(or_(Project.code.ilike(term), Project.name.ilike(term), Project.description.ilike(term)))
        if status:
            query = query.where(Project.status == status)
        if customer_id:
            query = query.where(Project.customer_id == customer_id)
        if active_only is True:
            query = query.where(Project.is_active.is_(True), Project.archived_at.is_(None))
        if active_only is False:
            query = query.where(or_(Project.is_active.is_(False), Project.archived_at.is_not(None)))
        return list(self.db.scalars(query.order_by(Project.name)).all())

    def create_cost_entry(self, **kwargs):
        row = ProjectCostEntry(created_at=datetime.now(UTC), **kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def create_revenue_entry(self, **kwargs):
        row = ProjectRevenueEntry(created_at=datetime.now(UTC), **kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def list_cost_entries(self, organization_id, project_id=None, source_entity_type=None, source_entity_id=None):
        query = select(ProjectCostEntry).where(ProjectCostEntry.organization_id == organization_id)
        if project_id:
            query = query.where(ProjectCostEntry.project_id == project_id)
        if source_entity_type:
            query = query.where(ProjectCostEntry.source_entity_type == source_entity_type)
        if source_entity_id:
            query = query.where(ProjectCostEntry.source_entity_id == str(source_entity_id))
        return list(self.db.scalars(query.order_by(ProjectCostEntry.transaction_date, ProjectCostEntry.created_at)).all())

    def list_revenue_entries(self, organization_id, project_id=None, source_entity_type=None, source_entity_id=None):
        query = select(ProjectRevenueEntry).where(ProjectRevenueEntry.organization_id == organization_id)
        if project_id:
            query = query.where(ProjectRevenueEntry.project_id == project_id)
        if source_entity_type:
            query = query.where(ProjectRevenueEntry.source_entity_type == source_entity_type)
        if source_entity_id:
            query = query.where(ProjectRevenueEntry.source_entity_id == str(source_entity_id))
        return list(self.db.scalars(query.order_by(ProjectRevenueEntry.transaction_date, ProjectRevenueEntry.created_at)).all())

    def create_time_entry(self, **kwargs):
        row = ProjectTimeEntry(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get_time_entry(self, organization_id, project_id, time_entry_id):
        return self.db.scalar(
            select(ProjectTimeEntry).where(
                ProjectTimeEntry.organization_id == organization_id,
                ProjectTimeEntry.project_id == project_id,
                ProjectTimeEntry.id == time_entry_id,
                ProjectTimeEntry.deleted_at.is_(None),
            )
        )

    def list_time_entries(self, organization_id, project_id):
        return list(
            self.db.scalars(
                select(ProjectTimeEntry)
                .where(ProjectTimeEntry.organization_id == organization_id, ProjectTimeEntry.project_id == project_id, ProjectTimeEntry.deleted_at.is_(None))
                .order_by(ProjectTimeEntry.entry_date, ProjectTimeEntry.created_at)
            ).all()
        )

    def create_status_history(self, **kwargs):
        row = ProjectStatusHistory(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def list_status_history(self, organization_id, project_id):
        return list(
            self.db.scalars(
                select(ProjectStatusHistory)
                .where(ProjectStatusHistory.organization_id == organization_id, ProjectStatusHistory.project_id == project_id)
                .order_by(ProjectStatusHistory.changed_at)
            ).all()
        )

    def has_financial_activity(self, organization_id, project_id) -> bool:
        return any(
            [
                (self.db.scalar(select(func.count(ProjectCostEntry.id)).where(ProjectCostEntry.organization_id == organization_id, ProjectCostEntry.project_id == project_id)) or 0) > 0,
                (self.db.scalar(select(func.count(ProjectRevenueEntry.id)).where(ProjectRevenueEntry.organization_id == organization_id, ProjectRevenueEntry.project_id == project_id)) or 0) > 0,
                (self.db.scalar(select(func.count(ProjectTimeEntry.id)).where(ProjectTimeEntry.organization_id == organization_id, ProjectTimeEntry.project_id == project_id, ProjectTimeEntry.deleted_at.is_(None))) or 0) > 0,
            ]
        )
