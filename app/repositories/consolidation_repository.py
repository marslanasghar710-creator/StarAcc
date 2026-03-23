from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import ConsolidationGroup, ConsolidationRun, EliminationEntry, GroupEntity, Organization


class ConsolidationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_group(self, **kwargs) -> ConsolidationGroup:
        group = ConsolidationGroup(**kwargs)
        self.db.add(group)
        self.db.flush()
        return group

    def list_groups(self, organization_id: str | UUID, *, limit: int = 50, offset: int = 0) -> list[ConsolidationGroup]:
        return list(
            self.db.scalars(
                select(ConsolidationGroup)
                .where(ConsolidationGroup.organization_id == organization_id, ConsolidationGroup.deleted_at.is_(None))
                .order_by(ConsolidationGroup.updated_at.desc(), ConsolidationGroup.created_at.desc())
                .limit(limit)
                .offset(offset)
            ).all()
        )

    def count_groups(self, organization_id: str | UUID) -> int:
        return int(self.db.scalar(select(func.count()).select_from(ConsolidationGroup).where(ConsolidationGroup.organization_id == organization_id, ConsolidationGroup.deleted_at.is_(None))) or 0)

    def get_group(self, organization_id: str | UUID, group_id: str | UUID) -> ConsolidationGroup | None:
        return self.db.scalar(
            select(ConsolidationGroup).where(
                ConsolidationGroup.organization_id == organization_id,
                ConsolidationGroup.id == group_id,
                ConsolidationGroup.deleted_at.is_(None),
            )
        )

    def get_group_any_org(self, group_id: str | UUID) -> ConsolidationGroup | None:
        return self.db.scalar(select(ConsolidationGroup).where(ConsolidationGroup.id == group_id, ConsolidationGroup.deleted_at.is_(None)))

    def get_organization(self, organization_id: str | UUID) -> Organization | None:
        return self.db.scalar(select(Organization).where(Organization.id == organization_id, Organization.deleted_at.is_(None)))

    def create_group_entity(self, **kwargs) -> GroupEntity:
        entity = GroupEntity(**kwargs)
        self.db.add(entity)
        self.db.flush()
        return entity

    def list_group_entities(self, group_id: str | UUID) -> list[GroupEntity]:
        return list(
            self.db.scalars(
                select(GroupEntity)
                .where(GroupEntity.group_id == group_id, GroupEntity.deleted_at.is_(None))
                .order_by(GroupEntity.created_at.asc())
            ).all()
        )

    def get_group_entity(self, group_id: str | UUID, organization_id: str | UUID) -> GroupEntity | None:
        return self.db.scalar(
            select(GroupEntity).where(
                GroupEntity.group_id == group_id,
                GroupEntity.organization_id == organization_id,
                GroupEntity.deleted_at.is_(None),
            )
        )

    def get_group_entity_by_id(self, group_id: str | UUID, entity_id: str | UUID) -> GroupEntity | None:
        return self.db.scalar(
            select(GroupEntity).where(
                GroupEntity.group_id == group_id,
                GroupEntity.id == entity_id,
                GroupEntity.deleted_at.is_(None),
            )
        )

    def find_run_by_fingerprint(self, group_id: str | UUID, fingerprint: str) -> ConsolidationRun | None:
        return self.db.scalar(
            select(ConsolidationRun)
            .where(ConsolidationRun.group_id == group_id, ConsolidationRun.request_fingerprint == fingerprint)
            .order_by(ConsolidationRun.created_at.desc())
        )

    def create_run(self, **kwargs) -> ConsolidationRun:
        run = ConsolidationRun(**kwargs)
        self.db.add(run)
        self.db.flush()
        return run

    def list_runs(self, group_id: str | UUID, *, limit: int = 50, offset: int = 0) -> list[ConsolidationRun]:
        return list(
            self.db.scalars(
                select(ConsolidationRun).where(ConsolidationRun.group_id == group_id).order_by(ConsolidationRun.created_at.desc()).limit(limit).offset(offset)
            ).all()
        )

    def count_runs(self, group_id: str | UUID) -> int:
        return int(self.db.scalar(select(func.count()).select_from(ConsolidationRun).where(ConsolidationRun.group_id == group_id)) or 0)

    def get_run(self, group_id: str | UUID, run_id: str | UUID) -> ConsolidationRun | None:
        return self.db.scalar(select(ConsolidationRun).where(ConsolidationRun.group_id == group_id, ConsolidationRun.id == run_id))

    def create_elimination_entry(self, **kwargs) -> EliminationEntry:
        entry = EliminationEntry(**kwargs)
        self.db.add(entry)
        self.db.flush()
        return entry

    def list_elimination_entries(self, group_id: str | UUID, *, period_start: date | None = None, period_end: date | None = None, limit: int = 50, offset: int = 0) -> list[EliminationEntry]:
        query = select(EliminationEntry).where(EliminationEntry.group_id == group_id, EliminationEntry.deleted_at.is_(None)).order_by(EliminationEntry.created_at.desc())
        if period_start is not None:
            query = query.where(EliminationEntry.period_start == period_start)
        if period_end is not None:
            query = query.where(EliminationEntry.period_end == period_end)
        query = query.limit(limit).offset(offset)
        return list(self.db.scalars(query).all())

    def count_elimination_entries(self, group_id: str | UUID, *, period_start: date | None = None, period_end: date | None = None) -> int:
        query = select(func.count()).select_from(EliminationEntry).where(EliminationEntry.group_id == group_id, EliminationEntry.deleted_at.is_(None))
        if period_start is not None:
            query = query.where(EliminationEntry.period_start == period_start)
        if period_end is not None:
            query = query.where(EliminationEntry.period_end == period_end)
        return int(self.db.scalar(query) or 0)

    def get_elimination_entry(self, group_id: str | UUID, elimination_id: str | UUID) -> EliminationEntry | None:
        return self.db.scalar(
            select(EliminationEntry).where(
                EliminationEntry.group_id == group_id,
                EliminationEntry.id == elimination_id,
                EliminationEntry.deleted_at.is_(None),
            )
        )
