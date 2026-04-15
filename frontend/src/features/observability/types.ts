export type HealthStatus = "healthy" | "attention_needed" | "degraded" | "outage" | "unknown";
export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type PlatformHealthSummary = {
  overall_status: HealthStatus;
  generated_at: string;
  domains: Array<{ domain: string; status: HealthStatus; issue_count: number; last_incident_at?: string | null }>;
};

export type ErrorRecord = {
  error_id: string;
  occurred_at: string;
  domain: string;
  error_class: string;
  error_code: string;
  severity: Severity;
  message: string;
  route?: string | null;
  operation?: string | null;
  retryable: boolean;
};

export type JobExecutionRecord = {
  job_execution_id: string;
  job_type: string;
  status: "queued" | "running" | "succeeded" | "partial" | "failed" | "canceled";
  started_at: string;
  finished_at?: string | null;
  duration_ms?: number | null;
  error_code?: string | null;
  summary: Record<string, unknown>;
};

export type PerformanceMetric = {
  metric_id: string;
  recorded_at: string;
  domain: string;
  operation: string;
  duration_ms: number;
  status: "success" | "failure" | "partial";
};

export type OrgHealthSnapshot = {
  org_id: string;
  overall_status: HealthStatus;
  activation_status: "not_started" | "in_progress" | "completed";
  billing_status: "trial" | "active" | "past_due" | "canceled" | "unknown";
  commercial_summary: { plan_code?: string | null; billing_interval?: string | null; features_enabled: number };
  reconciliation_attention: { status: HealthStatus; unreconciled_count?: number; stale_days?: number | null };
  integration_attention: { status: HealthStatus; failing_integrations_count: number; last_sync_issue_at?: string | null };
  trust_attention: { status: HealthStatus; open_integrity_issues_count: number };
  recent_error_summary: { status: HealthStatus; error_count_24h: number; high_severity_count_24h: number };
  activity_summary: { last_active_at?: string | null; invoices_30d: number; bills_30d: number; reports_30d?: number; audit_events_7d?: number };
  last_computed_at: string;
};

export type AttentionQueueItem = {
  item_id: string;
  type: string;
  severity: Severity;
  title: string;
  description: string;
  action_route?: string | null;
  org_id?: string | null;
  created_at: string;
};

export type AlertCandidate = {
  alert_id: string;
  domain: string;
  severity: Severity;
  condition: string;
  triggered_at: string;
};

export type AdminOverview = {
  platform_health: PlatformHealthSummary;
  recent_errors: ErrorRecord[];
  attention_queue: AttentionQueueItem[];
  top_slow_operations: PerformanceMetric[];
  alert_candidates: AlertCandidate[];
};
