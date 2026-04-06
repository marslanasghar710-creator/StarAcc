export type DrilldownTarget = {
  route: string;
  params?: Record<string, string | number | boolean | null> | null;
  label?: string | null;
};

export type WidgetEnvelope = {
  widgetKey: string;
  title: string;
  subtitle?: string | null;
  status: "ok" | "empty" | "warning" | "error" | "loading_unavailable" | string;
  priority?: "high" | "medium" | "low" | string | null;
  sizeHint?: "small" | "medium" | "large" | "wide" | string | null;
  applicable: boolean;
  hiddenReason?: string | null;
  requiredPermissions?: string[] | null;
  drilldownTarget?: DrilldownTarget | null;
  refreshedAt?: string | null;
  payload?: Record<string, unknown> | null;
  emptyState?: {
    kind: string;
    title: string;
    description?: string | null;
    primaryCta?: { label: string; route: string; params?: Record<string, string | number | boolean | null> | null } | null;
  } | null;
  warningState?: { code: string; title: string; description?: string | null } | null;
  errorState?: { code: string; title: string; description?: string | null; retryable?: boolean | null } | null;
};

export type DashboardPage = {
  organizationId: string;
  dashboardContext: {
    scopeType: string;
    scopeId: string;
    scopeLabel: string;
    periodLabel: string;
    maturityState: "new" | "active" | "mature" | string;
    roleProfile: "owner_admin" | "finance_operator" | "viewer" | "mixed" | string;
    isDemo: boolean;
  };
  summary: {
    generatedAt: string;
    currency: string;
    timezone: string;
  };
  widgets: WidgetEnvelope[];
};
