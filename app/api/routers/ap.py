from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_permission
from app.core.enums import SupplierCreditStatus
from app.db.session import get_db
from app.schemas.ap import (
    APAgingResponse,
    APOpenItemResponse,
    APSupplierSummaryResponse,
    BillCreateRequest,
    BillItemCreateRequest,
    BillItemUpdateRequest,
    BillListResponse,
    BillResponse,
    BillUpdateRequest,
    BillVoidRequest,
    SupplierBalanceResponse,
    SupplierCreateRequest,
    SupplierCreditApplyRequest,
    SupplierUpdateRequest,
    SupplierCreditCreateRequest,
    SupplierCreditListResponse,
    SupplierCreditResponse,
    SupplierCreditUpdateRequest,
    SupplierListResponse,
    SupplierPaymentAllocateRequest,
    SupplierPaymentAllocationResponse,
    SupplierPaymentCreateRequest,
    SupplierPaymentListResponse,
    SupplierPaymentResponse,
    SupplierPaymentUpdateRequest,
    SupplierResponse,
)
from app.services.ap_query_service import APQueryService
from app.services.bill_service import BillService
from app.services.supplier_credit_service import SupplierCreditService
from app.services.supplier_payment_service import SupplierPaymentService
from app.services.supplier_service import SupplierService

router = APIRouter(prefix="/organizations/{organization_id}", tags=["accounts_payable"])


@router.post("/suppliers", response_model=SupplierResponse)
def create_supplier(organization_id: str, payload: SupplierCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("suppliers.create")), db: Session = Depends(get_db)):
    return SupplierService(db).create(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/suppliers", response_model=SupplierListResponse)
def list_suppliers(organization_id: str, _=Depends(require_permission("suppliers.read")), db: Session = Depends(get_db)):
    return SupplierListResponse(items=SupplierService(db).suppliers.list(organization_id))


@router.get("/suppliers/search", response_model=SupplierListResponse)
def search_suppliers(organization_id: str, q: str = Query(""), _=Depends(require_permission("suppliers.read")), db: Session = Depends(get_db)):
    return SupplierListResponse(items=SupplierService(db).suppliers.list(organization_id, q))


@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
def get_supplier(organization_id: str, supplier_id: str, _=Depends(require_permission("suppliers.read")), db: Session = Depends(get_db)):
    return SupplierService(db).suppliers.get(organization_id, supplier_id)


@router.patch("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier(organization_id: str, supplier_id: str, payload: SupplierUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("suppliers.update")), db: Session = Depends(get_db)):
    return SupplierService(db).update(organization_id, supplier_id, current_user.id, payload.model_dump(exclude_none=True))


@router.delete("/suppliers/{supplier_id}")
def archive_supplier(organization_id: str, supplier_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("suppliers.archive")), db: Session = Depends(get_db)):
    SupplierService(db).archive(organization_id, supplier_id, current_user.id)
    return {"message": "archived"}


@router.get("/suppliers/{supplier_id}/activity")
def supplier_activity(organization_id: str, supplier_id: str, _=Depends(require_permission("suppliers.read"))):
    return {"supplier_id": supplier_id, "organization_id": organization_id, "activity": []}


@router.get("/suppliers/{supplier_id}/balance", response_model=SupplierBalanceResponse)
def supplier_balance(organization_id: str, supplier_id: str, _=Depends(require_permission("ap.read")), db: Session = Depends(get_db)):
    return SupplierService(db).balance(organization_id, supplier_id)


@router.post("/bills", response_model=BillResponse)
def create_bill(organization_id: str, payload: BillCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("bills.create")), db: Session = Depends(get_db)):
    return BillService(db).create(organization_id, current_user.id, payload.model_dump())


@router.get("/bills", response_model=BillListResponse)
def list_bills(organization_id: str, _=Depends(require_permission("bills.read")), db: Session = Depends(get_db)):
    return BillListResponse(items=BillService(db).bills.list(organization_id))


@router.get("/bills/search", response_model=BillListResponse)
def search_bills(organization_id: str, _=Depends(require_permission("bills.read")), db: Session = Depends(get_db)):
    return BillListResponse(items=BillService(db).bills.list(organization_id))


@router.get("/bills/open", response_model=BillListResponse)
def open_bills(organization_id: str, _=Depends(require_permission("bills.read")), db: Session = Depends(get_db)):
    return BillListResponse(items=[b for b in BillService(db).bills.list(organization_id) if b.amount_due > 0])


@router.get("/bills/overdue", response_model=BillListResponse)
def overdue_bills(organization_id: str, _=Depends(require_permission("bills.read")), db: Session = Depends(get_db)):
    today = date.today()
    return BillListResponse(items=[b for b in BillService(db).bills.list(organization_id) if b.amount_due > 0 and b.due_date < today])


@router.get("/bills/{bill_id}", response_model=BillResponse)
def get_bill(organization_id: str, bill_id: str, _=Depends(require_permission("bills.read")), db: Session = Depends(get_db)):
    return BillService(db).bills.get(organization_id, bill_id)


@router.patch("/bills/{bill_id}", response_model=BillResponse)
def update_bill(organization_id: str, bill_id: str, payload: BillUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("bills.update")), db: Session = Depends(get_db)):
    return BillService(db).update(organization_id, bill_id, current_user.id, payload.model_dump(exclude_none=True))


@router.delete("/bills/{bill_id}")
def delete_bill(organization_id: str, bill_id: str, _=Depends(require_permission("bills.update")), db: Session = Depends(get_db)):
    BillService(db).delete_draft(organization_id, bill_id)
    return {"message": "deleted"}


@router.post("/bills/{bill_id}/approve", response_model=BillResponse)
def approve_bill(organization_id: str, bill_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("bills.approve")), db: Session = Depends(get_db)):
    return BillService(db).approve(organization_id, bill_id, current_user.id)


@router.post("/bills/{bill_id}/post", response_model=BillResponse)
def post_bill(organization_id: str, bill_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("bills.post")), db: Session = Depends(get_db)):
    return BillService(db).post(organization_id, bill_id, current_user.id)


@router.post("/bills/{bill_id}/void", response_model=BillResponse)
def void_bill(organization_id: str, bill_id: str, payload: BillVoidRequest, current_user=Depends(get_current_user), _=Depends(require_permission("bills.void")), db: Session = Depends(get_db)):
    _ = payload
    return BillService(db).void(organization_id, bill_id, current_user.id)


@router.post("/bills/{bill_id}/items", response_model=BillResponse)
def add_bill_item(organization_id: str, bill_id: str, payload: BillItemCreateRequest, _=Depends(require_permission("bills.update")), db: Session = Depends(get_db)):
    svc = BillService(db)
    svc.add_item(organization_id, bill_id, payload.model_dump())
    bill = svc.bills.get(organization_id, bill_id)
    svc._recalc(bill)
    db.commit()
    return bill


@router.patch("/bills/{bill_id}/items/{item_id}", response_model=BillResponse)
def update_bill_item(organization_id: str, bill_id: str, item_id: str, payload: BillItemUpdateRequest, _=Depends(require_permission("bills.update")), db: Session = Depends(get_db)):
    svc = BillService(db)
    item = svc.bills.get_item(item_id)
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    from app.services.bill_calculation_service import BillCalculationService

    subtotal, tax, total = BillCalculationService.calculate_line(item.quantity, item.unit_price, item.discount_percent, item.discount_amount, item.line_tax_amount)
    item.line_subtotal = subtotal
    item.line_tax_amount = tax
    item.line_total = total
    bill = svc.bills.get(organization_id, bill_id)
    svc._recalc(bill)
    db.commit()
    return bill


@router.delete("/bills/{bill_id}/items/{item_id}", response_model=BillResponse)
def delete_bill_item(organization_id: str, bill_id: str, item_id: str, _=Depends(require_permission("bills.update")), db: Session = Depends(get_db)):
    svc = BillService(db)
    item = svc.bills.get_item(item_id)
    item.deleted_at = datetime.now(UTC)
    bill = svc.bills.get(organization_id, bill_id)
    svc._recalc(bill)
    db.commit()
    return bill


@router.post("/supplier-credits", response_model=SupplierCreditResponse)
def create_supplier_credit(organization_id: str, payload: SupplierCreditCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("supplier_credits.create")), db: Session = Depends(get_db)):
    return SupplierCreditService(db).create(organization_id, current_user.id, payload.model_dump())


@router.get("/supplier-credits", response_model=SupplierCreditListResponse)
def list_supplier_credits(organization_id: str, _=Depends(require_permission("supplier_credits.read")), db: Session = Depends(get_db)):
    return SupplierCreditListResponse(items=SupplierCreditService(db).supplier_credits.list(organization_id))


@router.get("/supplier-credits/{supplier_credit_id}", response_model=SupplierCreditResponse)
def get_supplier_credit(organization_id: str, supplier_credit_id: str, _=Depends(require_permission("supplier_credits.read")), db: Session = Depends(get_db)):
    return SupplierCreditService(db).supplier_credits.get(organization_id, supplier_credit_id)


@router.patch("/supplier-credits/{supplier_credit_id}", response_model=SupplierCreditResponse)
def update_supplier_credit(organization_id: str, supplier_credit_id: str, payload: SupplierCreditUpdateRequest, _=Depends(require_permission("supplier_credits.update")), db: Session = Depends(get_db)):
    credit = SupplierCreditService(db).supplier_credits.get(organization_id, supplier_credit_id)
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(credit, k, v)
    db.commit()
    return credit


@router.delete("/supplier-credits/{supplier_credit_id}")
def delete_supplier_credit(organization_id: str, supplier_credit_id: str, _=Depends(require_permission("supplier_credits.update")), db: Session = Depends(get_db)):
    credit = SupplierCreditService(db).supplier_credits.get(organization_id, supplier_credit_id)
    credit.deleted_at = datetime.now(UTC)
    db.commit()
    return {"message": "deleted"}


@router.post("/supplier-credits/{supplier_credit_id}/approve", response_model=SupplierCreditResponse)
def approve_supplier_credit(organization_id: str, supplier_credit_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("supplier_credits.update")), db: Session = Depends(get_db)):
    return SupplierCreditService(db).approve(organization_id, supplier_credit_id, current_user.id)


@router.post("/supplier-credits/{supplier_credit_id}/post", response_model=SupplierCreditResponse)
def post_supplier_credit(organization_id: str, supplier_credit_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("supplier_credits.post")), db: Session = Depends(get_db)):
    return SupplierCreditService(db).post(organization_id, supplier_credit_id, current_user.id)


@router.post("/supplier-credits/{supplier_credit_id}/apply", response_model=SupplierCreditResponse)
def apply_supplier_credit(organization_id: str, supplier_credit_id: str, payload: SupplierCreditApplyRequest, current_user=Depends(get_current_user), _=Depends(require_permission("supplier_credits.apply")), db: Session = Depends(get_db)):
    bill = BillService(db).bills.get(organization_id, payload.bill_id)
    return SupplierCreditService(db).apply(organization_id, supplier_credit_id, current_user.id, bill, payload.amount)


@router.post("/supplier-credits/{supplier_credit_id}/void", response_model=SupplierCreditResponse)
def void_supplier_credit(organization_id: str, supplier_credit_id: str, _=Depends(require_permission("supplier_credits.update")), db: Session = Depends(get_db)):
    credit = SupplierCreditService(db).supplier_credits.get(organization_id, supplier_credit_id)
    credit.status = SupplierCreditStatus.VOIDED
    db.commit()
    return credit


@router.post("/supplier-payments", response_model=SupplierPaymentResponse)
def create_supplier_payment(organization_id: str, payload: SupplierPaymentCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("supplier_payments.create")), db: Session = Depends(get_db)):
    return SupplierPaymentService(db).create(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/supplier-payments", response_model=SupplierPaymentListResponse)
def list_supplier_payments(organization_id: str, _=Depends(require_permission("supplier_payments.read")), db: Session = Depends(get_db)):
    return SupplierPaymentListResponse(items=SupplierPaymentService(db).payments.list(organization_id))


@router.get("/supplier-payments/{payment_id}", response_model=SupplierPaymentResponse)
def get_supplier_payment(organization_id: str, payment_id: str, _=Depends(require_permission("supplier_payments.read")), db: Session = Depends(get_db)):
    return SupplierPaymentService(db).payments.get(organization_id, payment_id)


@router.patch("/supplier-payments/{payment_id}", response_model=SupplierPaymentResponse)
def update_supplier_payment(organization_id: str, payment_id: str, payload: SupplierPaymentUpdateRequest, _=Depends(require_permission("supplier_payments.create")), db: Session = Depends(get_db)):
    return SupplierPaymentService(db).update(organization_id, payment_id, payload.model_dump(exclude_none=True))


@router.delete("/supplier-payments/{payment_id}")
def delete_supplier_payment(organization_id: str, payment_id: str, _=Depends(require_permission("supplier_payments.create")), db: Session = Depends(get_db)):
    payment = SupplierPaymentService(db).payments.get(organization_id, payment_id)
    payment.deleted_at = datetime.now(UTC)
    db.commit()
    return {"message": "deleted"}


@router.post("/supplier-payments/{payment_id}/post", response_model=SupplierPaymentResponse)
def post_supplier_payment(organization_id: str, payment_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("supplier_payments.post")), db: Session = Depends(get_db)):
    return SupplierPaymentService(db).post(organization_id, payment_id, current_user.id)


@router.post("/supplier-payments/{payment_id}/allocate", response_model=SupplierPaymentAllocationResponse)
def allocate_supplier_payment(organization_id: str, payment_id: str, payload: SupplierPaymentAllocateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("supplier_payments.allocate")), db: Session = Depends(get_db)):
    return SupplierPaymentService(db).allocate(organization_id, payment_id, payload.bill_id, payload.allocated_amount, payload.allocation_date, current_user.id)


@router.get("/accounts-payable/open-items", response_model=list[APOpenItemResponse])
def ap_open_items(organization_id: str, _=Depends(require_permission("ap.read")), db: Session = Depends(get_db)):
    return APQueryService(db).open_items(organization_id)


@router.get("/accounts-payable/aging", response_model=APAgingResponse)
def ap_aging(organization_id: str, as_of: date = Query(default_factory=date.today), _=Depends(require_permission("ap_aging.read")), db: Session = Depends(get_db)):
    return {"buckets": APQueryService(db).aging(organization_id, as_of)}


@router.get("/accounts-payable/supplier-summary", response_model=list[APSupplierSummaryResponse])
def ap_supplier_summary(organization_id: str, _=Depends(require_permission("ap.read")), db: Session = Depends(get_db)):
    return APQueryService(db).supplier_summary(organization_id)
