from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Invitation, OrganizationUser


class MembershipRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_membership(self, **kwargs) -> OrganizationUser:
        m = OrganizationUser(**kwargs)
        self.db.add(m)
        self.db.flush()
        return m

    def get_membership(self, user_id, organization_id):
        return self.db.scalar(
            select(OrganizationUser).where(
                OrganizationUser.user_id == user_id,
                OrganizationUser.organization_id == organization_id,
                OrganizationUser.deleted_at.is_(None),
            )
        )


    def list_for_user(self, user_id):
        return list(
            self.db.scalars(
                select(OrganizationUser).where(OrganizationUser.user_id == user_id, OrganizationUser.deleted_at.is_(None))
            ).all()
        )

    def list_members(self, organization_id):
        return list(
            self.db.scalars(
                select(OrganizationUser).where(OrganizationUser.organization_id == organization_id, OrganizationUser.deleted_at.is_(None))
            ).all()
        )

    def get_by_id(self, membership_id):
        return self.db.scalar(select(OrganizationUser).where(OrganizationUser.id == membership_id, OrganizationUser.deleted_at.is_(None)))

    def create_invitation(self, **kwargs) -> Invitation:
        inv = Invitation(**kwargs)
        self.db.add(inv)
        self.db.flush()
        return inv

    def get_invitation_by_token(self, token: str):
        return self.db.scalar(select(Invitation).where(Invitation.token == token))
