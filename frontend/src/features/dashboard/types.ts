export type DashboardMetric = {
  key: string;
  label: string;
  value: number;
  currencyCode: string | null;
  delta: number | null;
  route: string;
};

export type DashboardAttentionItem = {
  key: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low" | string;
  route: string;
  count: number | null;
  amount: number | null;
  currencyCode: string | null;
};

export type DashboardTrendPoint = {
  label: string;
  revenue: number;
  expenses: number;
  cashMovement: number;
};

export type DashboardAgingBucket = {
  bucket: string;
  receivables: number;
  payables: number;
};

export type DashboardWorkflowStatus = {
  key: string;
  label: string;
  draft: number;
  inProgress: number;
  overdue: number;
  completed: number;
  route: string;
};

export type DashboardActivityItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
};

export type DashboardRecommendation = {
  key: string;
  title: string;
  description: string;
  route: string;
  priority: "high" | "medium" | "low" | string;
};

export type DashboardOverview = {
  maturity: "new" | "active" | "mature" | string;
  summaryMetrics: DashboardMetric[];
  attentionItems: DashboardAttentionItem[];
  trends: DashboardTrendPoint[];
  aging: DashboardAgingBucket[];
  workflows: DashboardWorkflowStatus[];
  recentActivity: DashboardActivityItem[];
  recommendations: DashboardRecommendation[];
};
