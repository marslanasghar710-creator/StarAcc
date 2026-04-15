from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_permission
from app.db.session import get_db
from app.db.models.organization import Organization
from app.schemas.observability import (
    AdminOverviewResponse,
    ErrorRecord,
    JobExecutionRecord,
    OrgHealthSnapshot,
    PerformanceMetric,
    PlatformHealthSummary,
    QueryPerformanceRecord,
    TelemetryIngestRequest,
    TelemetryIngestResponse,
)
from app.services.observability_service import (
    AdminObservabilityReadService,
    AttentionQueueService,
    JobObservabilityService,
    OrgHealthService,
    PlatformHealthService,
    TelemetryService,
)

UTC = timezone.utc
router = APIRouter(tags=["admin-observability"])


def _org(organization_id: str | None, q_org: str | None) -> str | None:
    return organization_id or q_org


@router.post("/organizations/{organization_id}/observability/telemetry", response_model=TelemetryIngestResponse)
def ingest_telemetry(organization_id: str, payload: TelemetryIngestRequest, request: Request, current_user=Depends(get_current_user), _=Depends(require_permission("observability.telemetry.write")), db: Session = Depends(get_db)):
    event = payload.event.model_copy(
        update={
            "org_id": organization_id,
            "user_id": str(current_user.id),
            "request_id": payload.event.request_id or getattr(request.state, "request_id", None),
            "occurred_at": payload.event.occurred_at or datetime.now(UTC).isoformat(),
        }
    )
    TelemetryService(db).record(event)
    return TelemetryIngestResponse(accepted=True, event_id=event.event_id)


@router.get("/organizations/{organization_id}/admin/platform-health", response_model=PlatformHealthSummary)
@router.get("/api/admin/platform-health", response_model=PlatformHealthSummary)
def platform_health(organization_id: str | None = None, org_id: str | None = Query(default=None), _=Depends(require_permission("observability.admin.read")), db: Session = Depends(get_db)):
    return PlatformHealthService(db).get_summary(_org(organization_id, org_id))


@router.get("/organizations/{organization_id}/admin/org-health", response_model=list[OrgHealthSnapshot])
@router.get("/api/admin/org-health", response_model=list[OrgHealthSnapshot])
def org_health_list(organization_id: str | None = None, org_id: str | None = Query(default=None), _=Depends(require_permission("observability.admin.read")), db: Session = Depends(get_db)):
    oid = _org(organization_id, org_id)
    if oid:
        return [OrgHealthService(db).get_org_health(oid)]
    return [OrgHealthService(db).get_org_health(str(row)) for row in db.scalars(select(Organization.id)).all()]


@router.get("/organizations/{organization_id}/admin/orgs/{target_org_id}/health", response_model=OrgHealthSnapshot)
@router.get("/api/admin/orgs/{target_org_id}/health", response_model=OrgHealthSnapshot)
def org_health_detail(target_org_id: str, organization_id: str | None = None, org_id: str | None = Query(default=None), _=Depends(require_permission("observability.admin.read")), db: Session = Depends(get_db)):
    del organization_id, org_id
    return OrgHealthService(db).get_org_health(target_org_id)


@router.get("/organizations/{organization_id}/admin/errors", response_model=list[ErrorRecord])
@router.get("/api/admin/errors", response_model=list[ErrorRecord])
def admin_errors(organization_id: str | None = None, org_id: str | None = Query(default=None), limit: int = 50, _=Depends(require_permission("observability.admin.read")), db: Session = Depends(get_db)):
    oid = _org(organization_id, org_id)
    if not oid:
        return []
    return AdminObservabilityReadService(db).list_errors(oid, limit=min(limit, 200))


@router.get("/organizations/{organization_id}/admin/jobs", response_model=list[JobExecutionRecord])
@router.get("/api/admin/jobs", response_model=list[JobExecutionRecord])
def admin_jobs(organization_id: str | None = None, org_id: str | None = Query(default=None), limit: int = 50, _=Depends(require_permission("observability.admin.read")), db: Session = Depends(get_db)):
    oid = _org(organization_id, org_id)
    if not oid:
        return []
    return JobObservabilityService(db).list_recent_jobs(oid, limit=min(limit, 200))


@router.get("/organizations/{organization_id}/admin/performance", response_model=list[PerformanceMetric])
@router.get("/api/admin/performance", response_model=list[PerformanceMetric])
def admin_performance(organization_id: str | None = None, org_id: str | None = Query(default=None), limit: int = 50, _=Depends(require_permission("observability.admin.read")), db: Session = Depends(get_db)):
    oid = _org(organization_id, org_id)
    if not oid:
        return []
    return AdminObservabilityReadService(db).list_performance(oid, limit=min(limit, 200))


@router.get("/organizations/{organization_id}/admin/attention-queue")
@router.get("/api/admin/attention-queue")
def attention_queue(organization_id: str | None = None, org_id: str | None = Query(default=None), _=Depends(require_permission("observability.admin.read")), db: Session = Depends(get_db)):
    oid = _org(organization_id, org_id)
    if not oid:
        return []
    return AttentionQueueService(db).list_queue(oid)


@router.get("/organizations/{organization_id}/admin/query-performance", response_model=list[QueryPerformanceRecord])
@router.get("/api/admin/query-performance", response_model=list[QueryPerformanceRecord])
def query_performance(organization_id: str | None = None, org_id: str | None = Query(default=None), limit: int = 50, _=Depends(require_permission("observability.admin.read")), db: Session = Depends(get_db)):
    oid = _org(organization_id, org_id)
    if not oid:
        return []
    return AdminObservabilityReadService(db).list_query_performance(oid, limit=min(limit, 200))


@router.get("/organizations/{organization_id}/admin/overview", response_model=AdminOverviewResponse)
@router.get("/api/admin/overview", response_model=AdminOverviewResponse)
def admin_overview(organization_id: str | None = None, org_id: str | None = Query(default=None), _=Depends(require_permission("observability.admin.read")), db: Session = Depends(get_db)):
    oid = _org(organization_id, org_id)
    read = AdminObservabilityReadService(db)
    return AdminOverviewResponse(
        platform_health=PlatformHealthService(db).get_summary(oid),
        recent_errors=read.list_errors(oid, limit=20) if oid else [],
        attention_queue=AttentionQueueService(db).list_queue(oid) if oid else [],
        top_slow_operations=read.list_performance(oid, limit=20) if oid else [],
        alert_candidates=read.list_alert_candidates(oid) if oid else [],
    )
