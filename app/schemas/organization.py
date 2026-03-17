from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import OrganizationStatus
from app.schemas.common import ORMModel


class OrganizationCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    legal_name: str | None = None
    registration_number: str | None = None
    tax_number: str | None = None
    base_currency: str = Field(default="USD", min_length=3, max_length=3)
    fiscal_year_start_month: int = Field(default=1, ge=1, le=12)
    fiscal_year_start_day: int = Field(default=1, ge=1, le=31)
    timezone: str = "UTC"


class OrganizationUpdateRequest(BaseModel):
    name: str | None = None
    legal_name: str | None = None
    registration_number: str | None = None
    tax_number: str | None = None
    base_currency: str | None = Field(default=None, min_length=3, max_length=3)
    fiscal_year_start_month: int | None = Field(default=None, ge=1, le=12)
    fiscal_year_start_day: int | None = Field(default=None, ge=1, le=31)
    timezone: str | None = None
    status: OrganizationStatus | None = None


class OrganizationResponse(ORMModel):
    id: UUID
    name: str
    legal_name: str | None
    registration_number: str | None
    tax_number: str | None
    base_currency: str
    fiscal_year_start_month: int
    fiscal_year_start_day: int
    timezone: str
    status: OrganizationStatus
    created_at: datetime
    updated_at: datetime


class OrganizationSettingsResponse(ORMModel):
    id: UUID
    organization_id: UUID
    default_locale: str
    date_format: str
    number_format: str
    invoice_prefix: str
    bill_prefix: str
    journal_prefix: str
    tax_enabled: bool
    multi_currency_enabled: bool


class OrganizationSettingsUpdateRequest(BaseModel):
    default_locale: str | None = None
    date_format: str | None = None
    number_format: str | None = None
    invoice_prefix: str | None = None
    bill_prefix: str | None = None
    journal_prefix: str | None = None
    tax_enabled: bool | None = None
    multi_currency_enabled: bool | None = None
