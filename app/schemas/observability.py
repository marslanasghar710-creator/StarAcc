from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

HealthStatus = Literal["healthy", "attention_needed", "degraded", "outage", "unknown"]
Severity = Literal["info", "low", "medium", "high", "critical"]
ObservabilityDomain = Literal[
    "api",
    "database",
    "jobs",
    "integrations",
    "ledger",
    "reporting",
    "reconciliation",
    "auth",
    "billing",
    "dashboard",
    "activation",
]
ErrorClass = Literal[
    "validation",
    "authorization",
    "not_found",
    "conflict",
    "rate_limit",
    "external_dependency",
    "data_integrity",
    "job_failure",
    "timeout",
    "unknown",
]


class TelemetryEnvelope(BaseModel):
    event_id: str
    occurred_at: str
    domain: ObservabilityDomain
    event_type: str
    severity: Severity
    environment: Literal["development", "staging", "production"] = "development"
    request_id: str | None = None
    trace_id: str | None = None
    session_id: str | None = None
    user_id: str | None = None
    org_id: str | None = None
    route: str | None = None
    service: str | None = None
    operation: str | None = None
    status: Literal["success", "failure", "partial", "timeout"] | None = None
    duration_ms: float | None = None
    error_code: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class ErrorRecord(BaseModel):
    error_id: str
    occurred_at: str
    domain: ObservabilityDomain
    error_class: ErrorClass
    error_code: str
    severity: Severity
    message: str
    request_id: str | None = None
    trace_id: str | None = None
    org_id: str | None = None
    user_id: str | None = None
    route: str | None = None
    operation: str | None = None
    retryable: bool = False
    resolved_at: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class PerformanceMetric(BaseModel):
    metric_id: str
    recorded_at: str
    domain: ObservabilityDomain
    operation: str
    duration_ms: float
    status: Literal["success", "failure", "partial"]
    org_id: str | None = None
    request_id: str | None = None
    trace_id: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class JobExecutionRecord(BaseModel):
    job_execution_id: str
    job_type: str
    domain: ObservabilityDomain
    org_id: str | None = None
    related_entity_id: str | None = None
    started_at: str
    finished_at: str | None = None
    status: Literal["queued", "running", "succeeded", "partial", "failed", "canceled"]
    attempts: int
    max_attempts: int | None = None
    duration_ms: float | None = None
    error_code: str | None = None
    error_class: ErrorClass | None = None
    summary: dict[str, object] = Field(default_factory=dict)


class ReconciliationAttention(BaseModel):
    status: HealthStatus
    unreconciled_count: int | None = None
    stale_days: int | None = None


class IntegrationAttention(BaseModel):
    status: HealthStatus
    failing_integrations_count: int
    last_sync_issue_at: str | None = None


class TrustAttention(BaseModel):
    status: HealthStatus
    open_integrity_issues_count: int


class RecentErrorSummary(BaseModel):
    status: HealthStatus
    error_count_24h: int
    high_severity_count_24h: int


class ActivitySummary(BaseModel):
    last_active_at: str | None = None
    invoices_30d: int
    bills_30d: int
    reports_30d: int = 0
    audit_events_7d: int = 0


class CommercialSummary(BaseModel):
    plan_code: str | None = None
    billing_interval: str | None = None
    features_enabled: int = 0


class OrgHealthSnapshot(BaseModel):
    org_id: str
    overall_status: HealthStatus
    activation_status: Literal["not_started", "in_progress", "completed"]
    billing_status: Literal["trial", "active", "past_due", "canceled", "unknown"]
    commercial_summary: CommercialSummary = Field(default_factory=CommercialSummary)
    reconciliation_attention: ReconciliationAttention
    integration_attention: IntegrationAttention
    trust_attention: TrustAttention
    recent_error_summary: RecentErrorSummary
    activity_summary: ActivitySummary
    last_computed_at: str


class PlatformHealthDomainSummary(BaseModel):
    domain: ObservabilityDomain
    status: HealthStatus
    issue_count: int
    last_incident_at: str | None = None


class PlatformHealthSummary(BaseModel):
    overall_status: HealthStatus
    domains: list[PlatformHealthDomainSummary]
    generated_at: str


class AttentionQueueItem(BaseModel):
    item_id: str
    type: Literal[
        "org_error_risk",
        "integration_failure",
        "stale_reconciliation",
        "activation_stalled",
        "billing_past_due",
        "job_failure",
        "integrity_issue",
    ]
    severity: Severity
    org_id: str | None = None
    title: str
    description: str
    action_route: str | None = None
    created_at: str


class QueryPerformanceRecord(BaseModel):
    recorded_at: str
    query_name: str
    domain: ObservabilityDomain
    duration_ms: float
    status: Literal["success", "failure"]
    row_count: int | None = None
    org_id: str | None = None
    request_id: str | None = None


class AlertCandidate(BaseModel):
    alert_id: str
    domain: ObservabilityDomain
    severity: Severity
    condition: str
    triggered_at: str
    metadata: dict[str, object] = Field(default_factory=dict)


class TelemetryIngestRequest(BaseModel):
    event: TelemetryEnvelope


class TelemetryIngestResponse(BaseModel):
    accepted: bool
    event_id: str


class AdminOverviewResponse(BaseModel):
    platform_health: PlatformHealthSummary
    recent_errors: list[ErrorRecord]
    attention_queue: list[AttentionQueueItem]
    top_slow_operations: list[PerformanceMetric]
    alert_candidates: list[AlertCandidate]
