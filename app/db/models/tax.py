import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import (
    PricesEnteredAre,
    TaxBasis,
    TaxCalculationMethod,
    TaxCodeAppliesTo,
    TaxPeriodicity,
    TaxPriceInclusiveBehavior,
    TaxRoundingMethod,
    TaxScope,
    TaxTransactionDirection,
    TaxType,
)
from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPKMixin


class TaxSettings(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "tax_settings"
    __table_args__ = (UniqueConstraint("organization_id", name="uq_tax_settings_org"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    tax_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tax_registration_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tax_basis: Mapped[TaxBasis] = mapped_column(Enum(TaxBasis, name="tax_basis"), nullable=False, default=TaxBasis.ACCRUAL)
    prices_entered_are: Mapped[PricesEnteredAre] = mapped_column(Enum(PricesEnteredAre, name="prices_entered_are"), nullable=False, default=PricesEnteredAre.EXCLUSIVE)
    default_output_tax_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    default_input_tax_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    default_exempt_tax_code_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tax_codes.id"), nullable=True)
    tax_rounding_method: Mapped[TaxRoundingMethod] = mapped_column(Enum(TaxRoundingMethod, name="tax_rounding_method"), nullable=False, default=TaxRoundingMethod.LINE)
    tax_reporting_currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    tax_periodicity: Mapped[TaxPeriodicity | None] = mapped_column(Enum(TaxPeriodicity, name="tax_periodicity"), nullable=True)
    tax_period_start_month: Mapped[int | None] = mapped_column(nullable=True)


class TaxRate(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "tax_rates"
    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_tax_rate_org_code"),
        CheckConstraint("percentage >= 0", name="ck_tax_rate_percentage_non_negative"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    percentage: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False, default=Decimal("0"))
    tax_type: Mapped[TaxType] = mapped_column(Enum(TaxType, name="tax_type"), nullable=False)
    scope: Mapped[TaxScope] = mapped_column(Enum(TaxScope, name="tax_scope"), nullable=False, default=TaxScope.BOTH)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    effective_from: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    report_group: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)


class TaxCode(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "tax_codes"
    __table_args__ = (UniqueConstraint("organization_id", "code", name="uq_tax_code_org_code"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    applies_to: Mapped[TaxCodeAppliesTo] = mapped_column(Enum(TaxCodeAppliesTo, name="tax_code_applies_to"), nullable=False, default=TaxCodeAppliesTo.BOTH)
    calculation_method: Mapped[TaxCalculationMethod] = mapped_column(Enum(TaxCalculationMethod, name="tax_calculation_method"), nullable=False)
    price_inclusive_behavior: Mapped[TaxPriceInclusiveBehavior] = mapped_column(Enum(TaxPriceInclusiveBehavior, name="tax_price_inclusive_behavior"), nullable=False, default=TaxPriceInclusiveBehavior.INHERIT_ORGANIZATION_DEFAULT)
    report_group: Mapped[str | None] = mapped_column(String(100), nullable=True)


class TaxCodeComponent(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "tax_code_components"
    __table_args__ = (
        UniqueConstraint("tax_code_id", "sequence_number", name="uq_tax_code_component_seq"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    tax_code_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tax_codes.id"), nullable=False, index=True)
    tax_rate_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tax_rates.id"), nullable=False)
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    compound_on_previous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class TaxTransaction(Base, UUIDPKMixin):
    __tablename__ = "tax_transactions"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    source_module: Mapped[str] = mapped_column(String(50), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    source_id: Mapped[str] = mapped_column(String(100), nullable=False)
    source_line_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    journal_entry_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("journal_entries.id"), nullable=True, index=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    tax_code_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tax_codes.id"), nullable=True, index=True)
    tax_rate_name_snapshot: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tax_rate_percentage_snapshot: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    report_group: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    direction: Mapped[TaxTransactionDirection] = mapped_column(Enum(TaxTransactionDirection, name="tax_transaction_direction"), nullable=False, index=True)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    tax_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    tax_breakdown_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
