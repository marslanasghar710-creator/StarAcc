from sqlalchemy.orm import Session

from app.core.exceptions import forbidden
from app.repositories.audit import AuditRepository
from app.repositories.numbering_settings_repository import NumberingSettingsRepository


class NumberingService:
    FIELD_MAP = {
        "invoice": ("invoice_prefix", "next_invoice_number"),
        "credit_note": ("credit_note_prefix", "next_credit_note_number"),
        "payment": ("payment_prefix", "next_payment_number"),
        "bill": ("bill_prefix", "next_bill_number"),
        "supplier_credit": ("supplier_credit_prefix", "next_supplier_credit_number"),
        "supplier_payment": ("supplier_payment_prefix", "next_supplier_payment_number"),
        "journal": ("journal_prefix", "next_journal_number"),
    }

    def __init__(self, db: Session):
        self.db = db
        self.repo = NumberingSettingsRepository(db)
        self.audit = AuditRepository(db)

    def get_or_create(self, organization_id: str, *, for_update: bool = False):
        row = self.repo.get(organization_id, for_update=for_update)
        if row:
            return row
        row = self.repo.create(organization_id=organization_id)
        self.db.flush()
        return row

    def update(self, organization_id: str, actor_user_id: str, payload: dict):
        row = self.get_or_create(organization_id)
        for key, value in payload.items():
            if key.startswith("next_") and value is not None and value < 1:
                raise forbidden(f"{key} must be positive")
            if key.endswith("_prefix") and value is not None and not str(value).strip():
                raise forbidden(f"{key} cannot be blank")
            setattr(row, key, value)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="numbering.updated", entity_type="numbering_settings", entity_id=str(row.id))
        self.db.commit()
        self.db.refresh(row)
        return row

    def next_number(self, organization_id: str, document_type: str) -> str:
        if document_type not in self.FIELD_MAP:
            raise forbidden("Unsupported numbering type")
        row = self.get_or_create(organization_id, for_update=True)
        prefix_field, next_field = self.FIELD_MAP[document_type]
        prefix = getattr(row, prefix_field)
        next_number = getattr(row, next_field)
        if next_number < 1:
            raise forbidden("Numbering counter must be positive")
        formatted = f"{prefix}-{next_number:06d}" if prefix else f"{next_number:06d}"
        setattr(row, next_field, next_number + 1)
        self.db.flush()
        return formatted
