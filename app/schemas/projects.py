from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import ProjectStatus
from app.schemas.common import ORMModel


class ProjectCreateRequest(BaseModel):
    code: str | None = None
    name: str
    description: str | None = None
    customer_id: UUID | None = None
    owner_user_id: UUID | None = None
    status: ProjectStatus = ProjectStatus.DRAFT
    start_date: date | None = None
    end_date: date | None = None
    budget_revenue: Decimal | None = Field(default=None, ge=0)
    budget_cost: Decimal | None = Field(default=None, ge=0)
    budget_hours: Decimal | None = Field(default=None, ge=0)
    currency_code: str | None = None


class ProjectUpdateRequest(BaseModel):
    code: str | None = None
    name: str | None = None
    description: str | None = None
    customer_id: UUID | None = None
    owner_user_id: UUID | None = None
    status: ProjectStatus | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None


class ProjectBudgetRequest(BaseModel):
    budget_revenue: Decimal | None = Field(default=None, ge=0)
    budget_cost: Decimal | None = Field(default=None, ge=0)
    budget_hours: Decimal | None = Field(default=None, ge=0)
    currency_code: str | None = None


class ProjectResponse(ORMModel):
    id: UUID
    organization_id: UUID
    code: str | None
    name: str
    description: str | None
    customer_id: UUID | None
    owner_user_id: UUID | None
    status: ProjectStatus
    start_date: date | None
    end_date: date | None
    budget_revenue: Decimal | None
    budget_cost: Decimal | None
    budget_hours: Decimal | None
    currency_code: str | None
    is_active: bool
    archived_at: datetime | None


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]


class ProjectBudgetResponse(BaseModel):
    project_id: UUID
    budget_revenue: Decimal | None
    budget_cost: Decimal | None
    budget_hours: Decimal | None
    currency_code: str | None


class ProjectCostEntryResponse(ORMModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    source_entity_type: str
    source_entity_id: str
    source_line_id: str | None
    transaction_date: date
    description: str
    amount: Decimal
    currency_code: str
    account_id: UUID | None
    supplier_id: UUID | None
    reversal_of_entry_id: UUID | None
    created_at: datetime


class ProjectRevenueEntryResponse(ORMModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    source_entity_type: str
    source_entity_id: str
    source_line_id: str | None
    transaction_date: date
    description: str
    amount: Decimal
    currency_code: str
    account_id: UUID | None
    customer_id: UUID | None
    reversal_of_entry_id: UUID | None
    created_at: datetime


class ProjectCostEntryListResponse(BaseModel):
    items: list[ProjectCostEntryResponse]


class ProjectRevenueEntryListResponse(BaseModel):
    items: list[ProjectRevenueEntryResponse]


class ProjectTimeEntryCreateRequest(BaseModel):
    user_id: UUID
    entry_date: date
    hours: Decimal = Field(gt=0)
    description: str | None = None
    is_billable: bool = True
    cost_rate: Decimal | None = Field(default=None, ge=0)
    billing_rate: Decimal | None = Field(default=None, ge=0)


class ProjectTimeEntryUpdateRequest(BaseModel):
    entry_date: date | None = None
    hours: Decimal | None = Field(default=None, gt=0)
    description: str | None = None
    is_billable: bool | None = None
    cost_rate: Decimal | None = Field(default=None, ge=0)
    billing_rate: Decimal | None = Field(default=None, ge=0)


class ProjectTimeEntryResponse(ORMModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    user_id: UUID
    entry_date: date
    hours: Decimal
    description: str | None
    is_billable: bool
    cost_rate: Decimal | None
    billing_rate: Decimal | None


class ProjectTimeEntryListResponse(BaseModel):
    items: list[ProjectTimeEntryResponse]


class ProjectStatusHistoryResponse(ORMModel):
    id: UUID
    project_id: UUID
    from_status: ProjectStatus | None
    to_status: ProjectStatus
    changed_at: datetime
    changed_by_user_id: UUID | None
    notes: str | None


class ProjectProfitabilityResponse(BaseModel):
    project_id: UUID
    project_name: str
    status: ProjectStatus
    currency_code: str | None
    revenue_total: Decimal
    cost_total: Decimal
    time_cost_total: Decimal
    gross_margin: Decimal
    budget_revenue: Decimal | None
    budget_cost: Decimal | None
    budget_hours: Decimal | None
    actual_hours: Decimal
    revenue_variance: Decimal | None
    cost_variance: Decimal | None


class ProjectActivityItemResponse(BaseModel):
    activity_type: str
    transaction_date: date
    description: str
    amount: Decimal | None = None
    hours: Decimal | None = None
    source_entity_type: str | None = None
    source_entity_id: str | None = None


class ProjectActivityResponse(BaseModel):
    project_id: UUID
    items: list[ProjectActivityItemResponse]


class ProjectProfitabilityListResponse(BaseModel):
    items: list[ProjectProfitabilityResponse]
