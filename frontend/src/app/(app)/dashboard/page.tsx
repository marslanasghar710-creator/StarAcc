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
import { resolveWidgets } from "@/features/dashboard/widget-registry";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function severityTone(severity: string) {
  if (severity === "high") return "destructive" as const;
  if (severity === "medium") return "secondary" as const;
  return "outline" as const;
}

function priorityTone(priority: string) {
  if (priority === "high") return "text-foreground";
  if (priority === "medium") return "text-muted-foreground";
  return "text-muted-foreground/90";
}

function SummaryStrip({ organizationCurrency, items }: { organizationCurrency: string; items: NonNullable<ReturnType<typeof useDashboardOverview>["data"]>["summaryMetrics"] }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.slice(0, 6).map((metric) => (
        <SectionCard key={metric.key} title={metric.label} description="" className="xl:min-h-[150px]">
          <div className="space-y-2">
            <MoneyDisplay value={metric.value} currencyCode={metric.currencyCode ?? organizationCurrency} className="text-2xl font-semibold tracking-tight text-foreground" />
            {metric.delta != null ? (
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {metric.delta >= 0 ? <TrendingUp className="size-3 text-emerald-600" /> : <TrendingDown className="size-3 text-amber-600" />}
                MTD <MoneyDisplay value={metric.delta} currencyCode={metric.currencyCode ?? organizationCurrency} />
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Current reporting period</p>
            )}
            <Button asChild variant="link" className="h-auto p-0 text-xs">
              <Link href={metric.route}>Open detail</Link>
            </Button>
          </div>
        </SectionCard>
      ))}
    </section>
  );
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <div className="h-52 animate-pulse rounded-xl bg-muted/40 xl:col-span-4" />
        <div className="h-52 animate-pulse rounded-xl bg-muted/40 xl:col-span-4" />
        <div className="h-52 animate-pulse rounded-xl bg-muted/40 xl:col-span-4" />
      </div>
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

  const isNewOrg = maturity === "new";

  return (
    <div className="space-y-7 px-1 pb-2 pt-1 md:px-2">
      <PageHeader
        eyebrow="Dashboard"
        title="Finance command center"
        description={`${currentOrganization.name} • ${currentOrganization.base_currency} reporting context`}
        actions={(
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">{maturity} org profile</Badge>
            <Button type="button" variant="outline" size="sm" onClick={() => void dashboardQuery.refetch()}>
              <RefreshCw className="mr-1.5 size-3.5" /> Refresh
            </Button>
          </div>
        )}
      />

      {dashboardQuery.isLoading || !data ? (
        <DashboardLoadingSkeleton />
      ) : (
        <>
          {showWidget("summary_strip") ? <SummaryStrip organizationCurrency={currentOrganization.base_currency} items={data.summaryMetrics} /> : null}

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            {showWidget("attention_center") ? (
              <SectionCard title="Attention & action center" description="Top operational priorities for today." className="xl:col-span-5 xl:min-h-[320px]">
                <div className="space-y-2 text-sm">
                  {data.attentionItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-muted-foreground">No urgent exceptions detected.</div>
                  ) : (
                    data.attentionItems.slice(0, 8).map((item) => (
                      <Link key={item.key} href={item.route} className="group flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 transition hover:border-primary/30 hover:bg-muted/35">
                        <div>
                          <div className="mb-1 inline-flex items-center gap-2">
                            <Badge variant={severityTone(item.severity)} className="capitalize">{item.severity}</Badge>
                            <p className="font-medium text-foreground">{item.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.detail}</p>
                        </div>
                        <ArrowRight className="mt-1 size-4 text-muted-foreground transition group-hover:text-foreground" />
                      </Link>
                    ))
                  )}
                </div>
              </SectionCard>
            ) : null}

            {showWidget("trend") ? (
              <SectionCard title="Revenue vs expenses" description="Primary financial snapshot across recent months." className="xl:col-span-7 xl:min-h-[320px]">
                <div className="space-y-2 text-sm">
                  {data.trends.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-muted-foreground">Trend data appears after your first accounting activity.</div>
                  ) : (
                    data.trends.map((point) => (
                      <div key={point.label} className="grid grid-cols-[56px,1fr] items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                        <p className="text-xs font-medium text-foreground">{point.label}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <span className="text-muted-foreground">Revenue <MoneyDisplay value={point.revenue} currencyCode={currentOrganization.base_currency} /></span>
                          <span className="text-muted-foreground">Expenses <MoneyDisplay value={point.expenses} currencyCode={currentOrganization.base_currency} /></span>
                          <span className="text-muted-foreground">Cash move <MoneyDisplay value={point.cashMovement} currencyCode={currentOrganization.base_currency} /></span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>
            ) : null}
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
            {showWidget("aging") ? (
              <SectionCard title="AR/AP aging" description="Exposure by aging bucket." className="xl:col-span-4">
                <div className="space-y-2 text-sm">
                  {data.aging.map((bucket) => (
                    <div key={bucket.bucket} className="grid grid-cols-[72px,1fr,1fr] items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                      <span className="font-medium text-foreground">{bucket.bucket}</span>
                      <span className="text-muted-foreground">AR <MoneyDisplay value={bucket.receivables} currencyCode={currentOrganization.base_currency} /></span>
                      <span className="text-muted-foreground">AP <MoneyDisplay value={bucket.payables} currencyCode={currentOrganization.base_currency} /></span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {showWidget("workflows") ? (
              <SectionCard title="Workflow health" description="Status mix for core operating workflows." className="xl:col-span-4">
                <div className="space-y-2 text-sm">
                  {data.workflows.map((workflow) => (
                    <Link key={workflow.key} href={workflow.route} className="grid grid-cols-[1fr,repeat(4,minmax(0,68px))] gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-xs transition hover:border-primary/30 hover:bg-muted/35">
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

            {showWidget("recommendations") ? (
              <SectionCard title="Recommended next actions" description="State-aware guidance to keep momentum." className="xl:col-span-4">
                <div className="space-y-2 text-sm">
                  {data.recommendations.slice(0, 5).map((item) => (
                    <Link key={item.key} href={item.route} className="group flex items-start justify-between rounded-lg border border-border/70 bg-muted/20 p-3 transition hover:border-primary/30 hover:bg-muted/35">
                      <div>
                        <p className={`font-medium ${priorityTone(item.priority)}`}>{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <ArrowRight className="mt-1 size-4 text-muted-foreground transition group-hover:text-foreground" />
                    </Link>
                  ))}
                </div>
              </SectionCard>
            ) : null}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            {showWidget("recent_activity") ? (
              <SectionCard title="Recent activity" description="Meaningful financial and operational events." className="xl:col-span-6">
                <div className="space-y-2 text-sm">
                  {data.recentActivity.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">Activity appears once transactions and workflows begin.</div>
                  ) : (
                    data.recentActivity.slice(0, 8).map((row) => (
                      <div key={row.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                        <span className="inline-flex items-center gap-2 text-foreground"><CircleCheck className="size-3.5 text-emerald-500" /> {row.action}</span>
                        <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock3 className="size-3" /> {new Date(row.createdAt).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                  <Button asChild variant="outline" size="sm" className="w-full"><Link href="/activity">View all activity</Link></Button>
                </div>
              </SectionCard>
            ) : null}

            <SectionCard title="Dashboard usage notes" description="Calm, high-signal dashboard behavior by design." className="xl:col-span-6">
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <p className="mb-1 inline-flex items-center gap-1 font-medium text-foreground"><AlertTriangle className="size-4" /> Attention-first</p>
                  <p className="text-muted-foreground">Urgent finance actions stay high on the page with direct drilldowns.</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <p className="mb-1 inline-flex items-center gap-1 font-medium text-foreground"><WalletCards className="size-4" /> Financial clarity</p>
                  <p className="text-muted-foreground">Summary strip + trends prioritize cash, AR/AP exposure, and net position.</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <p className="mb-1 inline-flex items-center gap-1 font-medium text-foreground"><TrendingUp className="size-4" /> Role-aware</p>
                  <p className="text-muted-foreground">Widget composition follows maturity and permission-aware registry rules.</p>
                </div>
              </div>
            </SectionCard>
          </section>

          {isNewOrg ? (
            <SectionCard title="Getting started" description="New organizations see setup-first guidance before heavy analytics.">
              <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 text-sm md:flex-row md:items-center md:justify-between">
                <p className="text-muted-foreground">Complete setup tasks and first transactions to unlock a richer operational dashboard.</p>
                <div className="flex gap-2">
                  <Button asChild size="sm"><Link href="/setup">Continue setup</Link></Button>
                  <Button asChild variant="outline" size="sm"><Link href="/demo">Open demo org</Link></Button>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </>
      )}
    </div>
  );
}
