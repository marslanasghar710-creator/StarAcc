from datetime import datetime, timezone

UTC = timezone.utc

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_org_membership, require_permission
from app.core.exceptions import not_found
from app.db.session import get_db
from app.repositories.membership import MembershipRepository
from app.repositories.orgs import OrganizationRepository
from app.schemas.membership import InvitationCreateRequest, MembershipResponse, MembershipUpdateRequest
from app.schemas.organization import (
    OrganizationCreateRequest,
    OrganizationResponse,
    OrganizationSettingsResponse,
    OrganizationSettingsUpdateRequest,
    OrganizationUpdateRequest,
)
from app.services.membership_service import MembershipService
from app.services.organization_service import OrganizationService

router = APIRouter()


@router.post("", response_model=OrganizationResponse)
def create_org(payload: OrganizationCreateRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return OrganizationService(db).create_organization(current_user.id, payload.model_dump())


@router.get("", response_model=list[OrganizationResponse])
def list_orgs(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return OrganizationRepository(db).list_for_user(current_user.id)


@router.get("/{organization_id}", response_model=OrganizationResponse)
def get_org(organization_id: str, _=Depends(require_org_membership), db: Session = Depends(get_db)):
    org = OrganizationRepository(db).get(organization_id)
    if not org:
        raise not_found("Organization not found")
    return org


@router.patch("/{organization_id}", response_model=OrganizationResponse)
def patch_org(
    organization_id: str,
    payload: OrganizationUpdateRequest,
    current_user=Depends(get_current_user),
    _=Depends(require_permission("org.update")),
    db: Session = Depends(get_db),
):
    data = payload.model_dump(exclude_none=True)
    return OrganizationService(db).update_organization(organization_id, data, current_user.id)


@router.delete("/{organization_id}")
def delete_org(
    organization_id: str,
    current_user=Depends(get_current_user),
    _=Depends(require_permission("org.delete")),
    db: Session = Depends(get_db),
):
    OrganizationService(db).delete_organization(organization_id, current_user.id)
    return {"message": "deleted"}


@router.get("/{organization_id}/settings", response_model=OrganizationSettingsResponse)
def get_settings(organization_id: str, _=Depends(require_permission("settings.read")), db: Session = Depends(get_db)):
    settings = OrganizationRepository(db).get_settings(organization_id)
    if not settings:
        raise not_found("Settings not found")
    return settings


@router.patch("/{organization_id}/settings", response_model=OrganizationSettingsResponse)
def patch_settings(
    organization_id: str,
    payload: OrganizationSettingsUpdateRequest,
    _=Depends(require_permission("settings.update")),
    db: Session = Depends(get_db),
):
    settings = OrganizationRepository(db).get_settings(organization_id)
    if not settings:
        raise not_found("Settings not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(settings, k, v)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/{organization_id}/members", response_model=list[MembershipResponse])
def list_members(organization_id: str, _=Depends(require_permission("users.read")), db: Session = Depends(get_db)):
    return MembershipRepository(db).list_members(organization_id)


@router.post("/{organization_id}/invite")
def invite_member(
    organization_id: str,
    payload: InvitationCreateRequest,
    current_user=Depends(get_current_user),
    _=Depends(require_permission("users.invite")),
    db: Session = Depends(get_db),
):
    inv = MembershipService(db).invite(organization_id, current_user.id, payload.email, payload.role_id)
    return {"id": str(inv.id), "token": inv.token}


@router.patch("/{organization_id}/members/{membership_id}", response_model=MembershipResponse)
def update_member(
    organization_id: str,
    membership_id: str,
    payload: MembershipUpdateRequest,
    _=Depends(require_permission("users.remove")),
    db: Session = Depends(get_db),
):
    membership = MembershipRepository(db).get_by_id(membership_id)
    if not membership or str(membership.organization_id) != organization_id:
        raise not_found("Membership not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(membership, k, v)
    db.commit()
    db.refresh(membership)
    return membership


@router.delete("/{organization_id}/members/{membership_id}")
def remove_member(
    organization_id: str,
    membership_id: str,
    current_user=Depends(get_current_user),
    _=Depends(require_permission("users.remove")),
    db: Session = Depends(get_db),
):
    membership = MembershipRepository(db).get_by_id(membership_id)
    if not membership or str(membership.organization_id) != organization_id:
        raise not_found("Membership not found")
    membership.deleted_at = datetime.now(UTC)
    db.commit()
    return {"message": "member removed"}
