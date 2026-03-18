from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import UserStatus
from app.schemas.common import ORMModel, SessionResponse


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOrgSummary(BaseModel):
    organization_id: UUID
    role: str


class UserResponse(ORMModel):
    id: UUID
    email: EmailStr
    status: UserStatus
    mfa_enabled: bool


class MeResponse(BaseModel):
    user: UserResponse
    organizations: list[UserOrgSummary]


class PasswordForgotRequest(BaseModel):
    email: EmailStr


class PasswordResetRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class SessionsResponse(BaseModel):
    sessions: list[SessionResponse]
