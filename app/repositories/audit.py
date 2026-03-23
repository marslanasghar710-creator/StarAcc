from datetime import datetime, timezone
from uuid import UUID

UTC = timezone.utc

from sqlalchemy import String, cast, desc, func, or_, select
from sqlalchemy.orm import Session

from app.db.models import AuditLog, User


class AuditRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs):
        row = AuditLog(created_at=datetime.now(UTC), **kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def list_for_org(self, organization_id):
        return list(
            self.db.scalars(
                select(AuditLog)
                .where(AuditLog.organization_id == organization_id)
                .order_by(AuditLog.created_at.desc())
            ).all()
        )

    def _base_filtered_query(
        self,
        organization_id: str | UUID,
        *,
        q: str | None = None,
        action: str | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
        actor_user_id: str | UUID | None = None,
        actor_email: str | None = None,
        created_from: datetime | None = None,
        created_to: datetime | None = None,
    ):
        statement = (
            select(
                AuditLog.id,
                AuditLog.organization_id,
                AuditLog.actor_user_id,
                AuditLog.action,
                AuditLog.entity_type,
                AuditLog.entity_id,
                AuditLog.metadata_json,
                AuditLog.ip_address,
                AuditLog.created_at,
                User.email.label("actor_email"),
            )
            .select_from(AuditLog)
            .outerjoin(User, User.id == AuditLog.actor_user_id)
            .where(AuditLog.organization_id == organization_id)
        )

        if q:
            term = f"%{q.strip()}%"
            statement = statement.where(
                or_(
                    AuditLog.action.ilike(term),
                    AuditLog.entity_type.ilike(term),
                    AuditLog.entity_id.ilike(term),
                    AuditLog.ip_address.ilike(term),
                    User.email.ilike(term),
                    cast(AuditLog.metadata_json, String).ilike(term),
                )
            )

        if action:
            statement = statement.where(AuditLog.action == action)
        if entity_type:
            statement = statement.where(AuditLog.entity_type == entity_type)
        if entity_id:
            statement = statement.where(AuditLog.entity_id == entity_id)
        if actor_user_id:
            statement = statement.where(AuditLog.actor_user_id == actor_user_id)
        if actor_email:
            statement = statement.where(User.email.ilike(f"%{actor_email.strip()}%"))
        if created_from:
            statement = statement.where(AuditLog.created_at >= created_from)
        if created_to:
            statement = statement.where(AuditLog.created_at <= created_to)

        return statement

    def search_for_org(
        self,
        organization_id: str | UUID,
        *,
        q: str | None = None,
        action: str | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
        actor_user_id: str | UUID | None = None,
        actor_email: str | None = None,
        created_from: datetime | None = None,
        created_to: datetime | None = None,
        limit: int = 100,
    ) -> dict:
        base_statement = self._base_filtered_query(
            organization_id,
            q=q,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_user_id=actor_user_id,
            actor_email=actor_email,
            created_from=created_from,
            created_to=created_to,
        )
        filtered = base_statement.subquery()

        total_count = self.db.scalar(select(func.count()).select_from(filtered)) or 0
        actor_count = self.db.scalar(select(func.count(func.distinct(filtered.c.actor_user_id))).select_from(filtered)) or 0
        action_count = self.db.scalar(select(func.count(func.distinct(filtered.c.action))).select_from(filtered)) or 0
        entity_type_count = self.db.scalar(select(func.count(func.distinct(filtered.c.entity_type))).select_from(filtered)) or 0

        top_actions = [
            {"value": row[0], "count": row[1]}
            for row in self.db.execute(
                select(filtered.c.action, func.count().label("count"))
                .select_from(filtered)
                .group_by(filtered.c.action)
                .order_by(desc("count"), filtered.c.action.asc())
                .limit(5)
            ).all()
        ]
        top_entity_types = [
            {"value": row[0], "count": row[1]}
            for row in self.db.execute(
                select(filtered.c.entity_type, func.count().label("count"))
                .select_from(filtered)
                .group_by(filtered.c.entity_type)
                .order_by(desc("count"), filtered.c.entity_type.asc())
                .limit(5)
            ).all()
        ]

        rows = self.db.execute(
            base_statement.order_by(AuditLog.created_at.desc()).limit(limit + 1)
        ).mappings().all()
        has_more = len(rows) > limit
        items = [dict(row) for row in rows[:limit]]

        return {
            "items": items,
            "total_count": total_count,
            "actor_count": actor_count,
            "action_count": action_count,
            "entity_type_count": entity_type_count,
            "top_actions": top_actions,
            "top_entity_types": top_entity_types,
            "has_more": has_more,
            "applied_limit": limit,
        }
