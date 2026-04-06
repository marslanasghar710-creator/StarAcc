"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, CircleCheck, TrendingUp } from "lucide-react";

import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardOverview } from "@/features/dashboard/hooks";
import { resolveWidgets } from "@/features/dashboard/widget-registry";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function severityTone(severity: string) {
  if (severity === "high") return "destructive" as const;
  if (severity === "medium") return "secondary" as const;
  return "outline" as const;
}

function TopSummaryStrip({ organizationCurrency, items }: { organizationCurrency: string; items: ReturnType<typeof useDashboardOverview>["data"]["summaryMetrics"] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((metric) => (
        <SectionCard key={metric.key} title={metric.label} description={metric.delta != null ? "Month context included" : ""}>
          <div className="space-y-1">
            <MoneyDisplay value={metric.value} currencyCode={metric.currencyCode ?? organizationCurrency} className="text-2xl font-semibold text-foreground" />
            {metric.delta != null ? (
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="size-3" />
                MTD movement <MoneyDisplay value={metric.delta} currencyCode={metric.currencyCode ?? organizationCurrency} />
              </p>
            ) : null}
            <Button asChild variant="link" className="h-auto p-0 text-xs">
              <Link href={metric.route}>Open detail</Link>
            </Button>
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { currentOrganization, currentOrganizationId } = useOrganization();
  const { can } = usePermissions();

  const dashboardQuery = useDashboardOverview(currentOrganizationId ?? undefined, Boolean(currentOrganizationId));

  if (!currentOrganization) {
    return <ErrorState title="No organization selected" description="Switch to an organization to load dashboard state." />;
  }

  if (dashboardQuery.isError) {
    return <ErrorState title="Dashboard unavailable" description="We couldn't load your dashboard overview." onRetry={() => void dashboardQuery.refetch()} />;
  }

  const data = dashboardQuery.data;
  const maturity = data?.maturity ?? "new";
  const widgets = resolveWidgets(maturity, can);
  const showWidget = (key: (typeof widgets)[number]["key"]) => widgets.some((widget) => widget.key === key);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Finance command center"
        description="High-signal overview of financial posture, urgent actions, workflow status, and recent movement."
        actions={<Badge variant="secondary" className="capitalize">{maturity} org profile</Badge>}
      />

      {dashboardQuery.isLoading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-muted/40" />)}
        </div>
      ) : (
        <>
          {showWidget("summary_strip") ? <TopSummaryStrip organizationCurrency={currentOrganization.base_currency} items={data.summaryMetrics} /> : null}

          <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
            {showWidget("attention_center") ? (
              <SectionCard title="Attention / actions" description="Prioritized items that need immediate follow-up.">
                <div className="space-y-2 text-sm">
                  {data.attentionItems.length === 0 ? (
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-muted-foreground">No urgent exceptions detected.</div>
                  ) : (
                    data.attentionItems.map((item) => (
                      <div key={item.key} className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                        <div>
                          <div className="mb-1 inline-flex items-center gap-2">
                            <Badge variant={severityTone(item.severity)} className="capitalize">{item.severity}</Badge>
                            <p className="font-medium text-foreground">{item.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.detail}</p>
                        </div>
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                          <Link href={item.route}>Open</Link>
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>
            ) : null}

            {showWidget("recommendations") ? (
              <SectionCard title="Recommended next actions" description="Rules-based suggestions from current org state.">
                <div className="space-y-2 text-sm">
                  {data.recommendations.map((item) => (
                    <Link key={item.key} href={item.route} className="flex items-start justify-between rounded-lg border border-border/70 bg-muted/20 p-3 transition hover:bg-muted/30">
                      <div>
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <ArrowRight className="mt-1 size-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {showWidget("trend") ? (
              <SectionCard title="Trend snapshot" description="Revenue, expenses, and cash movement across recent months.">
                <div className="space-y-2 text-sm">
                  {data.trends.map((point) => (
                    <div key={point.label} className="grid grid-cols-[52px,1fr] items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                      <p className="text-xs font-medium text-foreground">{point.label}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <span className="text-muted-foreground">Rev <MoneyDisplay value={point.revenue} currencyCode={currentOrganization.base_currency} /></span>
                        <span className="text-muted-foreground">Exp <MoneyDisplay value={point.expenses} currencyCode={currentOrganization.base_currency} /></span>
                        <span className="text-muted-foreground">Cash <MoneyDisplay value={point.cashMovement} currencyCode={currentOrganization.base_currency} /></span>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {showWidget("aging") ? (
              <SectionCard title="AR/AP aging" description="Current and overdue concentration by aging bucket.">
                <div className="space-y-2 text-sm">
                  {data.aging.map((bucket) => (
                    <div key={bucket.bucket} className="grid grid-cols-[70px,1fr,1fr] items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                      <span className="font-medium text-foreground">{bucket.bucket}</span>
                      <span className="text-muted-foreground">AR <MoneyDisplay value={bucket.receivables} currencyCode={currentOrganization.base_currency} /></span>
                      <span className="text-muted-foreground">AP <MoneyDisplay value={bucket.payables} currencyCode={currentOrganization.base_currency} /></span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {showWidget("workflows") ? (
              <SectionCard title="Workflow status" description="Health snapshot across invoicing, bills, and reconciliation.">
                <div className="space-y-2 text-sm">
                  {data.workflows.map((workflow) => (
                    <Link key={workflow.key} href={workflow.route} className="grid grid-cols-[1fr,repeat(4,minmax(0,70px))] gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-xs">
                      <span className="font-medium text-foreground">{workflow.label}</span>
                      <span className="text-muted-foreground">Draft {workflow.draft}</span>
                      <span className="text-muted-foreground">Active {workflow.inProgress}</span>
                      <span className="text-amber-600">Overdue {workflow.overdue}</span>
                      <span className="text-emerald-600">Done {workflow.completed}</span>
                    </Link>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {showWidget("recent_activity") ? (
              <SectionCard title="Recent activity" description="Meaningful recent events from the activity stream.">
                <div className="space-y-2 text-sm">
                  {data.recentActivity.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">Activity will appear after workflows run.</div>
                  ) : (
                    data.recentActivity.map((row) => (
                      <div key={row.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                        <span className="inline-flex items-center gap-2 text-foreground"><CircleCheck className="size-3.5 text-emerald-500" /> {row.action}</span>
                        <span className="text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                  <Button asChild variant="outline" size="sm" className="w-full"><Link href="/activity">View full activity center</Link></Button>
                </div>
              </SectionCard>
            ) : null}
          </div>

          <SectionCard title="Dashboard guidance" description="How this dashboard prioritizes information.">
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="font-medium text-foreground mb-1 inline-flex items-center gap-1"><AlertTriangle className="size-4" /> Attention-first</p><p className="text-muted-foreground">Urgent receivables, payables, reconciliation, and platform health signals stay near the top.</p></div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="font-medium text-foreground mb-1 inline-flex items-center gap-1"><CalendarClock className="size-4" /> Maturity-aware</p><p className="text-muted-foreground">New orgs focus on setup and first actions; mature orgs emphasize operational throughput.</p></div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="font-medium text-foreground mb-1 inline-flex items-center gap-1"><TrendingUp className="size-4" /> Drilldown-ready</p><p className="text-muted-foreground">Each widget routes directly to an actionable workflow or report.</p></div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
