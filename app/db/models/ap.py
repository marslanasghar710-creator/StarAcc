import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import BillStatus, BillType, PaymentStatus, SupplierCreditStatus
from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPKMixin


class Supplier(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "suppliers"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    supplier_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tax_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    currency_code: Mapped[str | None] = mapped_column(String(3), nullable=True)
    payment_terms_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    is_system: Mapped[bool] = mapped_column(nullable=False, default=False)
    billing_address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    billing_address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    billing_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    billing_state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    billing_postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    billing_country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    remittance_address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remittance_address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remittance_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    remittance_state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    remittance_postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    remittance_country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Bill(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "bills"
    __table_args__ = (
        UniqueConstraint("organization_id", "bill_number", name="uq_bill_org_number"),
        CheckConstraint("amount_paid >= 0 AND amount_due >= 0", name="ck_bill_amounts_non_negative"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False, index=True)
    bill_number: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[BillStatus] = mapped_column(Enum(BillStatus, name="bill_status"), nullable=False, default=BillStatus.DRAFT)
    bill_type: Mapped[BillType] = mapped_column(Enum(BillType, name="bill_type"), nullable=False, default=BillType.STANDARD)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    exchange_rate: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    subtotal_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    amount_due: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    prices_entered_are: Mapped[str | None] = mapped_column(String(20), nullable=True)
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    supplier_invoice_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_module: Mapped[str | None] = mapped_column(String(50), nullable=True)
    posted_journal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("journal_entries.id"), nullable=True)
    voided_journal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("journal_entries.id"), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    voided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class BillItem(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "bill_items"
    __table_args__ = (
        UniqueConstraint("bill_id", "line_number", name="uq_bill_item_line"),
        CheckConstraint("quantity > 0", name="ck_bill_item_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_bill_item_unit_non_negative"),
    )

    bill_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bills.id"), nullable=False, index=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    item_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    discount_percent: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    discount_amount: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    tax_code_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    tracking_category_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    tax_breakdown_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    line_taxable_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    line_subtotal: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    line_tax_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    line_total: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    effective_tax_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    tax_inclusive_flag: Mapped[bool] = mapped_column(nullable=False, default=False)


class SupplierCredit(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "supplier_credits"
    __table_args__ = (UniqueConstraint("organization_id", "supplier_credit_number", name="uq_supplier_credit_org_number"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False, index=True)
    supplier_credit_number: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[SupplierCreditStatus] = mapped_column(Enum(SupplierCreditStatus, name="supplier_credit_status"), nullable=False, default=SupplierCreditStatus.DRAFT)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    exchange_rate: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    subtotal_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    unapplied_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    prices_entered_are: Mapped[str | None] = mapped_column(String(20), nullable=True)
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    related_bill_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("bills.id"), nullable=True)
    posted_journal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("journal_entries.id"), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SupplierCreditItem(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "supplier_credit_items"
    __table_args__ = (UniqueConstraint("supplier_credit_id", "line_number", name="uq_supplier_credit_item_line"),)

    supplier_credit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("supplier_credits.id"), nullable=False, index=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    tax_code_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    tax_breakdown_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    line_taxable_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    line_subtotal: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    line_tax_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    line_total: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    effective_tax_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    tax_inclusive_flag: Mapped[bool] = mapped_column(nullable=False, default=False)


class SupplierPayment(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "supplier_payments"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False, index=True)
    payment_number: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus, name="payment_status"), nullable=False, default=PaymentStatus.DRAFT)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    exchange_rate: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    unapplied_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    disbursement_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    posted_journal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("journal_entries.id"), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SupplierPaymentAllocation(Base, UUIDPKMixin):
    __tablename__ = "supplier_payment_allocations"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    supplier_payment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("supplier_payments.id"), nullable=False, index=True)
    bill_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("bills.id"), nullable=True)
    supplier_credit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("supplier_credits.id"), nullable=True)
    allocated_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    allocation_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
