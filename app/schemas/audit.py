from datetime import datetime
from uuid import UUID

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
