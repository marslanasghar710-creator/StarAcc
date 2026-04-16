"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, ChevronRight, CircleCheck, Clock3, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardOverview } from "@/features/dashboard/hooks";
import { useTrustSummary } from "@/features/trust/hooks";
import { MetricProvenanceDrawer } from "@/components/trust/metric-provenance-drawer";
import type { WidgetEnvelope } from "@/features/dashboard/types";
import { formatDateTime, formatRelativeTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/providers/organization-provider";

function widgetByKey(widgets: WidgetEnvelope[], key: string) {
  return widgets.find((widget) => widget.widgetKey === key);
}

function statusTone(status: string) {
  if (status === "warning") return "secondary" as const;
  if (status === "error") return "danger" as const;
  return "outline" as const;
}

function priorityStyles(priority: string) {
  if (priority === "critical") return "border-rose-500/40 bg-rose-500/12 text-rose-700 dark:text-rose-200";
  if (priority === "high") return "border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-200";
  if (priority === "medium") return "border-sky-500/40 bg-sky-500/12 text-sky-700 dark:text-sky-200";
  return "border-border/70 bg-muted text-muted-foreground";
}

function amountToNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

type TrendPoint = {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
  net: number;
};

function parseTrendPeriods(periods: Array<Record<string, unknown>>): TrendPoint[] {
  return periods.map((period) => ({
    key: String(period.periodKey ?? period.label ?? ""),
    label: String(period.label ?? ""),
    revenue: amountToNumber((period.revenue as Record<string, unknown> | undefined)?.amount),
    expenses: amountToNumber((period.expenses as Record<string, unknown> | undefined)?.amount),
    net: amountToNumber((period.netResult as Record<string, unknown> | undefined)?.amount),
  }));
}

function TrendMiniChart({ periods }: { periods: TrendPoint[] }) {
  if (periods.length < 2) return null;

  const maxValue = Math.max(1, ...periods.flatMap((period) => [period.revenue, period.expenses]));
  const width = 100;
  const height = 64;
  const stepX = width / (periods.length - 1);
  const toY = (value: number) => (height - 8) - ((value / maxValue) * (height - 14));

  const revenuePath = periods
    .map((period, idx) => `${idx === 0 ? "M" : "L"} ${Math.round(stepX * idx)} ${toY(period.revenue).toFixed(2)}`)
    .join(" ");
  const expensesPath = periods
    .map((period, idx) => `${idx === 0 ? "M" : "L"} ${Math.round(stepX * idx)} ${toY(period.expenses).toFixed(2)}`)
    .join(" ");
  const revenueArea = `${revenuePath} L ${width} ${height - 6} L 0 ${height - 6} Z`;
  const expenseArea = `${expensesPath} L ${width} ${height - 6} L 0 ${height - 6} Z`;
  const gridY = [0.25, 0.5, 0.75].map((ratio) => Number((height - 8) - ((height - 14) * ratio)).toFixed(2));
  const peakIndex = periods.reduce((maxIdx, period, idx, arr) => (period.revenue > arr[maxIdx].revenue ? idx : maxIdx), 0);

  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-muted/35 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] dark:from-muted/35 dark:to-background/20 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{periods[0]?.label}</span>
        <div className="inline-flex items-center gap-3 font-medium">
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-600 dark:bg-emerald-400" /> Revenue</span>
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-amber-600 dark:bg-amber-400" /> Expenses</span>
        </div>
        <span>{periods[periods.length - 1]?.label}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" preserveAspectRatio="none" role="img" aria-label="Revenue and expenses trend lines">
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" className="text-emerald-600 dark:text-emerald-400" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.03" className="text-emerald-600 dark:text-emerald-400" />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.26" className="text-amber-600 dark:text-amber-400" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" className="text-amber-600 dark:text-amber-400" />
          </linearGradient>
        </defs>
        {gridY.map((y, idx) => (
          <path key={`grid-${idx}`} d={`M 0 ${y} L ${width} ${y}`} stroke="currentColor" className="text-border/30" strokeWidth="0.6" strokeDasharray="2 3" />
        ))}
        <path d={expenseArea} fill="url(#expenseGradient)" />
        <path d={revenueArea} fill="url(#revenueGradient)" />
        <path d={revenuePath} fill="none" stroke="currentColor" className="text-emerald-600 dark:text-emerald-400" strokeWidth="2.8" />
        <path d={expensesPath} fill="none" stroke="currentColor" className="text-amber-600 dark:text-amber-400" strokeWidth="2.6" strokeDasharray="4 2" />
        <circle cx={Math.round(stepX * peakIndex)} cy={toY(periods[peakIndex].revenue)} r="1.4" className="fill-emerald-600 dark:fill-emerald-400" />
      </svg>
    </div>
  );
}

function AgingDistributionMiniChart({ buckets }: { buckets: ReturnType<typeof summarizeRisk>["normalized"] }) {
  if (buckets.length === 0) return null;

  const maxCombined = Math.max(1, ...buckets.map((bucket) => bucket.receivables + bucket.payables));

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/30 p-3">
      {buckets.map((bucket) => {
        const combined = bucket.receivables + bucket.payables;
        const widthPercent = (combined / maxCombined) * 100;
        const arShare = combined > 0 ? (bucket.receivables / combined) * 100 : 50;
        return (
          <div key={`aging-chart-${bucket.key}`} className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground">{bucket.label}</span>
              <span className="text-muted-foreground">{combined.toLocaleString()}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted/80">
              <div className="flex h-full overflow-hidden rounded-full" style={{ width: `${Math.max(widthPercent, combined > 0 ? 12 : 0)}%` }}>
                <div className="h-full bg-emerald-500/80" style={{ width: `${arShare}%` }} title="Receivables share" />
                <div className="h-full bg-amber-500/80" style={{ width: `${100 - arShare}%` }} title="Payables share" />
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500/80" /> Receivables</span>
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-amber-500/80" /> Payables</span>
      </div>
    </div>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, idx) => <div key={`position-${idx}`} className="h-32 animate-pulse rounded-xl bg-muted/40" />)}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, idx) => <div key={`performance-${idx}`} className="h-32 animate-pulse rounded-xl bg-muted/40" />)}</div>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="h-72 animate-pulse rounded-xl bg-muted/40 xl:col-span-5" />
        <div className="h-72 animate-pulse rounded-xl bg-muted/40 xl:col-span-7" />
      </div>
    </div>
  );
}

function SummaryCard({
  widget,
  currency,
  emphasis,
  performanceWidget,
  organizationId,
}: {
  widget: WidgetEnvelope;
  currency: string;
  emphasis?: "strong" | "normal";
  performanceWidget?: boolean;
  organizationId?: string;
}) {
  const payload = widget.payload ?? {};
  const money = ((payload.totalCashBalance as { amount?: string } | undefined)?.amount
    ?? (payload.totalOutstanding as { amount?: string } | undefined)?.amount
    ?? (payload.netResult as { amount?: string } | undefined)?.amount
    ?? (payload.amount as { amount?: string } | undefined)?.amount
    ?? "0");

  const deltaDirection = (payload.delta as { direction?: string } | undefined)?.direction;
  const deltaAmount = (payload.delta as { amount?: string } | undefined)?.amount;
  const valueIsZero = amountToNumber(money) === 0;

  let context = widget.subtitle ?? "Current reporting period";
  if (widget.widgetKey === "receivables_outstanding_summary") {
    const overdueAmount = amountToNumber(((payload.overdue as Record<string, unknown> | undefined)?.amount));
    const overdueCount = Number((payload.overdue as Record<string, unknown> | undefined)?.invoiceCount ?? 0);
    context = overdueAmount > 0 ? `${overdueCount} invoices overdue` : "No overdue invoices";
  }
  if (widget.widgetKey === "payables_outstanding_summary") {
    const overdueAmount = amountToNumber(((payload.overdue as Record<string, unknown> | undefined)?.amount));
    const overdueCount = Number((payload.overdue as Record<string, unknown> | undefined)?.billCount ?? 0);
    context = overdueAmount > 0 ? `${overdueCount} bills pending payment` : "No overdue bills";
  }
  if (widget.widgetKey === "cash_position_summary") {
    const deltaPercent = Number((payload.delta as Record<string, unknown> | undefined)?.percent ?? 0);
    if (Number.isFinite(deltaPercent) && deltaPercent !== 0) {
      context = `${deltaPercent > 0 ? "Up" : "Down"} ${Math.abs(deltaPercent).toFixed(1)}% vs last period`;
    } else if (deltaAmount) {
      context = `${deltaDirection === "down" ? "Down" : "Up"} vs last period`;
    }
  }
  if (performanceWidget && valueIsZero) {
    context = widget.widgetKey === "revenue_this_month_summary"
      ? "No activity yet this month • Create your first invoice to start tracking revenue."
      : "No activity yet this month";
  }

  return (
    <SectionCard
      title={widget.title}
      description={widget.subtitle ?? ""}
      className={cn(
        "h-full border-border/70 bg-gradient-to-b from-card to-muted/35 shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 dark:from-card dark:to-muted/20 dark:shadow-[0_14px_28px_rgba(2,6,23,0.38)]",
        emphasis === "strong" ? "ring-1 ring-primary/35 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_20%,transparent),0_20px_40px_rgba(15,23,42,0.12)] dark:shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_24%,transparent),0_24px_44px_rgba(2,6,23,0.45)]" : "",
        performanceWidget && valueIsZero ? "opacity-90" : "",
      )}
      actions=<div className="flex items-center gap-2">
      {organizationId ? <MetricProvenanceDrawer organizationId={organizationId} metricId={widget.widgetKey} triggerLabel="Why this number?" /> : null}
      {widget.drilldownTarget?.route ? (
        <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
          <Link href={widget.drilldownTarget.route}>{widget.drilldownTarget.label ?? "Detail"}<ChevronRight className="size-3.5" /></Link>
        </Button>
      ) : null}
      </div>
    >
      <div className="space-y-2">
        <MoneyDisplay value={money} currencyCode={currency} className={cn("font-semibold tracking-tight text-foreground", emphasis === "strong" ? "text-4xl" : "text-[1.72rem]")} />
        {deltaAmount ? (
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {deltaDirection === "down" ? <TrendingDown className="size-3 text-amber-600 dark:text-amber-400" /> : <TrendingUp className="size-3 text-emerald-600 dark:text-emerald-400" />}
            {deltaDirection === "down" ? "Down MTD" : "Up MTD"} <MoneyDisplay value={deltaAmount} currencyCode={currency} />
          </p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">{context}</p>
      </div>
    </SectionCard>
  );
}

function summarizeRisk(buckets: Array<Record<string, unknown>>) {
  const normalized = buckets.map((bucket) => ({
    label: String(bucket.label ?? ""),
    key: String(bucket.bucketKey ?? ""),
    receivables: amountToNumber((bucket.receivables as Record<string, unknown> | undefined)?.amount),
    payables: amountToNumber((bucket.payables as Record<string, unknown> | undefined)?.amount),
  }));

  const arPeak = normalized.reduce((max, current) => (current.receivables > max.receivables ? current : max), normalized[0] ?? { label: "Current", key: "current", receivables: 0, payables: 0 });
  const apPeak = normalized.reduce((max, current) => (current.payables > max.payables ? current : max), normalized[0] ?? { label: "Current", key: "current", receivables: 0, payables: 0 });

  const severity = (arPeak.key === "90_plus" || apPeak.key === "90_plus") ? "high" : "medium";
  return {
    arPeak,
    apPeak,
    severity,
    summary: `Receivables risk concentrated in ${arPeak.label} bucket · monitor collections closely. Payables pressure is highest in ${apPeak.label}.`,
    normalized,
  };
}

function prioritizedAttentionItems(items: Array<Record<string, unknown>>) {
  const severityScore = (priority: string) => {
    if (priority === "critical") return 4;
    if (priority === "high") return 3;
    if (priority === "medium") return 2;
    return 1;
  };

  return [...items].sort((a, b) => {
    const severity = severityScore(String(b.priority ?? "low")) - severityScore(String(a.priority ?? "low"));
    if (severity !== 0) return severity;

    const amountA = amountToNumber((a.impact as Record<string, unknown> | undefined)?.amount ?? (a.amount as Record<string, unknown> | undefined)?.amount);
    const amountB = amountToNumber((b.impact as Record<string, unknown> | undefined)?.amount ?? (b.amount as Record<string, unknown> | undefined)?.amount);
    if (amountB !== amountA) return amountB - amountA;

    const tsA = Date.parse(String(a.occurredAt ?? a.updatedAt ?? a.createdAt ?? ""));
    const tsB = Date.parse(String(b.occurredAt ?? b.updatedAt ?? b.createdAt ?? ""));
    return (Number.isFinite(tsB) ? tsB : 0) - (Number.isFinite(tsA) ? tsA : 0);
  });
}

function workflowGroups(statuses: Array<Record<string, unknown>>) {
  const groups = {
    needs_attention: { title: "Needs attention", keys: new Set(["overdue", "draft"]), count: 0, amount: 0 },
    in_progress: { title: "In progress", keys: new Set(["approved", "sent", "posted", "partially_paid"]), count: 0, amount: 0 },
    completed: { title: "Completed", keys: new Set(["paid"]), count: 0, amount: 0 },
  };

  for (const status of statuses) {
    const statusKey = String(status.status ?? "");
    const count = Number(status.count ?? 0);
    const amount = amountToNumber((status.amount as Record<string, unknown> | undefined)?.amount);

    if (groups.needs_attention.keys.has(statusKey)) {
      groups.needs_attention.count += count;
      groups.needs_attention.amount += amount;
    } else if (groups.in_progress.keys.has(statusKey)) {
      groups.in_progress.count += count;
      groups.in_progress.amount += amount;
    } else if (groups.completed.keys.has(statusKey)) {
      groups.completed.count += count;
      groups.completed.amount += amount;
    } else {
      groups.in_progress.count += count;
      groups.in_progress.amount += amount;
    }
  }

  return Object.values(groups);
}

function curatedActivity(items: Array<Record<string, unknown>>) {
  const actionLabels: Record<string, string> = {
    invoice_sent: "Invoice sent",
    invoice_paid: "Invoice paid",
    bill_approved: "Bill approved",
    supplier_payment_posted: "Supplier payment posted",
    bank_import_completed: "Bank import completed",
    journal_posted: "Journal posted",
    report_exported: "Report exported",
    payroll_completed: "Payroll completed",
    integration_sync_completed: "Integration sync completed",
    integration_sync_failed: "Integration sync failed",
  };

  const seen = new Set<string>();

  return items
    .map((item) => {
      const rawType = String(item.type ?? "").toLowerCase();
      const title = String(item.title ?? "Operational event");
      const readableType = rawType.replaceAll(".", "_");
      const label = actionLabels[readableType] ?? title;
      const entity = String(item.description ?? "").trim();
      const eventSummary = entity ? `${label} • ${entity}` : label;
      return {
        activityId: String(item.activityId ?? `${readableType}-${item.occurredAt ?? ""}`),
        occurredAt: String(item.occurredAt ?? ""),
        eventSummary,
      };
    })
    .filter((item) => {
      const key = String(item.eventSummary);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function buildActionList({
  recommendations,
  attentionItems,
  receivablesOverdueCount,
  payablesOverdueCount,
  reconciliationNeedsAttention,
  onboarding,
  integrations,
  billing,
}: {
  recommendations: Array<Record<string, unknown>>;
  attentionItems: Array<Record<string, unknown>>;
  receivablesOverdueCount: number;
  payablesOverdueCount: number;
  reconciliationNeedsAttention: boolean;
  onboarding?: WidgetEnvelope;
  integrations?: WidgetEnvelope;
  billing?: WidgetEnvelope;
}) {
  const attentionTitles = new Set(attentionItems.map((item) => String(item.title ?? "").toLowerCase()));
  const base = recommendations.filter((item) => !attentionTitles.has(String(item.title ?? "").toLowerCase()));

  if (receivablesOverdueCount > 0) {
    base.unshift({ id: "review_overdue_invoices", title: "Review overdue invoices", description: `${receivablesOverdueCount} overdue invoices require follow-up.`, cta: { route: "/invoices", label: "Open invoices" } });
  }

  if (payablesOverdueCount > 0) {
    base.push({ id: "clear_overdue_bills", title: "Review overdue bills", description: `${payablesOverdueCount} overdue bills need payment planning.`, cta: { route: "/bills", label: "Open bills" } });
  }

  if (onboarding?.applicable && onboarding.status !== "ok") {
    base.push({ id: "continue_setup", title: "Complete remaining setup", description: "Finish setup tasks to unlock stronger automation and controls.", cta: { route: "/setup", label: "Continue setup" } });
  }

  if (integrations?.status === "empty") {
    base.push({ id: "connect_integration", title: "Connect bank accounts", description: "Link bank feeds to improve reconciliation speed and cash visibility.", cta: { route: "/integrations", label: "Open integrations" } });
  }

  if (billing?.status === "empty") {
    base.push({ id: "configure_billing", title: "Set up billing profile", description: "Configure billing now to avoid subscription interruptions.", cta: { route: "/settings/billing", label: "Open billing" } });
  }

  if (reconciliationNeedsAttention) {
    base.push({ id: "reconcile_gaps", title: "Resolve reconciliation gaps", description: "Address unmatched transactions to improve trust status.", cta: { route: "/banking/reconciliations", label: "Open reconciliation" } });
  }

  if (base.length < 3) {
    base.push(
      { id: "month_end", title: "Run month-end reports", description: "Review P&L and balance sheet before period close.", cta: { route: "/reports", label: "Open reports" } },
      { id: "review_payments", title: "Schedule supplier payments", description: "Plan payable releases to stabilize upcoming cash flow.", cta: { route: "/bills", label: "Open bills" } },
      { id: "reconcile", title: "Reconcile imported bank transactions", description: "Keep cash position accurate by clearing unreconciled transactions.", cta: { route: "/banking/reconciliations", label: "Open reconciliation" } },
    );
  }

  const deduped: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();

  for (const item of base) {
    const ctaRoute = String((item.cta as Record<string, unknown> | undefined)?.route ?? "");
    const identity = `${String(item.id ?? "")}:${String(item.title ?? "")}:${ctaRoute}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    deduped.push(item);
  }

  return deduped.slice(0, 5);
}

export default function DashboardPage() {
  const { currentOrganization, currentOrganizationId } = useOrganization();
  const dashboardQuery = useDashboardOverview(currentOrganizationId ?? undefined, Boolean(currentOrganizationId));
  const trustSummaryQuery = useTrustSummary(currentOrganizationId ?? undefined);

  if (!currentOrganization) {
    return <ErrorState title="No organization selected" description="Switch to an organization to load dashboard state." />;
  }

  if (dashboardQuery.isError) {
    return <ErrorState title="Dashboard unavailable" description="We couldn't load your dashboard overview." onRetry={() => void dashboardQuery.refetch()} />;
  }

  const data = dashboardQuery.data;

  if (dashboardQuery.isLoading || !data) {
    return <DashboardLoadingSkeleton />;
  }

  const currency = data.summary.currency || currentOrganization.base_currency;

  const summaryWidgets = [
    "cash_position_summary",
    "receivables_outstanding_summary",
    "payables_outstanding_summary",
    "revenue_this_month_summary",
    "expenses_this_month_summary",
    "net_result_this_month_summary",
  ]
    .map((key) => widgetByKey(data.widgets, key))
    .filter((widget): widget is WidgetEnvelope => Boolean(widget && widget.applicable));

  const attention = widgetByKey(data.widgets, "attention_center");
  const trend = widgetByKey(data.widgets, "revenue_vs_expenses_trend");
  const aging = widgetByKey(data.widgets, "aging_distribution");
  const invoiceWorkflow = widgetByKey(data.widgets, "invoice_workflow_summary");
  const billWorkflow = widgetByKey(data.widgets, "bill_workflow_summary");
  const recommendations = widgetByKey(data.widgets, "recommended_next_actions");
  const activity = widgetByKey(data.widgets, "recent_activity");
  const onboarding = widgetByKey(data.widgets, "onboarding_progress");
  const billing = widgetByKey(data.widgets, "billing_subscription_status");
  const integrations = widgetByKey(data.widgets, "integration_health_summary");

  const rawAttentionItems = ((attention?.payload?.items as Array<Record<string, unknown>> | undefined) ?? []);
  const trendPeriods = parseTrendPeriods(((trend?.payload?.periods as Array<Record<string, unknown>> | undefined) ?? []));
  const agingBuckets = ((aging?.payload?.buckets as Array<Record<string, unknown>> | undefined) ?? []);
  const recommendationItems = ((recommendations?.payload?.items as Array<Record<string, unknown>> | undefined) ?? []);
  const activityItems = ((activity?.payload?.items as Array<Record<string, unknown>> | undefined) ?? []);

  const attentionItems = prioritizedAttentionItems(rawAttentionItems);

  const receivablesWidget = widgetByKey(data.widgets, "receivables_outstanding_summary");
  const payablesWidget = widgetByKey(data.widgets, "payables_outstanding_summary");
  const receivablesOverdueCount = Number(((receivablesWidget?.payload?.overdue as Record<string, unknown> | undefined)?.invoiceCount ?? 0));
  const payablesOverdueCount = Number(((payablesWidget?.payload?.overdue as Record<string, unknown> | undefined)?.billCount ?? 0));

  const reconciliationDomain = trustSummaryQuery.data?.domains.find((domain) => domain.domain === "reconciliation");
  const reconciliationNeedsAttention = Boolean(reconciliationDomain && reconciliationDomain.status !== "healthy");

  const actionItems = buildActionList({
    recommendations: recommendationItems,
    attentionItems,
    receivablesOverdueCount,
    payablesOverdueCount,
    reconciliationNeedsAttention,
    onboarding,
    integrations,
    billing,
  });
  const curatedActivityItems = curatedActivity(activityItems);

  const trendRevenueTotal = trendPeriods.reduce((sum, period) => sum + period.revenue, 0);
  const trendExpensesTotal = trendPeriods.reduce((sum, period) => sum + period.expenses, 0);
  const trendNetTotal = trendRevenueTotal - trendExpensesTotal;

  const risk = summarizeRisk(agingBuckets);

  const positionWidgets = summaryWidgets.filter((widget) => ["cash_position_summary", "receivables_outstanding_summary", "payables_outstanding_summary"].includes(widget.widgetKey));
  const performanceWidgets = summaryWidgets.filter((widget) => ["revenue_this_month_summary", "expenses_this_month_summary", "net_result_this_month_summary"].includes(widget.widgetKey));

  const invoiceStatuses = ((invoiceWorkflow?.payload?.statuses as Array<Record<string, unknown>> | undefined) ?? []);
  const billStatuses = ((billWorkflow?.payload?.statuses as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-4 rounded-3xl border border-border/70 bg-gradient-to-b from-background via-background to-muted/35 p-3 shadow-[0_16px_34px_rgba(15,23,42,0.08)] dark:border-border/50 dark:shadow-[0_26px_56px_rgba(2,6,23,0.48)] md:p-4">
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="xl:col-span-9 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all duration-200 dark:bg-card/70 dark:shadow-[0_18px_32px_rgba(2,6,23,0.38)]">
          <PageHeader
            eyebrow="Dashboard"
            title="Finance command center"
            description={`${data.dashboardContext.scopeLabel} • ${data.dashboardContext.periodLabel}`}
            actions={(
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="transition-all duration-200 hover:-translate-y-0.5" onClick={() => void dashboardQuery.refetch()}>
                  <RefreshCw className="mr-1.5 size-3.5" /> Refresh
                </Button>
                <Button asChild type="button" size="sm" className="transition-all duration-200 hover:-translate-y-0.5"><Link href="/reports/profit-loss">Open P&L</Link></Button>
              </div>
            )}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {attentionItems.filter((item) => ["critical", "high"].includes(String(item.priority ?? ""))).length} high-priority issues · Activation {onboarding?.status === "ok" ? "on track" : onboarding?.status === "warning" ? "needs attention" : "pending"} · Reconciliation {reconciliationNeedsAttention ? "requires attention" : "healthy"}.
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
            {[onboarding, integrations, billing].filter((widget): widget is WidgetEnvelope => Boolean(widget)).map((widget) => (
              <div key={widget.widgetKey} className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2 dark:bg-muted/25">
                <p className="font-medium text-foreground">{widget.title}</p>
                <p className="text-muted-foreground">{widget.status === "warning" ? "Needs attention" : widget.status === "empty" ? "Action required" : "Healthy"}</p>
              </div>
            ))}
          </div>
        </div>

        <SectionCard title={recommendations?.title ?? "Recommended next actions"} description={recommendations?.subtitle ?? "State-aware guidance"} className="xl:col-span-3 border-border/70 bg-card/90 shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:bg-card/70 dark:shadow-[0_18px_32px_rgba(2,6,23,0.38)]">
          <div className="space-y-2 text-sm">
            {actionItems.slice(0, 5).map((item, index) => (
              <Link key={String(item.id)} href={String((item.cta as Record<string, unknown> | undefined)?.route ?? "/dashboard")} className={cn(
                "group flex items-start justify-between gap-2 rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/50",
                index === 0
                  ? "border-primary/45 bg-primary/8 shadow-[0_8px_18px_rgba(15,23,42,0.1)] dark:bg-primary/12"
                  : "border-border/70 bg-muted/35 hover:border-primary/45 dark:bg-muted/25",
              )}>
                <div className="space-y-0.5">
                  <p className={cn("text-sm font-medium text-foreground", index === 0 ? "text-[0.95rem]" : "")}>{index + 1}. {String(item.title)}</p>
                  <p className="text-xs text-muted-foreground">{String(item.description ?? "")}</p>
                </div>
                <ArrowRight className="mt-1 size-4 text-muted-foreground transition group-hover:text-foreground" />
              </Link>
            ))}
          </div>
        </SectionCard>
      </section>

      {trustSummaryQuery.data ? (
        <SectionCard
          title="Trust status"
          description={`Trust: ${trustSummaryQuery.data.overall_status === "healthy" ? "Healthy" : "Attention needed"}${reconciliationNeedsAttention ? " due to reconciliation gaps" : ""} • evaluated ${new Date(trustSummaryQuery.data.last_evaluated_at).toLocaleString()}`}
          className="border-border/70 bg-card/90 shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:bg-card/70 dark:shadow-[0_18px_32px_rgba(2,6,23,0.38)]"
          actions={<Button asChild size="sm" variant="outline"><Link href="/settings/integrity">Open integrity center</Link></Button>}
        >
          <div className="mb-2 inline-flex rounded-full border border-border/70 bg-muted/35 px-2.5 py-1 text-[11px] font-medium text-foreground dark:bg-muted/25">
            Trust: {trustSummaryQuery.data.overall_status === "healthy" ? "Healthy" : "Attention needed"}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6 text-xs">
            {trustSummaryQuery.data.domains.map((domain: { domain: string; label: string; status: string }) => (
              <div key={domain.domain} className="rounded-xl border border-border/70 bg-muted/35 p-2.5 dark:bg-muted/25">
                <p className="font-medium text-foreground">{domain.label}</p>
                <p className="text-muted-foreground capitalize">{domain.status.replaceAll("_", " ")}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <section className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Financial position & performance</p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-6">
          {positionWidgets.map((widget) => (
            <div key={widget.widgetKey} className={widget.widgetKey === "cash_position_summary" ? "lg:col-span-2" : "lg:col-span-1"}>
              <SummaryCard widget={widget} currency={currency} organizationId={currentOrganizationId ?? undefined} emphasis={widget.widgetKey === "cash_position_summary" ? "strong" : "normal"} />
            </div>
          ))}
          {performanceWidgets.map((widget) => (
            <div key={widget.widgetKey} className="lg:col-span-1">
              <SummaryCard widget={widget} currency={currency} organizationId={currentOrganizationId ?? undefined} performanceWidget />
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <SectionCard
          title={trend?.title ?? "Revenue vs Expenses"}
          description={trend?.subtitle ?? "Primary financial snapshot"}
          className="xl:col-span-8 border-border/70 bg-card/90 shadow-[0_12px_28px_rgba(15,23,42,0.1)] dark:bg-card/70 dark:shadow-[0_20px_36px_rgba(2,6,23,0.42)]"
          actions={trend?.drilldownTarget?.route ? (
            <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
              <Link href={trend.drilldownTarget.route}>{trend.drilldownTarget.label ?? "Open detail"}<ChevronRight className="size-3.5" /></Link>
            </Button>
          ) : null}
        >
          {trend?.status === "empty" ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-muted-foreground">{trend.emptyState?.title ?? "No trend data available."}</div>
          ) : (
            <div className="space-y-3 text-sm">
              <TrendMiniChart periods={trendPeriods} />
              <div className="grid grid-cols-1 gap-2 rounded-xl border border-border/70 bg-muted/35 p-3 text-xs sm:grid-cols-3 dark:bg-muted/25">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Revenue total</p>
                  <MoneyDisplay value={String(trendRevenueTotal)} currencyCode={currency} className="text-sm font-semibold text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Expense total</p>
                  <MoneyDisplay value={String(trendExpensesTotal)} currencyCode={currency} className="text-sm font-semibold text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Net total</p>
                  <MoneyDisplay value={String(trendNetTotal)} currencyCode={currency} className={cn("text-sm font-semibold", trendNetTotal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")} />
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title={attention?.title ?? "Attention Center"} description={attention?.subtitle ?? "Prioritized action items requiring follow-up."} className="xl:col-span-4 border-border/70 bg-card/90 shadow-[0_12px_28px_rgba(15,23,42,0.1)] dark:bg-card/70 dark:shadow-[0_20px_36px_rgba(2,6,23,0.42)]">
          {attention?.status === "empty" ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{attention.emptyState?.title ?? "No urgent issues."}</div>
          ) : (
            <div className="space-y-2 text-sm">
              {attentionItems.slice(0, 6).map((item) => (
                <Link key={String(item.id)} href={String((item.cta as Record<string, unknown> | undefined)?.route ?? "/activity")} className="group flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-muted/35 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-accent/50 dark:bg-muted/25">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2">
                      <Badge variant={statusTone(String(item.priority ?? "low"))} className={cn("capitalize border", priorityStyles(String(item.priority ?? "low")))}>{String(item.priority ?? "low")}</Badge>
                      <p className="font-medium text-foreground">{String(item.title ?? "Action item")}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{String(item.description ?? "")}</p>
                  </div>
                  <ArrowRight className="mt-1 size-4 text-muted-foreground transition group-hover:text-foreground" />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <SectionCard title={aging?.title ?? "Aging distribution"} description={aging?.subtitle ?? "AR/AP bucketed exposure"} className="xl:col-span-4 border-border/70 bg-card/85 shadow-sm dark:bg-card/60">
          {aging?.status === "empty" ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{aging.emptyState?.title ?? "No aging exposure."}</div>
          ) : (
            <div className="space-y-3 text-sm">
              <AgingDistributionMiniChart buckets={risk.normalized} />
              <div className={cn("rounded-xl border p-3 text-xs", risk.severity === "high" ? "border-amber-500/35 bg-amber-500/10" : "border-border/70 bg-muted/35 dark:bg-muted/25") }>
                <p className="mb-1 font-medium text-foreground">Risk summary</p>
                <p className="text-muted-foreground">{risk.summary}</p>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title={invoiceWorkflow?.title ?? "Invoice workflow"} description={invoiceWorkflow?.subtitle ?? "Workflow status mix"} className="xl:col-span-4 border-border/70 bg-card/85 shadow-sm dark:bg-card/60">
          <div className="space-y-2 text-sm">
            {workflowGroups(invoiceStatuses).map((group) => (
              <div key={group.title} className="grid grid-cols-[1fr,auto] gap-2 rounded-xl border border-border/70 bg-muted/35 p-3 text-xs dark:bg-muted/25">
                <div>
                  <p className="font-medium text-slate-100">{group.title}</p>
                  <p className="text-slate-400">{group.count} invoices</p>
                </div>
                <MoneyDisplay value={String(group.amount)} currencyCode={currency} className="text-right font-medium text-slate-100" />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={billWorkflow?.title ?? "Bill workflow"} description={billWorkflow?.subtitle ?? "Workflow status mix"} className="xl:col-span-4 border-border/70 bg-card/85 shadow-sm dark:bg-card/60">
          <div className="space-y-2 text-sm">
            {workflowGroups(billStatuses).map((group) => (
              <div key={group.title} className="grid grid-cols-[1fr,auto] gap-2 rounded-xl border border-border/70 bg-muted/35 p-3 text-xs dark:bg-muted/25">
                <div>
                  <p className="font-medium text-slate-100">{group.title}</p>
                  <p className="text-slate-400">{group.count} bills</p>
                </div>
                <MoneyDisplay value={String(group.amount)} currencyCode={currency} className="text-right font-medium text-slate-100" />
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <SectionCard title={activity?.title ?? "Recent activity"} description={activity?.subtitle ?? "Meaningful events"} className="xl:col-span-8 border-border/70 bg-card/85 shadow-sm dark:bg-card/60">
          <div className="space-y-2 text-sm">
            {curatedActivityItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-600 p-4 text-xs text-slate-400">{activity?.emptyState?.title ?? "No recent activity."}</div>
            ) : (
              curatedActivityItems.map((item) => (
                <div key={String(item.activityId)} className="grid grid-cols-[1fr,auto] items-center gap-2 rounded-xl border border-border/70 bg-muted/35 px-3 py-2.5 text-xs transition-colors hover:bg-accent/40 dark:bg-muted/25">
                  <span className="inline-flex items-center gap-2 text-foreground"><CircleCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" /> {String(item.eventSummary)}</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground" title={formatDateTime(String(item.occurredAt ?? ""))}><Clock3 className="size-3" /> {formatRelativeTime(String(item.occurredAt ?? ""))}</span>
                </div>
              ))
            )}
            <Button asChild variant="outline" size="sm" className="w-full border-slate-600/70 bg-slate-900/70 text-slate-100 hover:bg-slate-800"><Link href="/activity">View all activity</Link></Button>
          </div>
        </SectionCard>

        <SectionCard title="System & setup health" description="Billing, integrations, and readiness status." className="xl:col-span-4 border-border/70 bg-card/85 shadow-sm dark:bg-card/60">
          <div className="grid gap-2 text-sm">
            {[billing, integrations, onboarding].filter((widget): widget is WidgetEnvelope => Boolean(widget)).map((widget) => {
              const widgetStatus = widget.status === "empty"
                ? (widget.emptyState?.kind === "not_configured" ? "Action required" : "No active tasks")
                : widget.status === "warning" ? "Needs attention" : "Healthy";
              const description = widget.status === "empty"
                ? (widget.emptyState?.title ?? "No data")
                : (widget.subtitle ?? "Operational summary available");

              return (
                <div key={widget.widgetKey} className="rounded-xl border border-border/70 bg-muted/35 p-3 dark:bg-muted/25">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-100">{widget.title}</p>
                    <Badge variant={widget.status === "warning" ? "secondary" : "outline"}>{widgetStatus}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">{description}</p>
                  {widget.drilldownTarget?.route ? (
                    <Button asChild variant="link" className="mt-1 h-auto p-0 text-xs text-slate-200">
                      <Link href={widget.drilldownTarget.route}>{widget.drilldownTarget.label ?? "Open"}</Link>
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
