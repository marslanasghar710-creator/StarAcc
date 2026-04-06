from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.rbac import require_org_membership
from app.db.session import get_db
from app.schemas.dashboard import DashboardOverviewResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/organizations/{organization_id}", tags=["dashboard"])


@router.get("/dashboard/overview", response_model=DashboardOverviewResponse)
def dashboard_overview(organization_id: str, _=Depends(require_org_membership), db: Session = Depends(get_db)):
    return DashboardService(db).overview(organization_id)
