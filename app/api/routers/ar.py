from datetime import date, datetime, UTC

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_permission
from app.db.session import get_db
from app.schemas.ar import (
    ARAgingResponse,
    ARCustomerSummaryResponse,
    AROpenItemResponse,
    CreditNoteApplyRequest,
    CreditNoteCreateRequest,
    CreditNoteListResponse,
    CreditNoteResponse,
    CreditNoteUpdateRequest,
    CustomerBalanceResponse,
    CustomerCreateRequest,
    CustomerListResponse,
    CustomerPaymentAllocateRequest,
    CustomerPaymentCreateRequest,
    CustomerPaymentListResponse,
    CustomerPaymentResponse,
    CustomerPaymentUpdateRequest,
    CustomerResponse,
    InvoiceCreateRequest,
    InvoiceItemCreateRequest,
    InvoiceItemUpdateRequest,
    InvoiceListResponse,
    InvoiceResponse,
    InvoiceUpdateRequest,
    InvoiceVoidRequest,
    PaymentAllocationResponse,
)
from app.services.ar_query_service import ARQueryService
from app.services.credit_note_service import CreditNoteService
from app.services.customer_payment_service import CustomerPaymentService
from app.services.customer_service import CustomerService
from app.services.invoice_service import InvoiceService

router = APIRouter(prefix="/organizations/{organization_id}", tags=["accounts_receivable"])


@router.post("/customers", response_model=CustomerResponse)
def create_customer(organization_id: str, payload: CustomerCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("customers.create")), db: Session = Depends(get_db)):
    return CustomerService(db).create(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/customers", response_model=CustomerListResponse)
def list_customers(organization_id: str, _=Depends(require_permission("customers.read")), db: Session = Depends(get_db)):
    return CustomerListResponse(items=CustomerService(db).customers.list(organization_id))


@router.get("/customers/search", response_model=CustomerListResponse)
def search_customers(organization_id: str, q: str = Query(""), _=Depends(require_permission("customers.read")), db: Session = Depends(get_db)):
    return CustomerListResponse(items=CustomerService(db).customers.list(organization_id, q))


@router.get("/customers/{customer_id}", response_model=CustomerResponse)
def get_customer(organization_id: str, customer_id: str, _=Depends(require_permission("customers.read")), db: Session = Depends(get_db)):
    return CustomerService(db).customers.get(organization_id, customer_id)


@router.patch("/customers/{customer_id}", response_model=CustomerResponse)
def update_customer(organization_id: str, customer_id: str, payload: CustomerUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("customers.update")), db: Session = Depends(get_db)):
    return CustomerService(db).update(organization_id, customer_id, current_user.id, payload.model_dump(exclude_none=True))


@router.delete("/customers/{customer_id}")
def archive_customer(organization_id: str, customer_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("customers.archive")), db: Session = Depends(get_db)):
    CustomerService(db).archive(organization_id, customer_id, current_user.id)
    return {"message": "archived"}


@router.get("/customers/{customer_id}/activity")
def customer_activity(organization_id: str, customer_id: str, _=Depends(require_permission("customers.read"))):
    return {"customer_id": customer_id, "organization_id": organization_id, "activity": []}


@router.get("/customers/{customer_id}/balance", response_model=CustomerBalanceResponse)
def customer_balance(organization_id: str, customer_id: str, _=Depends(require_permission("ar.read")), db: Session = Depends(get_db)):
    return CustomerService(db).balance(organization_id, customer_id)


@router.post("/invoices", response_model=InvoiceResponse)
def create_invoice(organization_id: str, payload: InvoiceCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("invoices.create")), db: Session = Depends(get_db)):
    return InvoiceService(db).create(organization_id, current_user.id, payload.model_dump())


@router.get("/invoices", response_model=InvoiceListResponse)
def list_invoices(organization_id: str, _=Depends(require_permission("invoices.read")), db: Session = Depends(get_db)):
    return InvoiceListResponse(items=InvoiceService(db).invoices.list(organization_id))


@router.get("/invoices/search", response_model=InvoiceListResponse)
def search_invoices(organization_id: str, _=Depends(require_permission("invoices.read")), db: Session = Depends(get_db)):
    return InvoiceListResponse(items=InvoiceService(db).invoices.list(organization_id))


@router.get("/invoices/open", response_model=InvoiceListResponse)
def open_invoices(organization_id: str, _=Depends(require_permission("invoices.read")), db: Session = Depends(get_db)):
    items = [i for i in InvoiceService(db).invoices.list(organization_id) if i.amount_due > 0]
    return InvoiceListResponse(items=items)


@router.get("/invoices/overdue", response_model=InvoiceListResponse)
def overdue_invoices(organization_id: str, _=Depends(require_permission("invoices.read")), db: Session = Depends(get_db)):
    today = date.today()
    items = [i for i in InvoiceService(db).invoices.list(organization_id) if i.amount_due > 0 and i.due_date < today]
    return InvoiceListResponse(items=items)


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(organization_id: str, invoice_id: str, _=Depends(require_permission("invoices.read")), db: Session = Depends(get_db)):
    return InvoiceService(db).invoices.get(organization_id, invoice_id)


@router.patch("/invoices/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(organization_id: str, invoice_id: str, payload: InvoiceUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("invoices.update")), db: Session = Depends(get_db)):
    return InvoiceService(db).update(organization_id, invoice_id, current_user.id, payload.model_dump(exclude_none=True))


@router.delete("/invoices/{invoice_id}")
def delete_invoice(organization_id: str, invoice_id: str, _=Depends(require_permission("invoices.update")), db: Session = Depends(get_db)):
    InvoiceService(db).delete_draft(organization_id, invoice_id)
    return {"message": "deleted"}


@router.post("/invoices/{invoice_id}/approve", response_model=InvoiceResponse)
def approve_invoice(organization_id: str, invoice_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("invoices.approve")), db: Session = Depends(get_db)):
    return InvoiceService(db).approve(organization_id, invoice_id, current_user.id)


@router.post("/invoices/{invoice_id}/send", response_model=InvoiceResponse)
def send_invoice(organization_id: str, invoice_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("invoices.send")), db: Session = Depends(get_db)):
    return InvoiceService(db).send(organization_id, invoice_id, current_user.id)


@router.post("/invoices/{invoice_id}/post", response_model=InvoiceResponse)
def post_invoice(organization_id: str, invoice_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("invoices.post")), db: Session = Depends(get_db)):
    return InvoiceService(db).post(organization_id, invoice_id, current_user.id)


@router.post("/invoices/{invoice_id}/void", response_model=InvoiceResponse)
def void_invoice(organization_id: str, invoice_id: str, payload: InvoiceVoidRequest, current_user=Depends(get_current_user), _=Depends(require_permission("invoices.void")), db: Session = Depends(get_db)):
    _ = payload
    return InvoiceService(db).void(organization_id, invoice_id, current_user.id)


@router.post("/invoices/{invoice_id}/items", response_model=InvoiceResponse)
def add_invoice_item(organization_id: str, invoice_id: str, payload: InvoiceItemCreateRequest, _=Depends(require_permission("invoices.update")), db: Session = Depends(get_db)):
    svc = InvoiceService(db)
    svc.add_item(organization_id, invoice_id, payload.model_dump())
    inv = svc.invoices.get(organization_id, invoice_id)
    svc._recalc(inv)
    db.commit()
    return inv


@router.patch("/invoices/{invoice_id}/items/{item_id}", response_model=InvoiceResponse)
def update_invoice_item(organization_id: str, invoice_id: str, item_id: str, payload: InvoiceItemUpdateRequest, _=Depends(require_permission("invoices.update")), db: Session = Depends(get_db)):
    svc = InvoiceService(db)
    item = svc.invoices.get_item(item_id)
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    from app.services.invoice_calculation_service import InvoiceCalculationService

    subtotal, tax, total = InvoiceCalculationService.calculate_line(item.quantity, item.unit_price, item.discount_percent, item.discount_amount, item.line_tax_amount)
    item.line_subtotal = subtotal
    item.line_tax_amount = tax
    item.line_total = total
    inv = svc.invoices.get(organization_id, invoice_id)
    svc._recalc(inv)
    db.commit()
    return inv


@router.delete("/invoices/{invoice_id}/items/{item_id}", response_model=InvoiceResponse)
def delete_invoice_item(organization_id: str, invoice_id: str, item_id: str, _=Depends(require_permission("invoices.update")), db: Session = Depends(get_db)):
    svc = InvoiceService(db)
    item = svc.invoices.get_item(item_id)
    item.deleted_at = datetime.now(UTC)
    inv = svc.invoices.get(organization_id, invoice_id)
    svc._recalc(inv)
    db.commit()
    return inv


@router.post("/credit-notes", response_model=CreditNoteResponse)
def create_credit_note(organization_id: str, payload: CreditNoteCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("credit_notes.create")), db: Session = Depends(get_db)):
    return CreditNoteService(db).create(organization_id, current_user.id, payload.model_dump())


@router.get("/credit-notes", response_model=CreditNoteListResponse)
def list_credit_notes(organization_id: str, _=Depends(require_permission("credit_notes.read")), db: Session = Depends(get_db)):
    return CreditNoteListResponse(items=CreditNoteService(db).credit_notes.list(organization_id))


@router.get("/credit-notes/{credit_note_id}", response_model=CreditNoteResponse)
def get_credit_note(organization_id: str, credit_note_id: str, _=Depends(require_permission("credit_notes.read")), db: Session = Depends(get_db)):
    return CreditNoteService(db).credit_notes.get(organization_id, credit_note_id)


@router.patch("/credit-notes/{credit_note_id}", response_model=CreditNoteResponse)
def update_credit_note(organization_id: str, credit_note_id: str, payload: CreditNoteUpdateRequest, _=Depends(require_permission("credit_notes.update")), db: Session = Depends(get_db)):
    note = CreditNoteService(db).credit_notes.get(organization_id, credit_note_id)
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(note, k, v)
    db.commit()
    return note


@router.delete("/credit-notes/{credit_note_id}")
def delete_credit_note(organization_id: str, credit_note_id: str, _=Depends(require_permission("credit_notes.update")), db: Session = Depends(get_db)):
    note = CreditNoteService(db).credit_notes.get(organization_id, credit_note_id)
    note.deleted_at = datetime.now(UTC)
    db.commit()
    return {"message": "deleted"}


@router.post("/credit-notes/{credit_note_id}/approve", response_model=CreditNoteResponse)
def approve_credit_note(organization_id: str, credit_note_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("credit_notes.update")), db: Session = Depends(get_db)):
    return CreditNoteService(db).approve(organization_id, credit_note_id, current_user.id)


@router.post("/credit-notes/{credit_note_id}/post", response_model=CreditNoteResponse)
def post_credit_note(organization_id: str, credit_note_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("credit_notes.post")), db: Session = Depends(get_db)):
    return CreditNoteService(db).post(organization_id, credit_note_id, current_user.id)


@router.post("/credit-notes/{credit_note_id}/apply", response_model=CreditNoteResponse)
def apply_credit_note(organization_id: str, credit_note_id: str, payload: CreditNoteApplyRequest, current_user=Depends(get_current_user), _=Depends(require_permission("credit_notes.apply")), db: Session = Depends(get_db)):
    inv = InvoiceService(db).invoices.get(organization_id, payload.invoice_id)
    return CreditNoteService(db).apply(organization_id, credit_note_id, current_user.id, inv, payload.amount)


@router.post("/credit-notes/{credit_note_id}/void", response_model=CreditNoteResponse)
def void_credit_note(organization_id: str, credit_note_id: str, _=Depends(require_permission("credit_notes.update")), db: Session = Depends(get_db)):
    note = CreditNoteService(db).credit_notes.get(organization_id, credit_note_id)
    from app.core.enums import CreditNoteStatus
    note.status = CreditNoteStatus.VOIDED
    db.commit()
    return note


@router.post("/customer-payments", response_model=CustomerPaymentResponse)
def create_payment(organization_id: str, payload: CustomerPaymentCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("customer_payments.create")), db: Session = Depends(get_db)):
    return CustomerPaymentService(db).create(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/customer-payments", response_model=CustomerPaymentListResponse)
def list_payments(organization_id: str, _=Depends(require_permission("customer_payments.read")), db: Session = Depends(get_db)):
    return CustomerPaymentListResponse(items=CustomerPaymentService(db).payments.list(organization_id))


@router.get("/customer-payments/{payment_id}", response_model=CustomerPaymentResponse)
def get_payment(organization_id: str, payment_id: str, _=Depends(require_permission("customer_payments.read")), db: Session = Depends(get_db)):
    return CustomerPaymentService(db).payments.get(organization_id, payment_id)


@router.patch("/customer-payments/{payment_id}", response_model=CustomerPaymentResponse)
def update_payment(organization_id: str, payment_id: str, payload: CustomerPaymentUpdateRequest, _=Depends(require_permission("customer_payments.create")), db: Session = Depends(get_db)):
    return CustomerPaymentService(db).update(organization_id, payment_id, payload.model_dump(exclude_none=True))


@router.delete("/customer-payments/{payment_id}")
def delete_payment(organization_id: str, payment_id: str, _=Depends(require_permission("customer_payments.create")), db: Session = Depends(get_db)):
    p = CustomerPaymentService(db).payments.get(organization_id, payment_id)
    p.deleted_at = datetime.now(UTC)
    db.commit()
    return {"message": "deleted"}


@router.post("/customer-payments/{payment_id}/post", response_model=CustomerPaymentResponse)
def post_payment(organization_id: str, payment_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("customer_payments.post")), db: Session = Depends(get_db)):
    return CustomerPaymentService(db).post(organization_id, payment_id, current_user.id)


@router.post("/customer-payments/{payment_id}/allocate", response_model=PaymentAllocationResponse)
def allocate_payment(organization_id: str, payment_id: str, payload: CustomerPaymentAllocateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("customer_payments.allocate")), db: Session = Depends(get_db)):
    return CustomerPaymentService(db).allocate(organization_id, payment_id, payload.invoice_id, payload.allocated_amount, payload.allocation_date, current_user.id)


@router.get("/accounts-receivable/open-items", response_model=list[AROpenItemResponse])
def ar_open_items(organization_id: str, _=Depends(require_permission("ar.read")), db: Session = Depends(get_db)):
    return ARQueryService(db).open_items(organization_id)


@router.get("/accounts-receivable/aging", response_model=ARAgingResponse)
def ar_aging(organization_id: str, as_of: date = Query(default_factory=date.today), _=Depends(require_permission("ar_aging.read")), db: Session = Depends(get_db)):
    return {"buckets": ARQueryService(db).aging(organization_id, as_of)}


@router.get("/accounts-receivable/customer-summary", response_model=list[ARCustomerSummaryResponse])
def ar_customer_summary(organization_id: str, _=Depends(require_permission("ar.read")), db: Session = Depends(get_db)):
    return ARQueryService(db).customer_summary(organization_id)
