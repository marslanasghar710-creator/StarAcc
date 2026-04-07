from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models.audit import AuditLog
from app.schemas.analytics import FunnelEventRequest

UTC = timezone.utc


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def track_funnel_event(self, payload: FunnelEventRequest):
        action = f"funnel.{payload.event_name}"[:100]
        try:
            org_uuid = UUID(payload.organization_id) if payload.organization_id else None
        except ValueError:
            org_uuid = None
        try:
            user_uuid = UUID(payload.user_id) if payload.user_id else None
        except ValueError:
            user_uuid = None
        log = AuditLog(
            organization_id=org_uuid,
            actor_user_id=user_uuid,
            action=action,
            entity_type="funnel_event",
            entity_id=payload.session_id or payload.anonymous_id,
            metadata_json={
                "timestamp": payload.timestamp.isoformat(),
                "route": payload.route,
                "referrer": payload.referrer,
                "source": payload.source,
                "campaign": payload.campaign,
                "medium": payload.medium,
                "term": payload.term,
                "content": payload.content,
                "experience": payload.experience,
                "experiment_bucket": payload.experiment_bucket,
                "anonymous_id": payload.anonymous_id,
                "metadata": payload.metadata or {},
            },
            created_at=datetime.now(UTC),
        )
        self.db.add(log)
        self.db.commit()
        return {"accepted": True}
