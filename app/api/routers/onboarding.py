from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_org_membership
from app.db.session import get_db
from app.schemas.onboarding import (
    OnboardingPathSelectRequest,
    OnboardingPersonaSelectRequest,
    OnboardingResumeRequest,
    OnboardingResumeResponse,
    OnboardingStatusResponse,
    OnboardingTaskUpdateRequest,
)
from app.services.onboarding_service import OnboardingService

router = APIRouter(prefix="/organizations/{organization_id}/onboarding", tags=["onboarding"])


@router.get("/status", response_model=OnboardingStatusResponse)
def get_onboarding_status(
    organization_id: str,
    _=Depends(require_org_membership),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return OnboardingService(db).get_status(organization_id, current_user)


@router.post("/path", response_model=OnboardingStatusResponse)
def choose_onboarding_path(
    organization_id: str,
    payload: OnboardingPathSelectRequest,
    _=Depends(require_org_membership),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return OnboardingService(db).select_path(organization_id, current_user, payload.path)


@router.post("/persona", response_model=OnboardingStatusResponse)
def choose_onboarding_persona(
    organization_id: str,
    payload: OnboardingPersonaSelectRequest,
    _=Depends(require_org_membership),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return OnboardingService(db).select_persona(organization_id, current_user, payload.persona)


@router.post("/tasks/{task_key}", response_model=OnboardingStatusResponse)
def update_task(
    organization_id: str,
    task_key: str,
    payload: OnboardingTaskUpdateRequest,
    _=Depends(require_org_membership),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return OnboardingService(db).update_task(organization_id, current_user, task_key, payload.status)


@router.post("/prompts/{prompt_key}/dismiss", response_model=OnboardingStatusResponse)
def dismiss_prompt(
    organization_id: str,
    prompt_key: str,
    _=Depends(require_org_membership),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return OnboardingService(db).dismiss_prompt(organization_id, current_user, prompt_key)


@router.post("/resume", response_model=OnboardingResumeResponse)
def resume_onboarding(
    organization_id: str,
    payload: OnboardingResumeRequest,
    _=Depends(require_org_membership),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return OnboardingService(db).resume(organization_id, current_user, payload.source)
