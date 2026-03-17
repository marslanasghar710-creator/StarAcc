from uuid import UUID

from app.schemas.common import ORMModel


class RoleResponse(ORMModel):
    id: UUID
    name: str
    description: str | None


class PermissionResponse(ORMModel):
    id: UUID
    code: str
    description: str | None
