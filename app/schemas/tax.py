from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

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
from app.schemas.common import ORMModel


class TaxSettingsUpdateRequest(BaseModel):
    tax_enabled: bool | None = None
    tax_registration_number: str | None = None
    tax_basis: TaxBasis | None = None
    prices_entered_are: PricesEnteredAre | None = None
    default_output_tax_account_id: UUID | None = None
    default_input_tax_account_id: UUID | None = None
    default_exempt_tax_code_id: UUID | None = None
    tax_rounding_method: TaxRoundingMethod | None = None
    tax_reporting_currency: str | None = None
    tax_periodicity: TaxPeriodicity | None = None
    tax_period_start_month: int | None = Field(default=None, ge=1, le=12)


class TaxSettingsResponse(ORMModel):
    id: UUID
    organization_id: UUID
    tax_enabled: bool
    tax_registration_number: str | None
    tax_basis: TaxBasis
    prices_entered_are: PricesEnteredAre
    default_output_tax_account_id: UUID | None
    default_input_tax_account_id: UUID | None
    default_exempt_tax_code_id: UUID | None
    tax_rounding_method: TaxRoundingMethod
    tax_reporting_currency: str | None
    tax_periodicity: TaxPeriodicity | None
    tax_period_start_month: int | None


class TaxRateCreateRequest(BaseModel):
    name: str
    code: str
    percentage: Decimal = Field(ge=0)
    tax_type: TaxType
    scope: TaxScope = TaxScope.BOTH
    effective_from: date | None = None
    effective_to: date | None = None
    report_group: str | None = None
    description: str | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.effective_from and self.effective_to and self.effective_to < self.effective_from:
            raise ValueError("effective_to cannot be before effective_from")
        return self


class TaxRateUpdateRequest(BaseModel):
    name: str | None = None
    percentage: Decimal | None = Field(default=None, ge=0)
    tax_type: TaxType | None = None
    scope: TaxScope | None = None
    is_active: bool | None = None
    effective_from: date | None = None
    effective_to: date | None = None
    report_group: str | None = None
    description: str | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.effective_from and self.effective_to and self.effective_to < self.effective_from:
            raise ValueError("effective_to cannot be before effective_from")
        return self


class TaxRateResponse(ORMModel):
    id: UUID
    organization_id: UUID
    name: str
    code: str
    percentage: Decimal
    tax_type: TaxType
    scope: TaxScope
    is_active: bool
    effective_from: date | None
    effective_to: date | None
    report_group: str | None
    description: str | None


class TaxRateListResponse(BaseModel):
    items: list[TaxRateResponse]


class TaxCodeComponentCreateRequest(BaseModel):
    tax_rate_id: UUID
    sequence_number: int = Field(ge=1)
    compound_on_previous: bool = False


class TaxCodeComponentResponse(ORMModel):
    id: UUID
    tax_rate_id: UUID
    sequence_number: int
    compound_on_previous: bool


class TaxCodeCreateRequest(BaseModel):
    name: str
    code: str
    description: str | None = None
    applies_to: TaxCodeAppliesTo = TaxCodeAppliesTo.BOTH
    calculation_method: TaxCalculationMethod
    price_inclusive_behavior: TaxPriceInclusiveBehavior = TaxPriceInclusiveBehavior.INHERIT_ORGANIZATION_DEFAULT
    report_group: str | None = None
    components: list[TaxCodeComponentCreateRequest] = Field(default_factory=list)


class TaxCodeUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    applies_to: TaxCodeAppliesTo | None = None
    calculation_method: TaxCalculationMethod | None = None
    price_inclusive_behavior: TaxPriceInclusiveBehavior | None = None
    report_group: str | None = None
    components: list[TaxCodeComponentCreateRequest] | None = None


class TaxCodeResponse(ORMModel):
    id: UUID
    organization_id: UUID
    name: str
    code: str
    description: str | None
    is_active: bool
    applies_to: TaxCodeAppliesTo
    calculation_method: TaxCalculationMethod
    price_inclusive_behavior: TaxPriceInclusiveBehavior
    report_group: str | None
    components: list[TaxCodeComponentResponse] = []


class TaxCodeListResponse(BaseModel):
    items: list[TaxCodeResponse]


class TaxCalculationPreviewLineRequest(BaseModel):
    description: str | None = None
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    discount_percent: Decimal | None = None
    discount_amount: Decimal | None = None
    tax_code_id: UUID | None = None
    price_mode: TaxPriceInclusiveBehavior = TaxPriceInclusiveBehavior.INHERIT_ORGANIZATION_DEFAULT
    usage: TaxCodeAppliesTo = TaxCodeAppliesTo.BOTH


class TaxCalculationPreviewRequest(BaseModel):
    lines: list[TaxCalculationPreviewLineRequest] = Field(min_length=1)


class TaxCalculationPreviewLineResponse(BaseModel):
    description: str | None = None
    quantity: Decimal
    unit_price: Decimal
    discount_percent: Decimal | None = None
    discount_amount: Decimal | None = None
    tax_code_id: UUID | None = None
    taxable_amount: Decimal
    tax_amount: Decimal
    gross_amount: Decimal
    effective_tax_rate: Decimal
    tax_breakdown: dict | None = None
    tax_inclusive: bool


class TaxCalculationPreviewResponse(BaseModel):
    lines: list[TaxCalculationPreviewLineResponse]
    subtotal_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    prices_entered_are: PricesEnteredAre
    tax_rounding_method: TaxRoundingMethod


class TaxTransactionResponse(ORMModel):
    id: UUID
    organization_id: UUID
    source_module: str
    source_type: str
    source_id: str
    source_line_id: str | None
    journal_entry_id: UUID | None
    transaction_date: date
    tax_code_id: UUID | None
    tax_rate_name_snapshot: str | None
    tax_rate_percentage_snapshot: Decimal | None
    report_group: str | None
    direction: TaxTransactionDirection
    net_amount: Decimal
    tax_amount: Decimal
    gross_amount: Decimal
    currency_code: str
    tax_account_id: UUID | None
    created_at: datetime


class TaxTransactionListResponse(BaseModel):
    items: list[TaxTransactionResponse]


class TaxSummaryLineResponse(BaseModel):
    tax_code_id: UUID | None = None
    tax_code: str | None = None
    tax_code_name: str | None = None
    tax_rate_name_snapshot: str | None = None
    tax_rate_percentage_snapshot: Decimal | None = None
    report_group: str | None = None
    direction: TaxTransactionDirection
    net_amount: Decimal
    tax_amount: Decimal
    gross_amount: Decimal


class TaxSummaryResponse(BaseModel):
    organization_id: UUID
    organization_name: str
    generated_at: datetime
    from_date: date
    to_date: date
    direction: TaxTransactionDirection | None = None
    tax_code_id: UUID | None = None
    report_group: str | None = None
    lines: list[TaxSummaryLineResponse]
    total_net_amount: Decimal
    total_tax_amount: Decimal
    total_gross_amount: Decimal


class TaxReportExportResponse(BaseModel):
    file_name: str
    export_format: str
    generated_at: datetime
