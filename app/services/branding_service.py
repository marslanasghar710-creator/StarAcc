import re

from sqlalchemy.orm import Session

from app.core.exceptions import forbidden
from app.repositories.audit import AuditRepository
from app.repositories.branding_settings_repository import BrandingSettingsRepository
from app.repositories.file_repository import FileRepository

HEX_COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")


class BrandingService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = BrandingSettingsRepository(db)
        self.files = FileRepository(db)
        self.audit = AuditRepository(db)

    def get_or_create(self, organization_id: str):
        row = self.repo.get(organization_id)
        if row:
            return row
        row = self.repo.create(organization_id=organization_id)
        self.db.flush()
        return row

    def update(self, organization_id: str, actor_user_id: str, payload: dict):
        row = self.get_or_create(organization_id)
        for key in ["primary_color", "secondary_color"]:
            value = payload.get(key)
            if value and not HEX_COLOR.match(value):
                raise forbidden(f"{key} must be a valid hex color")
        if "logo_file_id" in payload:
            logo_file_id = payload["logo_file_id"]
            if logo_file_id:
                file_row = self.files.get(organization_id, logo_file_id)
                if not file_row:
                    raise forbidden("Logo file must belong to the same organization")
            row.logo_file_id = logo_file_id
            payload = {k: v for k, v in payload.items() if k != "logo_file_id"}
        for key, value in payload.items():
            setattr(row, key, value)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="branding.updated", entity_type="branding_settings", entity_id=str(row.id))
        self.db.commit()
        self.db.refresh(row)
        return row
