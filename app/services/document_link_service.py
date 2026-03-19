from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import forbidden, not_found
from app.db.models import (
    BankTransaction,
    Bill,
    CreditNote,
    Customer,
    CustomerPayment,
    Invoice,
    JournalEntry,
    Organization,
    Supplier,
    SupplierCredit,
    SupplierPayment,
)
from app.repositories.audit import AuditRepository
from app.repositories.document_link_repository import DocumentLinkRepository
from app.repositories.file_repository import FileRepository

UTC = timezone.utc


class DocumentLinkService:
    ENTITY_MODELS = {
        "organization": Organization,
        "customer": Customer,
        "supplier": Supplier,
        "invoice": Invoice,
        "bill": Bill,
        "customer_payment": CustomerPayment,
        "supplier_payment": SupplierPayment,
        "credit_note": CreditNote,
        "supplier_credit": SupplierCredit,
        "bank_transaction": BankTransaction,
        "journal_entry": JournalEntry,
    }

    def __init__(self, db: Session):
        self.db = db
        self.repo = DocumentLinkRepository(db)
        self.files = FileRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id: str, actor_user_id: str, payload: dict):
        file_row = self.files.get(organization_id, payload["file_id"])
        if not file_row:
            raise forbidden("File must belong to the same organization")
        self._assert_entity_in_org(organization_id, payload["entity_type"], payload["entity_id"])
        existing = self.repo.find_exact(organization_id, payload["file_id"], payload["entity_type"], payload["entity_id"])
        if existing:
            return existing
        row = self.repo.create(
            organization_id=organization_id,
            file_id=payload["file_id"],
            entity_type=payload["entity_type"],
            entity_id=str(payload["entity_id"]),
            linked_by_user_id=actor_user_id,
            linked_at=datetime.now(UTC),
            label=payload.get("label"),
        )
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="document.linked", entity_type="document_link", entity_id=str(row.id))
        self.db.commit()
        self.db.refresh(row)
        return row

    def delete(self, organization_id: str, link_id: str, actor_user_id: str):
        row = self.repo.get(organization_id, link_id)
        if not row:
            raise not_found("Document link not found")
        row.deleted_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="document.unlinked", entity_type="document_link", entity_id=str(row.id))
        self.db.commit()

    def list(self, organization_id: str, *, file_id=None, entity_type=None, entity_id=None):
        return self.repo.list(organization_id, file_id=file_id, entity_type=entity_type, entity_id=entity_id)

    def _assert_entity_in_org(self, organization_id: str, entity_type: str, entity_id: str | UUID):
        model = self.ENTITY_MODELS.get(entity_type)
        if not model:
            raise forbidden("Unsupported entity type")
        row = self.db.get(model, entity_id)
        if not row:
            raise not_found("Target entity not found")
        row_org_id = getattr(row, "organization_id", None) or getattr(row, "id", None)
        if str(row_org_id) != str(organization_id):
            raise forbidden("Target entity must belong to the same organization")
