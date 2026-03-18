from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.core.enums import MembershipStatus
from app.schemas.common import ORMModel


class InvitationCreateRequest(BaseModel):
    email: EmailStr
    role_id: UUID


class InvitationAcceptRequest(BaseModel):
    token: str


class InvitationDeclineRequest(BaseModel):
    token: str


class MembershipUpdateRequest(BaseModel):
    role_id: UUID | None = None
    status: MembershipStatus | None = None


class MembershipResponse(ORMModel):
    id: UUID
    user_id: UUID
    organization_id: UUID
    role_id: UUID
    is_default: bool
    status: MembershipStatus
    joined_at: datetime | None
