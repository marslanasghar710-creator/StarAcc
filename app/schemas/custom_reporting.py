from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.enums import ReportExportFormat, ReportRunStatus
from app.schemas.common import ORMModel

FieldDataType = Literal["string", "number", "date", "datetime", "boolean", "enum", "uuid"]
FieldKind = Literal["dimension", "metric"]
FilterOperator = Literal["eq", "neq", "contains", "starts_with", "gt", "gte", "lt", "lte", "between", "in", "is_null", "not_null"]
SortDirection = Literal["asc", "desc"]
ReportVisibility = Literal["private", "organization"]


class CustomReportFieldOptionResponse(BaseModel):
    value: str
    label: str


class CustomReportFieldResponse(BaseModel):
    key: str
    label: str
    description: str | None = None
    data_type: FieldDataType
    kind: FieldKind
    filter_operators: list[FilterOperator]
    sortable: bool = True
    groupable: bool = True
    aggregations: list[str] = []
    options: list[CustomReportFieldOptionResponse] = []


class CustomReportDatasetSummaryResponse(BaseModel):
    id: str
    key: str
    name: str
    description: str | None = None
    required_permissions: list[str]
    default_columns: list[str]


class CustomReportDatasetResponse(CustomReportDatasetSummaryResponse):
    fields: list[CustomReportFieldResponse]
    supported_filters: list[CustomReportFieldResponse]
    supported_groupings: list[CustomReportFieldResponse]


class CustomReportFilterInput(BaseModel):
    field: str
    operator: FilterOperator
    value: Any | None = None
    value_to: Any | None = None

    @model_validator(mode="after")
    def validate_values(self):
        if self.operator in {"is_null", "not_null"}:
            return self
        if self.operator == "between":
            if self.value is None or self.value_to is None:
                raise ValueError("between filters require value and value_to")
            return self
        if self.operator == "in":
            if not isinstance(self.value, list) or not self.value:
                raise ValueError("in filters require a non-empty array value")
            return self
        if self.value is None:
            raise ValueError("filter value is required")
        return self


class CustomReportSortInput(BaseModel):
    field: str
    direction: SortDirection = "asc"


class CustomReportDefinitionBase(BaseModel):
    dataset_id: str
    columns: list[str] = Field(default_factory=list)
    filters: list[CustomReportFilterInput] = Field(default_factory=list)
    groupings: list[str] = Field(default_factory=list)
    sorting: list[CustomReportSortInput] = Field(default_factory=list)
    display_options: dict[str, Any] | None = None

    @field_validator("columns")
    @classmethod
    def validate_columns(cls, value: list[str]):
        normalized = [item.strip() for item in value if item and item.strip()]
        if not normalized:
            raise ValueError("at least one column is required")
        return normalized

    @field_validator("groupings")
    @classmethod
    def validate_groupings(cls, value: list[str]):
        return [item.strip() for item in value if item and item.strip()]


class CustomReportPreviewRequest(CustomReportDefinitionBase):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)


class CustomReportDefinitionCreate(CustomReportDefinitionBase):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)


class CustomReportDefinitionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    dataset_id: str | None = None
    columns: list[str] | None = None
    filters: list[CustomReportFilterInput] | None = None
    groupings: list[str] | None = None
    sorting: list[CustomReportSortInput] | None = None
    display_options: dict[str, Any] | None = None


class CustomReportExecutionMetadataResponse(BaseModel):
    execution_id: UUID | None = None
    status: ReportRunStatus
    executed_at: datetime
    completed_at: datetime | None = None
    requested_by_user_id: UUID | None = None
    requested_by_email: str | None = None
    report_definition_id: UUID | None = None


class CustomReportResultResponse(BaseModel):
    report_definition_id: UUID | None = None
    dataset: CustomReportDatasetSummaryResponse
    columns: list[CustomReportFieldResponse]
    filters: list[CustomReportFilterInput]
    filter_summary: list[str]
    groupings: list[CustomReportFieldResponse]
    sorting: list[CustomReportSortInput]
    rows: list[dict[str, Any]]
    totals: dict[str, Any] | None = None
    row_count: int
    page: int
    page_size: int
    total_pages: int
    validation_errors: list[str] = []
    execution: CustomReportExecutionMetadataResponse


class CustomReportDefinitionResponse(ORMModel):
    id: UUID
    organization_id: UUID
    name: str
    description: str | None = None
    dataset_id: str
    columns_json: list
    filters_json: list
    groupings_json: list
    sorting_json: list
    display_options_json: dict[str, Any] | None = None
    is_system_template: bool
    created_by_user_id: UUID | None = None
    created_by_email: str | None = None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None
    last_run_at: datetime | None = None
    last_run_status: ReportRunStatus | None = None
    last_run_by_user_id: UUID | None = None
    last_run_by_email: str | None = None
    visibility: ReportVisibility = "private"
    validation_errors: list[str] = []


class CustomReportDefinitionListResponse(BaseModel):
    items: list[CustomReportDefinitionResponse]


class CustomReportExecutionResponse(ORMModel):
    id: UUID
    organization_id: UUID
    report_definition_id: UUID | None = None
    dataset_id: str
    execution_status: ReportRunStatus
    requested_by_user_id: UUID | None = None
    filters_json: list
    groupings_json: list
    sorting_json: list
    columns_json: list
    totals_json: dict[str, Any] | None = None
    row_count: int | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class CustomReportExportRequest(CustomReportPreviewRequest):
    export_format: ReportExportFormat = ReportExportFormat.CSV
