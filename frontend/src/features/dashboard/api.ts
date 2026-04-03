import { apiClient } from "@/lib/api/client";

import type { DashboardOverview } from "@/features/dashboard/types";

type RawDashboardOverview = {
  maturity: string;
  summary_metrics: Array<{ key: string; label: string; value: number; currency_code?: string | null; delta?: number | null; route: string }>;
  attention_items: Array<{ key: string; title: string; detail: string; severity: string; route: string; count?: number | null; amount?: number | null; currency_code?: string | null }>;
  trends: Array<{ label: string; revenue: number; expenses: number; cash_movement: number }>;
  aging: Array<{ bucket: string; receivables: number; payables: number }>;
  workflows: Array<{ key: string; label: string; draft: number; in_progress: number; overdue: number; completed: number; route: string }>;
  recent_activity: Array<{ id: string; action: string; entity_type: string; entity_id?: string | null; created_at: string }>;
  recommendations: Array<{ key: string; title: string; description: string; route: string; priority: string }>;
};

function adaptOverview(raw: RawDashboardOverview): DashboardOverview {
  return {
    maturity: raw.maturity,
    summaryMetrics: raw.summary_metrics.map((metric) => ({
      key: metric.key,
      label: metric.label,
      value: metric.value,
      currencyCode: metric.currency_code ?? null,
      delta: metric.delta ?? null,
      route: metric.route,
    })),
    attentionItems: raw.attention_items.map((item) => ({
      key: item.key,
      title: item.title,
      detail: item.detail,
      severity: item.severity,
      route: item.route,
      count: item.count ?? null,
      amount: item.amount ?? null,
      currencyCode: item.currency_code ?? null,
    })),
    trends: raw.trends.map((point) => ({
      label: point.label,
      revenue: point.revenue,
      expenses: point.expenses,
      cashMovement: point.cash_movement,
    })),
    aging: raw.aging,
    workflows: raw.workflows.map((workflow) => ({
      key: workflow.key,
      label: workflow.label,
      draft: workflow.draft,
      inProgress: workflow.in_progress,
      overdue: workflow.overdue,
      completed: workflow.completed,
      route: workflow.route,
    })),
    recentActivity: raw.recent_activity.map((item) => ({
      id: item.id,
      action: item.action,
      entityType: item.entity_type,
      entityId: item.entity_id ?? null,
      createdAt: item.created_at,
    })),
    recommendations: raw.recommendations,
  };
}

export async function getDashboardOverview(organizationId: string) {
  const response = await apiClient<RawDashboardOverview>(`/organizations/${organizationId}/dashboard/overview`);
  return adaptOverview(response);
}
