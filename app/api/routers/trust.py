from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_org_membership
from app.db.session import get_db
from app.schemas.trust import (
    AuditTraceLink,
    IntegrityCenterResponse,
    MetricProvenance,
    ReconciliationTrustStatus,
    ReportTrustMetadata,
    TrustSummary,
)
from app.services.trust_service import (
    AuditTraceService,
    MetricProvenanceService,
    ReconciliationTrustService,
    ReportTrustMetadataService,
    TrustEvaluationService,
)

router = APIRouter(prefix="/api/trust", tags=["trust"])


@router.get("/summary", response_model=TrustSummary)
def trust_summary(organization_id: str = Query(...), _=Depends(require_org_membership), current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    del current_user
    return TrustEvaluationService(db).get_org_trust_summary(organization_id)


@router.get("/metric-provenance", response_model=MetricProvenance)
def metric_provenance(organization_id: str = Query(...), metric_id: str = Query(...), _=Depends(require_org_membership), current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    del current_user
    return MetricProvenanceService(db).get_metric_provenance(organization_id, metric_id)


@router.get("/audit-trace", response_model=AuditTraceLink)
def audit_trace(organization_id: str = Query(...), source_type: str = Query(...), source_id: str = Query(...), _=Depends(require_org_membership), current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    del current_user
    return AuditTraceService(db).get_trace(organization_id, source_type, source_id)


@router.get("/report-metadata", response_model=ReportTrustMetadata)
def report_metadata(organization_id: str = Query(...), report_id: str = Query(...), _=Depends(require_org_membership), current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    del current_user
    return ReportTrustMetadataService(db).get_report_metadata(organization_id, report_id)


@router.get("/reconciliation-status", response_model=list[ReconciliationTrustStatus])
def reconciliation_status(organization_id: str = Query(...), _=Depends(require_org_membership), current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    del current_user
    return ReconciliationTrustService(db).evaluate(organization_id)


@router.get("/integrity-center", response_model=IntegrityCenterResponse)
def integrity_center(organization_id: str = Query(...), _=Depends(require_org_membership), current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    del current_user
    return TrustEvaluationService(db).integrity_center(organization_id)
