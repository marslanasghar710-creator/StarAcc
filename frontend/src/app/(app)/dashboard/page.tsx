"use client";

import type { ComponentType } from "react";
import { BellRing, Building2, ShieldCheck, Sparkles } from "lucide-react";

import { ErrorState } from "@/components/feedback/error-state";
import { NotificationList } from "@/components/notifications/notification-list";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { useNotificationsQuery, useUnreadNotificationsQuery } from "@/features/notifications/hooks";
import { usePermissions } from "@/features/permissions/hooks";
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

export default function DashboardPage() {
  const { user } = useAuth();
  const { roleName, can } = usePermissions();
  const { currentOrganization, currentOrganizationId } = useOrganization();
  const canReadNotifications = can("notifications.read");
  const unreadQuery = useUnreadNotificationsQuery(currentOrganizationId, canReadNotifications);
  const notificationsQuery = useNotificationsQuery(currentOrganizationId, canReadNotifications);
  const settingsQuery = useOrganizationSettingsQuery(currentOrganizationId, Boolean(currentOrganizationId));

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
