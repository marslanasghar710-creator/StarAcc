from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import BillStatus, PaymentStatus, SupplierCreditStatus
from app.schemas.common import ORMModel


class SupplierCreateRequest(BaseModel):
    display_name: str
    legal_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    currency_code: str | None = None
    payment_terms_days: int | None = None
    notes: str | None = None


class SupplierUpdateRequest(BaseModel):
    display_name: str | None = None
    legal_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    currency_code: str | None = None
    payment_terms_days: int | None = None
    is_active: bool | None = None
    notes: str | None = None


class SupplierResponse(ORMModel):
    id: UUID
    organization_id: UUID
    display_name: str
    legal_name: str | None
    email: EmailStr | None
    phone: str | None
    currency_code: str | None
    payment_terms_days: int | None
    is_active: bool


class SupplierListResponse(BaseModel):
    items: list[SupplierResponse]


class SupplierBalanceResponse(BaseModel):
    supplier_id: UUID
    total_billed: Decimal
    total_paid: Decimal
    total_outstanding: Decimal


class BillItemCreateRequest(BaseModel):
    description: str
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    account_id: UUID
    item_code: str | None = None
    discount_percent: Decimal | None = None
    discount_amount: Decimal | None = None
    line_tax_amount: Decimal = Decimal("0")


class BillItemUpdateRequest(BaseModel):
    description: str | None = None
    quantity: Decimal | None = Field(default=None, gt=0)
    unit_price: Decimal | None = Field(default=None, ge=0)
    account_id: UUID | None = None
    discount_percent: Decimal | None = None
    discount_amount: Decimal | None = None
    line_tax_amount: Decimal | None = None


class BillItemResponse(ORMModel):
    id: UUID
    line_number: int
    description: str
    quantity: Decimal
    unit_price: Decimal
    account_id: UUID
    line_subtotal: Decimal
    line_tax_amount: Decimal
    line_total: Decimal


class BillCreateRequest(BaseModel):
    supplier_id: UUID
    issue_date: date
    due_date: date
    currency_code: str
    reference: str | None = None
    notes: str | None = None
    terms: str | None = None
    items: list[BillItemCreateRequest] = Field(default_factory=list)


class BillUpdateRequest(BaseModel):
    due_date: date | None = None
    reference: str | None = None
    notes: str | None = None
    terms: str | None = None


class BillVoidRequest(BaseModel):
    reason: str


class BillResponse(ORMModel):
    id: UUID
    organization_id: UUID
    supplier_id: UUID
    bill_number: str
    status: BillStatus
    issue_date: date
    due_date: date
    subtotal_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    amount_due: Decimal
    posted_journal_id: UUID | None


class BillListResponse(BaseModel):
    items: list[BillResponse]


class SupplierCreditItemCreateRequest(BaseModel):
    description: str
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    account_id: UUID
    line_tax_amount: Decimal = Decimal("0")


class SupplierCreditItemUpdateRequest(BaseModel):
    description: str | None = None
    quantity: Decimal | None = Field(default=None, gt=0)
    unit_price: Decimal | None = Field(default=None, ge=0)
    account_id: UUID | None = None
    line_tax_amount: Decimal | None = None


class SupplierCreditItemResponse(ORMModel):
    id: UUID
    line_number: int
    description: str
    quantity: Decimal
    unit_price: Decimal
    line_total: Decimal


class SupplierCreditCreateRequest(BaseModel):
    supplier_id: UUID
    issue_date: date
    currency_code: str
    related_bill_id: UUID | None = None
    reason: str | None = None
    items: list[SupplierCreditItemCreateRequest] = Field(default_factory=list)


class SupplierCreditUpdateRequest(BaseModel):
    reason: str | None = None


class SupplierCreditApplyRequest(BaseModel):
    bill_id: UUID
    amount: Decimal = Field(gt=0)


class SupplierCreditResponse(ORMModel):
    id: UUID
    organization_id: UUID
    supplier_id: UUID
    supplier_credit_number: str
    status: SupplierCreditStatus
    total_amount: Decimal
    unapplied_amount: Decimal
    posted_journal_id: UUID | None


class SupplierCreditListResponse(BaseModel):
    items: list[SupplierCreditResponse]


class SupplierPaymentCreateRequest(BaseModel):
    supplier_id: UUID
    payment_date: date
    currency_code: str
    amount: Decimal = Field(gt=0)
    disbursement_account_id: UUID | None = None
    payment_method: str | None = None
    reference: str | None = None


class SupplierPaymentUpdateRequest(BaseModel):
    payment_method: str | None = None
    reference: str | None = None
    notes: str | None = None


class SupplierPaymentAllocateRequest(BaseModel):
    bill_id: UUID
    allocated_amount: Decimal = Field(gt=0)
    allocation_date: date


class SupplierPaymentAllocationResponse(ORMModel):
    id: UUID
    supplier_payment_id: UUID
    bill_id: UUID | None
    allocated_amount: Decimal
    allocation_date: date


class SupplierPaymentResponse(ORMModel):
    id: UUID
    organization_id: UUID
    supplier_id: UUID
    payment_number: str
    status: PaymentStatus
    amount: Decimal
    unapplied_amount: Decimal
    posted_journal_id: UUID | None


class SupplierPaymentListResponse(BaseModel):
    items: list[SupplierPaymentResponse]


class APOpenItemResponse(BaseModel):
    document_id: UUID
    document_type: str
    supplier_id: UUID
    document_number: str
    issue_date: date
    due_date: date | None
    amount_due: Decimal


class APAgingBucketResponse(BaseModel):
    bucket: str
    amount: Decimal


class APAgingResponse(BaseModel):
    buckets: list[APAgingBucketResponse]


class APSupplierSummaryResponse(BaseModel):
    supplier_id: UUID
    supplier_name: str
    total_outstanding: Decimal
