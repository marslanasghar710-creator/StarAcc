from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_org_membership
from app.db.session import get_db
from app.schemas.activation import ActivationSnapshotResponse, ConfirmSettingsReviewedRequest, UpdateActivationPresentationPreferencesRequest
from app.services.activation_service import ActivationService

router = APIRouter(prefix="/organizations/{organization_id}/activation", tags=["activation"])


@router.get("/snapshot", response_model=ActivationSnapshotResponse)
def get_snapshot(
    organization_id: str,
    _=Depends(require_org_membership),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ActivationService(db)
    snapshot = service.evaluate_snapshot(organization_id, user_id=str(current_user.id))
    preferences = service.get_presentation_preferences(organization_id, str(current_user.id))
    return {"snapshot": snapshot, "presentation_preferences": preferences}


@router.post("/confirm-settings-reviewed", response_model=ActivationSnapshotResponse)
def confirm_settings_reviewed(
    organization_id: str,
    _payload: ConfirmSettingsReviewedRequest,
    _=Depends(require_org_membership),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ActivationService(db)
    snapshot = service.confirm_settings_reviewed(organization_id, str(current_user.id))
    preferences = service.get_presentation_preferences(organization_id, str(current_user.id))
    return {"snapshot": snapshot, "presentation_preferences": preferences}


@router.post("/presentation-preferences", response_model=ActivationSnapshotResponse)
def update_preferences(
    organization_id: str,
    payload: UpdateActivationPresentationPreferencesRequest,
    _=Depends(require_org_membership),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ActivationService(db)
    service.update_presentation_preferences(
        organization_id,
        str(current_user.id),
        checklist_dismissed=payload.checklist_dismissed,
        app_banner_dismissed=payload.app_banner_dismissed,
        preferred_surface=payload.preferred_surface,
    )
    snapshot = service.evaluate_snapshot(organization_id, user_id=str(current_user.id))
    preferences = service.get_presentation_preferences(organization_id, str(current_user.id))
    return {"snapshot": snapshot, "presentation_preferences": preferences}
