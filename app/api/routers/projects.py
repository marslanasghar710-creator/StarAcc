from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.enums import ProjectStatus
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_permission
from app.db.session import get_db
from app.schemas.projects import (
    ProjectActivityResponse,
    ProjectBudgetRequest,
    ProjectBudgetResponse,
    ProjectCostEntryListResponse,
    ProjectListResponse,
    ProjectProfitabilityListResponse,
    ProjectProfitabilityResponse,
    ProjectResponse,
    ProjectRevenueEntryListResponse,
    ProjectTimeEntryCreateRequest,
    ProjectTimeEntryListResponse,
    ProjectTimeEntryResponse,
    ProjectTimeEntryUpdateRequest,
    ProjectCreateRequest,
    ProjectUpdateRequest,
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/organizations/{organization_id}", tags=["projects"])


@router.post("/projects", response_model=ProjectResponse)
def create_project(organization_id: str, payload: ProjectCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("projects.create")), db: Session = Depends(get_db)):
    return ProjectService(db).create_project(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/projects", response_model=ProjectListResponse)
def list_projects(organization_id: str, q: str | None = Query(None), status: ProjectStatus | None = Query(None), customer_id: UUID | None = None, active_only: bool | None = Query(None), _=Depends(require_permission("projects.read")), db: Session = Depends(get_db)):
    return ProjectListResponse(items=ProjectService(db).list_projects(organization_id, search=q, status=status, customer_id=customer_id, active_only=active_only))


@router.get("/projects/search", response_model=ProjectListResponse)
def search_projects(organization_id: str, q: str = Query(""), _=Depends(require_permission("projects.read")), db: Session = Depends(get_db)):
    return ProjectListResponse(items=ProjectService(db).list_projects(organization_id, search=q))


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(organization_id: str, project_id: UUID, _=Depends(require_permission("projects.read")), db: Session = Depends(get_db)):
    return ProjectService(db).get_project(organization_id, project_id)


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
def update_project(organization_id: str, project_id: UUID, payload: ProjectUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("projects.update")), db: Session = Depends(get_db)):
    return ProjectService(db).update_project(organization_id, project_id, current_user.id, payload.model_dump(exclude_none=True))


@router.delete("/projects/{project_id}")
def archive_project(organization_id: str, project_id: UUID, current_user=Depends(get_current_user), _=Depends(require_permission("projects.archive")), db: Session = Depends(get_db)):
    ProjectService(db).archive_project(organization_id, project_id, current_user.id)
    return {"message": "archived"}


@router.get("/projects/{project_id}/costs", response_model=ProjectCostEntryListResponse)
def project_costs(organization_id: str, project_id: UUID, _=Depends(require_permission("projects.read")), db: Session = Depends(get_db)):
    return ProjectCostEntryListResponse(items=ProjectService(db).list_costs(organization_id, project_id))


@router.get("/projects/{project_id}/revenue", response_model=ProjectRevenueEntryListResponse)
def project_revenue(organization_id: str, project_id: UUID, _=Depends(require_permission("projects.read")), db: Session = Depends(get_db)):
    return ProjectRevenueEntryListResponse(items=ProjectService(db).list_revenue(organization_id, project_id))


@router.get("/projects/{project_id}/activity", response_model=ProjectActivityResponse)
def project_activity(organization_id: str, project_id: UUID, _=Depends(require_permission("projects.read")), db: Session = Depends(get_db)):
    return ProjectService(db).activity(organization_id, project_id)


@router.get("/projects/{project_id}/profitability", response_model=ProjectProfitabilityResponse)
def project_profitability(organization_id: str, project_id: UUID, _=Depends(require_permission("projects.profitability.read")), db: Session = Depends(get_db)):
    return ProjectService(db).profitability(organization_id, project_id)


@router.post("/projects/{project_id}/budget", response_model=ProjectBudgetResponse)
def create_project_budget(organization_id: str, project_id: UUID, payload: ProjectBudgetRequest, current_user=Depends(get_current_user), _=Depends(require_permission("projects.budget.manage")), db: Session = Depends(get_db)):
    return ProjectService(db).update_budget(organization_id, project_id, current_user.id, payload.model_dump(exclude_none=True))


@router.patch("/projects/{project_id}/budget", response_model=ProjectBudgetResponse)
def update_project_budget(organization_id: str, project_id: UUID, payload: ProjectBudgetRequest, current_user=Depends(get_current_user), _=Depends(require_permission("projects.budget.manage")), db: Session = Depends(get_db)):
    return ProjectService(db).update_budget(organization_id, project_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/projects/{project_id}/budget", response_model=ProjectBudgetResponse)
def get_project_budget(organization_id: str, project_id: UUID, _=Depends(require_permission("projects.read")), db: Session = Depends(get_db)):
    return ProjectService(db).budget(organization_id, project_id)


@router.post("/projects/{project_id}/time-entries", response_model=ProjectTimeEntryResponse)
def create_time_entry(organization_id: str, project_id: UUID, payload: ProjectTimeEntryCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("projects.time.create")), db: Session = Depends(get_db)):
    return ProjectService(db).create_time_entry(organization_id, project_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/projects/{project_id}/time-entries", response_model=ProjectTimeEntryListResponse)
def list_time_entries(organization_id: str, project_id: UUID, _=Depends(require_permission("projects.read")), db: Session = Depends(get_db)):
    return ProjectTimeEntryListResponse(items=ProjectService(db).list_time_entries(organization_id, project_id))


@router.patch("/projects/{project_id}/time-entries/{time_entry_id}", response_model=ProjectTimeEntryResponse)
def update_time_entry(organization_id: str, project_id: UUID, time_entry_id: UUID, payload: ProjectTimeEntryUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("projects.time.update")), db: Session = Depends(get_db)):
    return ProjectService(db).update_time_entry(organization_id, project_id, time_entry_id, current_user.id, payload.model_dump(exclude_none=True))


@router.delete("/projects/{project_id}/time-entries/{time_entry_id}")
def delete_time_entry(organization_id: str, project_id: UUID, time_entry_id: UUID, current_user=Depends(get_current_user), _=Depends(require_permission("projects.time.update")), db: Session = Depends(get_db)):
    ProjectService(db).delete_time_entry(organization_id, project_id, time_entry_id, current_user.id)
    return {"message": "deleted"}


@router.get("/project-profitability", response_model=ProjectProfitabilityListResponse)
def project_profitability_report(organization_id: str, _=Depends(require_permission("projects.profitability.read")), db: Session = Depends(get_db)):
    return ProjectProfitabilityListResponse(items=ProjectService(db).project_profitability_report(organization_id))


@router.get("/project-budget-vs-actual", response_model=ProjectProfitabilityListResponse)
def project_budget_vs_actual_report(organization_id: str, _=Depends(require_permission("projects.profitability.read")), db: Session = Depends(get_db)):
    return ProjectProfitabilityListResponse(items=ProjectService(db).budget_vs_actual_report(organization_id))


@router.get("/project-summary", response_model=ProjectProfitabilityListResponse)
def project_summary_report(organization_id: str, customer_id: UUID | None = None, _=Depends(require_permission("projects.read")), db: Session = Depends(get_db)):
    return ProjectProfitabilityListResponse(items=ProjectService(db).project_summary(organization_id, customer_id=customer_id))
