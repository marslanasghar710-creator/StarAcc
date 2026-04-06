"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CircleCheck, Clock3, RefreshCw, TrendingDown, TrendingUp, WalletCards } from "lucide-react";

import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardOverview } from "@/features/dashboard/hooks";
import type { WidgetEnvelope } from "@/features/dashboard/types";
import { useOrganization } from "@/providers/organization-provider";

function widgetByKey(widgets: WidgetEnvelope[], key: string) {
  return widgets.find((widget) => widget.widgetKey === key);
}

function statusTone(status: string) {
  if (status === "warning") return "secondary" as const;
  if (status === "error") return "destructive" as const;
  return "outline" as const;
}

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={`summary-${idx}`} className="h-36 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="h-72 animate-pulse rounded-xl bg-muted/40 xl:col-span-5" />
        <div className="h-72 animate-pulse rounded-xl bg-muted/40 xl:col-span-7" />
      </div>
    </div>
  );
}

function SummaryCard({ widget, currency }: { widget: WidgetEnvelope; currency: string }) {
  const payload = widget.payload ?? {};
  const money = ((payload.totalCashBalance as { amount?: string } | undefined)?.amount
    ?? (payload.totalOutstanding as { amount?: string } | undefined)?.amount
    ?? (payload.netResult as { amount?: string } | undefined)?.amount
    ?? (payload.amount as { amount?: string } | undefined)?.amount
    ?? "0");

  const deltaDirection = (payload.delta as { direction?: string } | undefined)?.direction;
  const deltaAmount = (payload.delta as { amount?: string } | undefined)?.amount;

  return (
    <SectionCard title={widget.title} description={widget.subtitle ?? ""}>
      <div className="space-y-2">
        <MoneyDisplay value={money} currencyCode={currency} className="text-2xl font-semibold tracking-tight text-foreground" />
        {deltaAmount ? (
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {deltaDirection === "down" ? <TrendingDown className="size-3 text-amber-600" /> : <TrendingUp className="size-3 text-emerald-600" />}
            MTD <MoneyDisplay value={deltaAmount} currencyCode={currency} />
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Current reporting period</p>
        )}
        {widget.drilldownTarget?.route ? (
          <Button asChild variant="link" className="h-auto p-0 text-xs">
            <Link href={widget.drilldownTarget.route}>{widget.drilldownTarget.label ?? "Open detail"}</Link>
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}

export default function DashboardPage() {
  const { currentOrganization, currentOrganizationId } = useOrganization();
  const dashboardQuery = useDashboardOverview(currentOrganizationId ?? undefined, Boolean(currentOrganizationId));

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
  const maturity = data.dashboardContext.maturityState;

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

  const attentionItems = ((attention?.payload?.items as Array<Record<string, unknown>> | undefined) ?? []);
  const trendPeriods = ((trend?.payload?.periods as Array<Record<string, unknown>> | undefined) ?? []);
  const agingBuckets = ((aging?.payload?.buckets as Array<Record<string, unknown>> | undefined) ?? []);
  const recommendationItems = ((recommendations?.payload?.items as Array<Record<string, unknown>> | undefined) ?? []);
  const activityItems = ((activity?.payload?.items as Array<Record<string, unknown>> | undefined) ?? []);

  const data = dashboardQuery.data;
  const maturity = data?.maturity ?? "new";
  const widgets = resolveWidgets(maturity, can);
  const showWidget = (key: (typeof widgets)[number]["key"]) => widgets.some((widget) => widget.key === key);

  const isNewOrg = maturity === "new";

  return (
    <div className="space-y-7 px-1 pb-2 pt-1 md:px-2">
      <PageHeader
        eyebrow="Dashboard"
        title="Finance command center"
        description={`${data.dashboardContext.scopeLabel} • ${data.dashboardContext.periodLabel}`}
        actions={(
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">{maturity} org profile</Badge>
            <Button type="button" variant="outline" size="sm" onClick={() => void dashboardQuery.refetch()}>
              <RefreshCw className="mr-1.5 size-3.5" /> Refresh
            </Button>
          </div>
        )}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {summaryWidgets.map((widget) => <SummaryCard key={widget.widgetKey} widget={widget} currency={currency} />)}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SectionCard title={attention?.title ?? "Attention Center"} description={attention?.subtitle ?? "Prioritized action items requiring follow-up."} className="xl:col-span-5 xl:min-h-[320px]">
          {attention?.status === "empty" ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-muted-foreground">{attention.emptyState?.title ?? "No urgent issues."}</div>
          ) : (
            <div className="space-y-2 text-sm">
              {attentionItems.slice(0, 8).map((item) => (
                <Link key={String(item.id)} href={String((item.cta as Record<string, unknown> | undefined)?.route ?? "/activity")} className="group flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 transition hover:border-primary/30 hover:bg-muted/35">
                  <div>
                    <div className="mb-1 inline-flex items-center gap-2">
                      <Badge variant={statusTone(String(item.priority ?? "low"))} className="capitalize">{String(item.priority ?? "low")}</Badge>
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

        <SectionCard title={trend?.title ?? "Revenue vs Expenses"} description={trend?.subtitle ?? "Primary financial snapshot"} className="xl:col-span-7 xl:min-h-[320px]">
          {trend?.status === "empty" ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-muted-foreground">{trend.emptyState?.title ?? "No trend data available."}</div>
          ) : (
            <div className="space-y-2 text-sm">
              {trendPeriods.map((period) => (
                <div key={String(period.periodKey)} className="grid grid-cols-[56px,1fr] items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                  <p className="text-xs font-medium text-foreground">{String(period.label)}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <span className="text-muted-foreground">Revenue <MoneyDisplay value={String(((period.revenue as Record<string, unknown> | undefined)?.amount ?? 0))} currencyCode={currency} /></span>
                    <span className="text-muted-foreground">Expenses <MoneyDisplay value={String(((period.expenses as Record<string, unknown> | undefined)?.amount ?? 0))} currencyCode={currency} /></span>
                    <span className="text-muted-foreground">Net <MoneyDisplay value={String(((period.netResult as Record<string, unknown> | undefined)?.amount ?? 0))} currencyCode={currency} /></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <SectionCard title={aging?.title ?? "Aging distribution"} description={aging?.subtitle ?? "AR/AP bucketed exposure"} className="xl:col-span-4">
          {aging?.status === "empty" ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-muted-foreground">{aging.emptyState?.title ?? "No aging exposure."}</div>
          ) : (
            <div className="space-y-2 text-sm">
              {agingBuckets.map((bucket) => (
                <div key={String(bucket.bucketKey)} className="grid grid-cols-[72px,1fr,1fr] items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                  <span className="font-medium text-foreground">{String(bucket.label)}</span>
                  <span className="text-muted-foreground">AR <MoneyDisplay value={String(((bucket.receivables as Record<string, unknown> | undefined)?.amount ?? 0))} currencyCode={currency} /></span>
                  <span className="text-muted-foreground">AP <MoneyDisplay value={String(((bucket.payables as Record<string, unknown> | undefined)?.amount ?? 0))} currencyCode={currency} /></span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title={invoiceWorkflow?.title ?? "Invoice workflow"} description={invoiceWorkflow?.subtitle ?? "Workflow status mix"} className="xl:col-span-4">
          <div className="space-y-2 text-sm">
            {(((invoiceWorkflow?.payload?.statuses as Array<Record<string, unknown>> | undefined) ?? [])).map((status) => (
              <div key={String(status.status)} className="grid grid-cols-[1fr,72px,1fr] gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-xs">
                <span className="font-medium text-foreground capitalize">{String(status.status).replaceAll("_", " ")}</span>
                <span className="text-muted-foreground">{String(status.count)}</span>
                <span className="text-muted-foreground"><MoneyDisplay value={String(((status.amount as Record<string, unknown> | undefined)?.amount ?? 0))} currencyCode={currency} /></span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={recommendations?.title ?? "Recommended next actions"} description={recommendations?.subtitle ?? "State-aware guidance"} className="xl:col-span-4">
          <div className="space-y-2 text-sm">
            {recommendationItems.slice(0, 5).map((item) => (
              <Link key={String(item.id)} href={String((item.cta as Record<string, unknown> | undefined)?.route ?? "/dashboard")} className="group flex items-start justify-between rounded-lg border border-border/70 bg-muted/20 p-3 transition hover:border-primary/30 hover:bg-muted/35">
                <div>
                  <p className="font-medium text-foreground">{String(item.title)}</p>
                  <p className="text-xs text-muted-foreground">{String(item.description ?? "")}</p>
                </div>
                <ArrowRight className="mt-1 size-4 text-muted-foreground transition group-hover:text-foreground" />
              </Link>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SectionCard title={activity?.title ?? "Recent activity"} description={activity?.subtitle ?? "Meaningful events"} className="xl:col-span-6">
          <div className="space-y-2 text-sm">
            {activityItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">{activity?.emptyState?.title ?? "No recent activity."}</div>
            ) : (
              activityItems.slice(0, 8).map((item) => (
                <div key={String(item.activityId)} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-2 text-foreground"><CircleCheck className="size-3.5 text-emerald-500" /> {String(item.title)}</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock3 className="size-3" /> {String(item.relativeTimeLabel ?? "recent")}</span>
                </div>
              ))
            )}
            <Button asChild variant="outline" size="sm" className="w-full"><Link href="/activity">View all activity</Link></Button>
          </div>
        </SectionCard>

        <SectionCard title="Platform health widgets" description="Billing, integrations, and guidance state." className="xl:col-span-6">
          <div className="grid gap-3 text-sm md:grid-cols-3">
            {[billing, integrations, onboarding].filter(Boolean).map((widget) => (
              <div key={widget?.widgetKey} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                <p className="mb-1 inline-flex items-center gap-1 font-medium text-foreground">
                  <AlertTriangle className="size-4" /> {widget?.title}
                </p>
                <p className="text-xs text-muted-foreground">{widget?.status === "empty" ? (widget?.emptyState?.title ?? "No data") : (widget?.subtitle ?? "Operational summary available")}</p>
                {widget?.drilldownTarget?.route ? (
                  <Button asChild variant="link" className="mt-1 h-auto p-0 text-xs">
                    <Link href={widget.drilldownTarget.route}>{widget.drilldownTarget.label ?? "Open"}</Link>
                  </Button>
                ) : null}
              </div>
            ))}
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="mb-1 inline-flex items-center gap-1 font-medium text-foreground"><WalletCards className="size-4" /> Financial clarity</p>
              <p className="text-xs text-muted-foreground">Summary strip + trends prioritize cash, AR/AP exposure, and net position.</p>
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
