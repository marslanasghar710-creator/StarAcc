from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class AuditLogResponse(ORMModel):
    id: UUID
    organization_id: UUID | None
    actor_user_id: UUID | None
    action: str
    entity_type: str
    entity_id: str | None
    metadata_json: dict | None
    ip_address: str | None
    created_at: datetime


class AuditLogEntryResponse(AuditLogResponse):
    actor_email: str | None = None


class AuditFacetCount(BaseModel):
    value: str | None
    count: int = Field(ge=0)


class AuditActivityCenterResponse(BaseModel):
    items: list[AuditLogEntryResponse]
    total_count: int = Field(ge=0)
    actor_count: int = Field(ge=0)
    action_count: int = Field(ge=0)
    entity_type_count: int = Field(ge=0)
    top_actions: list[AuditFacetCount]
    top_entity_types: list[AuditFacetCount]
    has_more: bool
    applied_limit: int = Field(ge=1)
