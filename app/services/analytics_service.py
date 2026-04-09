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
        try:
            org_uuid = UUID(payload.org_id) if payload.org_id else None
        except ValueError:
            org_uuid = None
        try:
            user_uuid = UUID(payload.user_id) if payload.user_id else None
        except ValueError:
            user_uuid = None

        log = AuditLog(
            organization_id=org_uuid,
            actor_user_id=user_uuid,
            action=payload.event_name,
            entity_type="analytics_event",
            entity_id=payload.session_id,
            metadata_json={
                "event_version": payload.event_version,
                "occurred_at": payload.occurred_at.isoformat(),
                "session_id": payload.session_id,
                "anonymous_id": payload.anonymous_id,
                "workspace_id": payload.workspace_id,
                "route": payload.route,
                "path": payload.path,
                "page_type": payload.page_type,
                "surface": payload.surface,
                "funnel_domain": payload.funnel_domain,
                "funnel_stage": payload.funnel_stage,
                "is_demo": payload.is_demo,
                "is_authenticated": payload.is_authenticated,
                "environment": payload.environment,
                "referrer": payload.referrer,
                "utm_source": payload.utm_source,
                "utm_campaign": payload.utm_campaign,
                "utm_medium": payload.utm_medium,
                "utm_term": payload.utm_term,
                "utm_content": payload.utm_content,
                "landing_variant": payload.landing_variant,
                "experiment_assignments": payload.experiment_assignments or {},
                "device_type": payload.device_type,
                "viewport_bucket": payload.viewport_bucket,
                "locale": payload.locale,
                "timezone": payload.timezone,
                "country": payload.country,
                "payload": payload.payload or {},
            },
            created_at=datetime.now(UTC),
        )
        self.db.add(log)
        self.db.commit()
        return {"accepted": True}
