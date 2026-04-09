from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.rbac import require_org_membership
from app.db.session import get_db
from app.schemas.dashboard import DashboardOverviewResponse
from app.services.dashboard_service import DashboardService
from app.services.observability_service import QueryObservabilityService, PerformanceMetricsService
from app.schemas.observability import PerformanceMetric, QueryPerformanceRecord

router = APIRouter(prefix="/organizations/{organization_id}", tags=["dashboard"])


@router.get("/dashboard/overview", response_model=DashboardOverviewResponse)
def dashboard_overview(organization_id: str, _=Depends(require_org_membership), db: Session = Depends(get_db)):
    started = datetime.now(timezone.utc)
    payload = DashboardService(db).overview(organization_id)
    duration_ms = (datetime.now(timezone.utc) - started).total_seconds() * 1000
    QueryObservabilityService(db).record(QueryPerformanceRecord(recorded_at=datetime.now(timezone.utc).isoformat(), query_name="dashboard.overview", domain="dashboard", duration_ms=duration_ms, status="success", org_id=organization_id))
    PerformanceMetricsService(db).record(PerformanceMetric(metric_id=f"dashboard:{organization_id}:{int(datetime.now(timezone.utc).timestamp())}", recorded_at=datetime.now(timezone.utc).isoformat(), domain="dashboard", operation="dashboard_overview", duration_ms=duration_ms, status="success", org_id=organization_id, metadata={"route": "/dashboard/overview"}))
    return payload
