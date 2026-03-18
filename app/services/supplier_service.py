from datetime import datetime, timezone

UTC = timezone.utc
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import not_found
from app.repositories.audit import AuditRepository
from app.repositories.bill_repository import BillRepository
from app.repositories.supplier_repository import SupplierRepository


class SupplierService:
    def __init__(self, db: Session):
        self.db = db
        self.suppliers = SupplierRepository(db)
        self.bills = BillRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id, user_id, payload):
        if payload.get("email"):
            payload["email"] = payload["email"].lower()
        supplier = self.suppliers.create(organization_id=organization_id, **payload)
        self.audit.create(organization_id=organization_id, actor_user_id=user_id, action="supplier.created", entity_type="supplier", entity_id=str(supplier.id))
        self.db.commit()
        return supplier

    def update(self, organization_id, supplier_id, user_id, payload):
        supplier = self.suppliers.get(organization_id, supplier_id)
        if not supplier:
            raise not_found("Supplier not found")
        if payload.get("email"):
            payload["email"] = payload["email"].lower()
        for k, v in payload.items():
            setattr(supplier, k, v)
        self.audit.create(organization_id=organization_id, actor_user_id=user_id, action="supplier.updated", entity_type="supplier", entity_id=str(supplier.id))
        self.db.commit()
        self.db.refresh(supplier)
        return supplier

    def archive(self, organization_id, supplier_id, user_id):
        supplier = self.suppliers.get(organization_id, supplier_id)
        if not supplier:
            raise not_found("Supplier not found")
        supplier.is_active = False
        supplier.deleted_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=user_id, action="supplier.archived", entity_type="supplier", entity_id=str(supplier.id))
        self.db.commit()

    def balance(self, organization_id, supplier_id):
        supplier = self.suppliers.get(organization_id, supplier_id)
        if not supplier:
            raise not_found("Supplier not found")
        bills = [b for b in self.bills.list(organization_id) if str(b.supplier_id) == str(supplier_id)]
        total_billed = sum((Decimal(b.total_amount) for b in bills), Decimal("0"))
        total_paid = sum((Decimal(b.amount_paid) for b in bills), Decimal("0"))
        return {"supplier_id": supplier.id, "total_billed": total_billed, "total_paid": total_paid, "total_outstanding": total_billed - total_paid}
