from fastapi import Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.enums import MembershipStatus
from app.core.exceptions import forbidden
from app.db.session import get_db
from app.repositories.membership import MembershipRepository
from app.repositories.rbac import RBACRepository


def require_org_membership(organization_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    membership = MembershipRepository(db).get_membership(current_user.id, organization_id)
    if not membership or membership.status != MembershipStatus.ACTIVE:
        raise forbidden("Not a member of this organization")
    return membership


def require_permission(permission_code: str):
    def dependency(membership=Depends(require_org_membership), db: Session = Depends(get_db)):
        if not RBACRepository(db).role_has_permission(membership.role_id, permission_code):
            raise forbidden("Permission denied")
        return membership

    return dependency
