from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import CreditNoteStatus, InvoiceStatus, PaymentStatus
from app.schemas.common import ORMModel


class CustomerCreateRequest(BaseModel):
    display_name: str
    legal_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    currency_code: str | None = None
    payment_terms_days: int | None = None
    notes: str | None = None


class CustomerUpdateRequest(BaseModel):
    display_name: str | None = None
    legal_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    currency_code: str | None = None
    payment_terms_days: int | None = None
    is_active: bool | None = None
    notes: str | None = None


class CustomerResponse(ORMModel):
    id: UUID
    organization_id: UUID
    display_name: str
    legal_name: str | None
    email: EmailStr | None
    phone: str | None
    currency_code: str | None
    payment_terms_days: int | None
    is_active: bool


class CustomerListResponse(BaseModel):
    items: list[CustomerResponse]


class CustomerBalanceResponse(BaseModel):
    customer_id: UUID
    total_invoiced: Decimal
    total_paid: Decimal
    total_outstanding: Decimal


class InvoiceItemCreateRequest(BaseModel):
    description: str
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    account_id: UUID
    item_code: str | None = None
    discount_percent: Decimal | None = None
    discount_amount: Decimal | None = None
    line_tax_amount: Decimal = Decimal("0")


class InvoiceItemUpdateRequest(BaseModel):
    description: str | None = None
    quantity: Decimal | None = Field(default=None, gt=0)
    unit_price: Decimal | None = Field(default=None, ge=0)
    account_id: UUID | None = None
    discount_percent: Decimal | None = None
    discount_amount: Decimal | None = None
    line_tax_amount: Decimal | None = None


class InvoiceItemResponse(ORMModel):
    id: UUID
    line_number: int
    description: str
    quantity: Decimal
    unit_price: Decimal
    account_id: UUID
    line_subtotal: Decimal
    line_tax_amount: Decimal
    line_total: Decimal


class InvoiceCreateRequest(BaseModel):
    customer_id: UUID
    issue_date: date
    due_date: date
    currency_code: str
    reference: str | None = None
    notes: str | None = None
    terms: str | None = None
    items: list[InvoiceItemCreateRequest] = Field(default_factory=list)


class InvoiceUpdateRequest(BaseModel):
    due_date: date | None = None
    reference: str | None = None
    notes: str | None = None
    terms: str | None = None


class InvoiceVoidRequest(BaseModel):
    reason: str


class InvoiceResponse(ORMModel):
    id: UUID
    organization_id: UUID
    customer_id: UUID
    invoice_number: str
    status: InvoiceStatus
    issue_date: date
    due_date: date
    subtotal_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    amount_due: Decimal
    posted_journal_id: UUID | None


class InvoiceListResponse(BaseModel):
    items: list[InvoiceResponse]


class CreditNoteItemCreateRequest(BaseModel):
    description: str
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    account_id: UUID
    line_tax_amount: Decimal = Decimal("0")


class CreditNoteItemUpdateRequest(BaseModel):
    description: str | None = None
    quantity: Decimal | None = Field(default=None, gt=0)
    unit_price: Decimal | None = Field(default=None, ge=0)
    account_id: UUID | None = None
    line_tax_amount: Decimal | None = None


class CreditNoteItemResponse(ORMModel):
    id: UUID
    line_number: int
    description: str
    quantity: Decimal
    unit_price: Decimal
    line_total: Decimal


class CreditNoteCreateRequest(BaseModel):
    customer_id: UUID
    issue_date: date
    currency_code: str
    related_invoice_id: UUID | None = None
    reason: str | None = None
    items: list[CreditNoteItemCreateRequest] = Field(default_factory=list)


class CreditNoteUpdateRequest(BaseModel):
    reason: str | None = None


class CreditNoteApplyRequest(BaseModel):
    invoice_id: UUID
    amount: Decimal = Field(gt=0)


class CreditNoteResponse(ORMModel):
    id: UUID
    organization_id: UUID
    customer_id: UUID
    credit_note_number: str
    status: CreditNoteStatus
    total_amount: Decimal
    unapplied_amount: Decimal
    posted_journal_id: UUID | None


class CreditNoteListResponse(BaseModel):
    items: list[CreditNoteResponse]


class CustomerPaymentCreateRequest(BaseModel):
    customer_id: UUID
    payment_date: date
    currency_code: str
    amount: Decimal = Field(gt=0)
    deposit_account_id: UUID | None = None
    payment_method: str | None = None
    reference: str | None = None


class CustomerPaymentUpdateRequest(BaseModel):
    payment_method: str | None = None
    reference: str | None = None
    notes: str | None = None


class CustomerPaymentAllocateRequest(BaseModel):
    invoice_id: UUID
    allocated_amount: Decimal = Field(gt=0)
    allocation_date: date


class PaymentAllocationResponse(ORMModel):
    id: UUID
    customer_payment_id: UUID
    invoice_id: UUID | None
    allocated_amount: Decimal
    allocation_date: date


class CustomerPaymentResponse(ORMModel):
    id: UUID
    organization_id: UUID
    customer_id: UUID
    payment_number: str
    status: PaymentStatus
    amount: Decimal
    unapplied_amount: Decimal
    posted_journal_id: UUID | None


class CustomerPaymentListResponse(BaseModel):
    items: list[CustomerPaymentResponse]


class AROpenItemResponse(BaseModel):
    document_id: UUID
    document_type: str
    customer_id: UUID
    document_number: str
    issue_date: date
    due_date: date | None
    amount_due: Decimal


class ARAgingBucketResponse(BaseModel):
    bucket: str
    amount: Decimal


class ARAgingResponse(BaseModel):
    buckets: list[ARAgingBucketResponse]


class ARCustomerSummaryResponse(BaseModel):
    customer_id: UUID
    customer_name: str
    total_outstanding: Decimal
