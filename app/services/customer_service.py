from datetime import datetime, UTC
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import not_found
from app.repositories.audit import AuditRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.invoice_repository import InvoiceRepository


class CustomerService:
    def __init__(self, db: Session):
        self.db = db
        self.customers = CustomerRepository(db)
        self.invoices = InvoiceRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id, user_id, payload):
        if payload.get("email"):
            payload["email"] = payload["email"].lower()
        customer = self.customers.create(organization_id=organization_id, **payload)
        self.audit.create(organization_id=organization_id, actor_user_id=user_id, action="customer.created", entity_type="customer", entity_id=str(customer.id))
        self.db.commit()
        return customer

    def update(self, organization_id, customer_id, user_id, payload):
        customer = self.customers.get(organization_id, customer_id)
        if not customer:
            raise not_found("Customer not found")
        if payload.get("email"):
            payload["email"] = payload["email"].lower()
        for k, v in payload.items():
            setattr(customer, k, v)
        self.audit.create(organization_id=organization_id, actor_user_id=user_id, action="customer.updated", entity_type="customer", entity_id=str(customer.id))
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def archive(self, organization_id, customer_id, user_id):
        customer = self.customers.get(organization_id, customer_id)
        if not customer:
            raise not_found("Customer not found")
        customer.is_active = False
        customer.deleted_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=user_id, action="customer.archived", entity_type="customer", entity_id=str(customer.id))
        self.db.commit()

    def balance(self, organization_id, customer_id):
        customer = self.customers.get(organization_id, customer_id)
        if not customer:
            raise not_found("Customer not found")
        invoices = [i for i in self.invoices.list(organization_id) if str(i.customer_id) == str(customer_id)]
        total_invoiced = sum((Decimal(i.total_amount) for i in invoices), Decimal("0"))
        total_paid = sum((Decimal(i.amount_paid) for i in invoices), Decimal("0"))
        return {"customer_id": customer.id, "total_invoiced": total_invoiced, "total_paid": total_paid, "total_outstanding": total_invoiced - total_paid}
