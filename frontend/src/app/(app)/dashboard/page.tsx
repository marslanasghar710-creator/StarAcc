"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { BellRing, Building2, ShieldCheck, Sparkles } from "lucide-react";

import { ErrorState } from "@/components/feedback/error-state";
import { NotificationList } from "@/components/notifications/notification-list";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOpenBills, useOverdueBills } from "@/features/bills/hooks";
import { useOpenInvoices, useOverdueInvoices } from "@/features/invoices/hooks";
import { useNotificationsQuery, useUnreadNotificationsQuery } from "@/features/notifications/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { useOnboardingStatus } from "@/features/onboarding/hooks";
import { useOrganizationSettingsQuery } from "@/features/organizations/hooks";
import { useAuth } from "@/providers/auth-provider";
import { useOrganization } from "@/providers/organization-provider";

function KpiCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <SectionCard title={label} description={hint}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
    </SectionCard>
  );
}

function sumAmountDue(items: Array<{ amountDue?: string | number | null }>): number {
  return items.reduce((total, item) => total + Number(item.amountDue ?? 0), 0);
}

type OverdueRow = {
  id: string;
  type: "invoice" | "bill";
  documentNumber: string;
  counterpartyName: string;
  dueDate: string;
  amountDue: string | number;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { roleName, can } = usePermissions();
  const { currentOrganization, currentOrganizationId } = useOrganization();
  const organizationId = currentOrganizationId ?? undefined;
  const canReadNotifications = can("notifications.read");
  const canReadInvoices = can("invoices.read");
  const canReadBills = can("bills.read");
  const unreadQuery = useUnreadNotificationsQuery(organizationId, canReadNotifications);
  const notificationsQuery = useNotificationsQuery(organizationId, canReadNotifications);
  const openInvoicesQuery = useOpenInvoices(organizationId, canReadInvoices);
  const overdueInvoicesQuery = useOverdueInvoices(organizationId, canReadInvoices);
  const openBillsQuery = useOpenBills(organizationId, canReadBills);
  const overdueBillsQuery = useOverdueBills(organizationId, canReadBills);
  const settingsQuery = useOrganizationSettingsQuery(organizationId, Boolean(organizationId));
  const onboardingQuery = useOnboardingStatus(organizationId, Boolean(organizationId));
  const openInvoices = openInvoicesQuery.data ?? [];
  const overdueInvoices = overdueInvoicesQuery.data ?? [];
  const openBills = openBillsQuery.data ?? [];
  const overdueBills = overdueBillsQuery.data ?? [];
  const receivablesOpenAmount = sumAmountDue(openInvoices);
  const receivablesOverdueAmount = sumAmountDue(overdueInvoices);
  const payablesOpenAmount = sumAmountDue(openBills);
  const payablesOverdueAmount = sumAmountDue(overdueBills);
  const receivablesExposure = receivablesOpenAmount + receivablesOverdueAmount;
  const payablesExposure = payablesOpenAmount + payablesOverdueAmount;
  const totalExposure = receivablesExposure + payablesExposure;
  const receivablesRatio = totalExposure > 0 ? (receivablesExposure / totalExposure) * 100 : 0;
  const payablesRatio = totalExposure > 0 ? (payablesExposure / totalExposure) * 100 : 0;
  const financialLoading = openInvoicesQuery.isLoading || overdueInvoicesQuery.isLoading || openBillsQuery.isLoading || overdueBillsQuery.isLoading;
  const overdueRows: OverdueRow[] = [
    ...overdueInvoices.map((invoice) => ({
      id: invoice.id,
      type: "invoice" as const,
      documentNumber: invoice.invoiceNumber,
      counterpartyName: invoice.customerName ?? "Unknown customer",
      dueDate: invoice.dueDate,
      amountDue: invoice.amountDue,
    })),
    ...overdueBills.map((bill) => ({
      id: bill.id,
      type: "bill" as const,
      documentNumber: bill.billNumber,
      counterpartyName: bill.supplierName ?? "Unknown supplier",
      dueDate: bill.dueDate,
      amountDue: bill.amountDue,
    })),
  ]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 6);

  if (!currentOrganization) {
    return <ErrorState title="No organization selected" description="Sign in again or switch to an organization to initialize the workspace." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back${user?.email ? `, ${user.email}` : ""}`}
        description="This shell stays backend-driven: it reflects your current organization, effective role, and notification state without inventing accounting data prematurely."
        actions={<Badge variant="secondary" className="capitalize">{roleName ?? "Unassigned role"}</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active organization" value={currentOrganization.name} hint={`${currentOrganization.base_currency} • ${currentOrganization.timezone}`} icon={Building2} />
        <KpiCard label="Unread notifications" value={String(unreadQuery.data?.unread_count ?? 0)} hint="Live organization-scoped inbox status." icon={BellRing} />
        <KpiCard label="Tax enabled" value={settingsQuery.data?.tax_enabled ? "Yes" : "No"} hint="Derived from organization settings." icon={ShieldCheck} />
        <KpiCard label="Theme-ready shell" value="Live" hint="Navigation, auth, and route guards are active." icon={Sparkles} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <SectionCard title="Recent notifications" description="Latest alerts for the selected organization.">
          {notificationsQuery.isError ? (
            <ErrorState description="We couldn't load notifications for this organization." onRetry={() => void notificationsQuery.refetch()} />
          ) : (
            <NotificationList items={notificationsQuery.data?.items.slice(0, 5) ?? []} canMarkRead={false} emptyDescription="Your next operational alerts will surface here." />
          )}
        </SectionCard>


        <SectionCard title="Setup center" description="Progressive onboarding for this organization.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Progress: {onboardingQuery.data?.progress_percent ?? 0}% • Tier {onboardingQuery.data?.completion_tier ?? 0}</p>
            <p>{onboardingQuery.data?.next_recommended_action?.title ?? "Open Setup Center to continue onboarding."}</p>
            <Button asChild size="sm"><Link href="/setup">Continue setup</Link></Button>
          </div>
        </SectionCard>

        <SectionCard title="Receivables vs payables" description="Open and overdue invoice/bill exposure by amount due.">
          {canReadInvoices || canReadBills ? (
            financialLoading ? (
              <div className="space-y-3">
                <div className="h-14 animate-pulse rounded-xl bg-muted/40" />
                <div className="h-14 animate-pulse rounded-xl bg-muted/40" />
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Receivables exposure</span>
                    <MoneyDisplay value={receivablesExposure} currencyCode={currentOrganization.base_currency} className="font-medium text-foreground" />
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${receivablesRatio}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Payables exposure</span>
                    <MoneyDisplay value={payablesExposure} currencyCode={currentOrganization.base_currency} className="font-medium text-foreground" />
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-amber-500" style={{ width: `${payablesRatio}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                  <span>Total open exposure</span>
                  <MoneyDisplay value={totalExposure} currencyCode={currentOrganization.base_currency} />
                </div>
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Your current role does not include invoice or bill read access.</p>
          )}
        </SectionCard>

        <SectionCard title="Attention queue" description="High-signal operational items that need follow-up.">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <span className="text-muted-foreground">Overdue invoices</span>
              <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-foreground">
                <Link href="/invoices">{overdueInvoices.length}</Link>
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <span className="text-muted-foreground">Overdue bills</span>
              <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-foreground">
                <Link href="/bills">{overdueBills.length}</Link>
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <span className="text-muted-foreground">Unread notifications</span>
              <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-foreground">
                <Link href="/notifications">{String(unreadQuery.data?.unread_count ?? 0)}</Link>
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Top overdue documents" description="Oldest outstanding invoices and bills by due date.">
          {financialLoading ? (
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded-lg bg-muted/40" />
              <div className="h-10 animate-pulse rounded-lg bg-muted/40" />
              <div className="h-10 animate-pulse rounded-lg bg-muted/40" />
            </div>
          ) : overdueRows.length > 0 ? (
            <div className="space-y-2 text-sm">
              {overdueRows.map((row) => (
                <Link
                  key={`${row.type}-${row.id}`}
                  href={row.type === "invoice" ? `/invoices/${row.id}` : `/bills/${row.id}`}
                  className="grid grid-cols-[auto,1fr,auto,auto] items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 hover:bg-muted/40"
                >
                  <Badge variant={row.type === "invoice" ? "default" : "secondary"} className="capitalize">
                    {row.type}
                  </Badge>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{row.documentNumber} · {row.counterpartyName}</p>
                    <p className="text-xs text-muted-foreground">Due {row.dueDate}</p>
                  </div>
                  <MoneyDisplay value={row.amountDue} currencyCode={currentOrganization.base_currency} className="font-medium text-foreground" />
                  <span className="text-xs text-muted-foreground">View</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No overdue invoices or bills. You are fully up to date.</p>
          )}
        </SectionCard>

        <SectionCard title="Quick actions" description="The first feature prompts will replace these shortcuts with live accounting workflows.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              Review organization settings, branding, numbering, and tax defaults before onboarding the team.
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              Use the organization switcher to move across entities without losing permission context.
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              Notifications and route protection are now active, so future modules can focus on workflow depth.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
