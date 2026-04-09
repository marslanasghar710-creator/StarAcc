from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

TrustStatus = Literal["healthy", "attention_needed", "degraded", "unknown"]
TrustDomain = Literal[
    "ledger_integrity",
    "reconciliation",
    "reporting_consistency",
    "audit_traceability",
    "data_completeness",
    "system_operations",
]


class TrustDomainStatus(BaseModel):
    domain: TrustDomain
    status: TrustStatus
    label: str
    description: str
    last_evaluated_at: datetime
    evidence: dict[str, object] | None = None


class TrustSummary(BaseModel):
    org_id: str
    overall_status: TrustStatus
    domains: list[TrustDomainStatus]
    last_evaluated_at: datetime


class MetricValueBasis(BaseModel):
    source_type: Literal["journal_postings", "documents", "aggregated_view", "mixed"]
    date_range: dict[str, str] | None = None
    entity_scope: list[str] | None = None
    currency: str | None = None


class DrillTarget(BaseModel):
    target_type: Literal["report", "journal_list", "invoice_list", "bill_list", "reconciliation_view"]
    label: str
    route: str


class MetricProvenance(BaseModel):
    metric_id: str
    org_id: str
    label: str
    value_basis: MetricValueBasis
    underlying_counts: dict[str, int] = Field(default_factory=dict)
    drill_targets: list[DrillTarget] = Field(default_factory=list)
    generated_at: datetime


class AuditTraceObject(BaseModel):
    object_type: Literal["invoice", "bill", "payment", "bank_transaction", "journal", "posting", "report_row"]
    object_id: str
    label: str
    route: str


class AuditTraceLink(BaseModel):
    source_type: Literal["invoice", "bill", "bank_transaction", "journal", "report_metric"]
    source_id: str
    related_objects: list[AuditTraceObject]
    generated_at: datetime


class LedgerIntegrityStatus(BaseModel):
    org_id: str
    status: TrustStatus
    immutable_ledger_enforced: bool
    orphaned_postings_detected: bool
    unbalanced_journals_detected: bool
    invalid_posting_links_detected: bool
    evidence: dict[str, int]
    checked_at: datetime


class ReconciliationTrustStatus(BaseModel):
    org_id: str
    bank_account_id: str | None = None
    status: TrustStatus
    unreconciled_transaction_count: int
    matched_transaction_count: int
    last_reconciled_at: datetime | None = None
    stale_days: int | None = None
    evidence: dict[str, object] | None = None


class ReportTrustMetadata(BaseModel):
    report_id: str
    org_id: str
    generated_at: datetime
    report_basis: dict[str, object]
    consistency_status: TrustStatus
    notes: list[str]


class DataCompletenessStatus(BaseModel):
    org_id: str
    status: TrustStatus
    missing_elements: list[dict[str, str]]
    checked_at: datetime


class IntegrityCenterResponse(BaseModel):
    trust_summary: TrustSummary
    ledger_integrity: LedgerIntegrityStatus
    reconciliation_status: list[ReconciliationTrustStatus]
    data_completeness: DataCompletenessStatus
    recent_issues: list[dict[str, object]]
