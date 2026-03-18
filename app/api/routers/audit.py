from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.rbac import require_permission
from app.db.session import get_db
from app.repositories.audit import AuditRepository
from app.schemas.audit import AuditLogResponse

router = APIRouter()


@router.get("/{organization_id}/audit-logs", response_model=list[AuditLogResponse])
def list_logs(organization_id: str, _=Depends(require_permission("org.read")), db: Session = Depends(get_db)):
    return AuditRepository(db).list_for_org(organization_id)
