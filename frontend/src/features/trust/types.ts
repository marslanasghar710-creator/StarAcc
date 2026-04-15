export type TrustStatus = "healthy" | "attention_needed" | "degraded" | "unknown";

export type TrustDomainStatus = {
  domain: string;
  status: TrustStatus;
  label: string;
  description: string;
  last_evaluated_at: string;
  evidence?: Record<string, unknown> | null;
};

export type TrustSummary = {
  org_id: string;
  overall_status: TrustStatus;
  domains: TrustDomainStatus[];
  last_evaluated_at: string;
};

export type MetricProvenance = {
  metric_id: string;
  org_id: string;
  label: string;
  value_basis: {
    source_type: string;
    date_range?: Record<string, string> | null;
    entity_scope?: string[] | null;
    currency?: string | null;
  };
  underlying_counts: Record<string, number>;
  source_objects: Record<string, number>;
  journal_effects: Record<string, string | number>;
  context_filters: Record<string, unknown>;
  drill_targets: Array<{ target_type: string; label: string; route: string }>;
  generated_at: string;
};

export type IntegrityCenter = {
  trust_summary: TrustSummary;
  ledger_integrity: {
    status: TrustStatus;
    immutable_ledger_enforced: boolean;
    orphaned_postings_detected: boolean;
    unbalanced_journals_detected: boolean;
    invalid_posting_links_detected: boolean;
    evidence: Record<string, number>;
    checked_at: string;
  };
  reconciliation_status: Array<{
    bank_account_id?: string | null;
    status: TrustStatus;
    unreconciled_transaction_count: number;
    matched_transaction_count: number;
    last_reconciled_at?: string | null;
    stale_days?: number | null;
  }>;
  data_completeness: {
    status: TrustStatus;
    missing_elements: Array<{ code: string; label: string; severity: string; action_route?: string }>;
    checked_at: string;
  };
  recent_issues: Array<{
    severity: "low" | "medium" | "high";
    domain: string;
    code: string;
    title: string;
    description: string;
    affected_object_id?: string | null;
    recommended_action: string;
    action_route?: string | null;
  }>;
};
