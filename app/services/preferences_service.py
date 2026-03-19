from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.core.exceptions import forbidden
from app.repositories.audit import AuditRepository
from app.repositories.organization_preferences_repository import OrganizationPreferencesRepository

ALLOWED_DATE_FORMATS = {"YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"}
ALLOWED_NUMBER_FORMATS = {"1,234.56", "1.234,56", "1234.56"}


class PreferencesService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = OrganizationPreferencesRepository(db)
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
        if "timezone" in payload:
            self._validate_timezone(payload["timezone"])
        if "week_start_day" in payload and payload["week_start_day"] is not None and payload["week_start_day"] not in range(0, 7):
            raise forbidden("week_start_day must be between 0 and 6")
        if "date_format" in payload and payload["date_format"] not in ALLOWED_DATE_FORMATS:
            raise forbidden("Unsupported date format")
        if "number_format" in payload and payload["number_format"] not in ALLOWED_NUMBER_FORMATS:
            raise forbidden("Unsupported number format")
        for key, value in payload.items():
            setattr(row, key, value)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="preferences.updated", entity_type="organization_preferences", entity_id=str(row.id))
        self.db.commit()
        self.db.refresh(row)
        return row

    def _validate_timezone(self, timezone_name: str):
        try:
            ZoneInfo(timezone_name)
        except Exception as exc:  # pragma: no cover - exact exception type varies by runtime tzdata availability
            raise forbidden("Invalid timezone") from exc
