from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.rbac import require_permission
from app.db.session import get_db
from app.repositories.audit import AuditRepository
from app.schemas.audit import AuditActivityCenterResponse, AuditLogResponse

router = APIRouter()


@router.get("/{organization_id}/audit-logs", response_model=list[AuditLogResponse])
def list_logs(organization_id: str, _=Depends(require_permission("org.read")), db: Session = Depends(get_db)):
    return AuditRepository(db).list_for_org(organization_id)


@router.get("/{organization_id}/activity-center", response_model=AuditActivityCenterResponse)
def activity_center(
    organization_id: str,
    q: str | None = Query(default=None),
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    actor_user_id: UUID | None = Query(default=None),
    actor_email: str | None = Query(default=None),
    created_from: datetime | None = Query(default=None),
    created_to: datetime | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=250),
    _=Depends(require_permission("org.read")),
    db: Session = Depends(get_db),
):
    return AuditRepository(db).search_for_org(
        organization_id,
        q=q,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        created_from=created_from,
        created_to=created_to,
        limit=limit,
    )
