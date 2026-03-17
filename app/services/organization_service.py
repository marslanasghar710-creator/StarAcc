from datetime import datetime, UTC

from sqlalchemy.orm import Session

from app.core.enums import MembershipStatus
from app.core.exceptions import not_found
from app.repositories.audit import AuditRepository
from app.repositories.membership import MembershipRepository
from app.repositories.orgs import OrganizationRepository
from app.repositories.rbac import RBACRepository


class OrganizationService:
    def __init__(self, db: Session):
        self.db = db
        self.orgs = OrganizationRepository(db)
        self.memberships = MembershipRepository(db)
        self.rbac = RBACRepository(db)
        self.audit = AuditRepository(db)

    def create_organization(self, user_id, payload: dict):
        org = self.orgs.create(payload)
        owner = self.rbac.get_role_by_name("owner")
        self.memberships.create_membership(
            user_id=user_id,
            organization_id=org.id,
            role_id=owner.id,
            is_default=True,
            joined_at=datetime.now(UTC),
            status=MembershipStatus.ACTIVE,
        )
        self.audit.create(organization_id=org.id, actor_user_id=user_id, action="org.created", entity_type="organization", entity_id=str(org.id))
        self.db.commit()
        return org

    def update_organization(self, org_id, payload: dict, actor_user_id):
        org = self.orgs.get(org_id)
        if not org:
            raise not_found("Organization not found")
        for k, v in payload.items():
            setattr(org, k, v)
        self.audit.create(organization_id=org.id, actor_user_id=actor_user_id, action="org.updated", entity_type="organization", entity_id=str(org.id))
        self.db.commit()
        return org

    def delete_organization(self, org_id, actor_user_id):
        org = self.orgs.get(org_id)
        if not org:
            raise not_found("Organization not found")
        org.deleted_at = datetime.now(UTC)
        self.audit.create(organization_id=org.id, actor_user_id=actor_user_id, action="org.deleted", entity_type="organization", entity_id=str(org.id))
        self.db.commit()

