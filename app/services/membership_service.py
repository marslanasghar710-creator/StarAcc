import secrets
from datetime import datetime, timedelta, timezone

UTC = timezone.utc

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import InvitationStatus, MembershipStatus
from app.core.exceptions import forbidden, not_found
from app.repositories.audit import AuditRepository
from app.repositories.membership import MembershipRepository
from app.repositories.users import UserRepository


class MembershipService:
    def __init__(self, db: Session):
        self.db = db
        self.memberships = MembershipRepository(db)
        self.users = UserRepository(db)
        self.audit = AuditRepository(db)

    def invite(self, organization_id, invited_by_user_id, email: str, role_id):
        token = secrets.token_urlsafe(32)
        user = self.users.get_by_email(email)
        if user and not self.memberships.get_membership(user.id, organization_id):
            self.memberships.create_membership(
                user_id=user.id,
                organization_id=organization_id,
                role_id=role_id,
                is_default=False,
                invited_by_user_id=invited_by_user_id,
                status=MembershipStatus.INVITED,
            )
        inv = self.memberships.create_invitation(
            organization_id=organization_id,
            email=email.lower(),
            role_id=role_id,
            invited_by_user_id=invited_by_user_id,
            token=token,
            expires_at=datetime.now(UTC) + timedelta(days=settings.invitation_expire_days),
        )
        self.audit.create(organization_id=organization_id, actor_user_id=invited_by_user_id, action="member.invited", entity_type="invitation", entity_id=str(inv.id))
        self.db.commit()
        return inv

    def accept_invitation(self, token: str, current_user_id):
        inv = self.memberships.get_invitation_by_token(token)
        if not inv or inv.status != InvitationStatus.PENDING:
            raise not_found("Invitation not found")
        if inv.expires_at < datetime.now(UTC):
            raise forbidden("Invitation expired")
        membership = self.memberships.get_membership(current_user_id, inv.organization_id)
        if membership:
            membership.status = MembershipStatus.ACTIVE
            membership.joined_at = datetime.now(UTC)
        inv.status = InvitationStatus.ACCEPTED
        self.audit.create(organization_id=inv.organization_id, actor_user_id=current_user_id, action="member.accepted_invite", entity_type="invitation", entity_id=str(inv.id))
        self.db.commit()

    def decline_invitation(self, token: str):
        inv = self.memberships.get_invitation_by_token(token)
        if not inv:
            raise not_found("Invitation not found")
        inv.status = InvitationStatus.DECLINED
        self.db.commit()
