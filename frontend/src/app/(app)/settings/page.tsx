"use client";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { usePermissions } from "@/features/permissions/hooks";
import { SETTINGS_NAV_SECTIONS, SETTINGS_PERMISSION_GROUPS } from "@/features/settings/constants";
import { SettingsAvailabilityCard } from "@/features/settings/components/settings-availability-card";
import { SettingsErrorState } from "@/features/settings/components/settings-error-state";
import { SettingsLoadingSkeleton } from "@/features/settings/components/settings-loading-skeleton";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { useAccountingSettings, useDocumentSettings, useFiscalPeriods, useOrganizationPreferences, useTaxCodes } from "@/features/settings/hooks";
import type { SettingsSectionStatus } from "@/features/settings/types";
import { useOrganization } from "@/providers/organization-provider";

export default function SettingsLandingPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission } = usePermissions();
  const canReadSettings = hasAnyPermission(SETTINGS_PERMISSION_GROUPS.landing);
  const orgQuery = useOrganizationPreferences(currentOrganizationId ?? undefined, canReadSettings);
  const periodsQuery = useFiscalPeriods(currentOrganizationId ?? undefined, canReadSettings);
  const taxQuery = useTaxCodes(currentOrganizationId ?? undefined, canReadSettings);
  const documentQuery = useDocumentSettings(currentOrganizationId ?? undefined, canReadSettings);
  const accountingQuery = useAccountingSettings(currentOrganizationId ?? undefined, canReadSettings);

  if (isLoadingOrganizations) return <LoadingScreen label="Loading settings" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening settings." />;
  if (!canReadSettings) return <AccessDeniedState description="You need settings-related permissions to view this area." />;
  if (orgQuery.isLoading || periodsQuery.isLoading || taxQuery.isLoading || documentQuery.isLoading || accountingQuery.isLoading) return <SettingsLoadingSkeleton />;
  if (orgQuery.isError || periodsQuery.isError || taxQuery.isError || documentQuery.isError || accountingQuery.isError) {
    return <SettingsErrorState title="Settings unavailable" description="We couldn't load one or more settings surfaces for this organization." onRetry={() => { void orgQuery.refetch(); void periodsQuery.refetch(); void taxQuery.refetch(); void documentQuery.refetch(); void accountingQuery.refetch(); }} />;
  }

  const taxCollection = taxQuery.data ?? null;
  const taxCodes = taxCollection?.items ?? [];
  const sections: SettingsSectionStatus[] = [
    {
      ...SETTINGS_NAV_SECTIONS[0],
      availability: orgQuery.data ? "available" : "unavailable",
      reason: orgQuery.data ? `Live organization profile for ${orgQuery.data.name}.` : "Organization preferences are not available for this backend.",
    },
    {
      ...SETTINGS_NAV_SECTIONS[1],
      availability: periodsQuery.data ? "available" : "unavailable",
      reason: periodsQuery.data ? `${periodsQuery.data.length} fiscal periods loaded from the backend.` : "Fiscal period endpoints are not available for this organization.",
    },
    {
      ...SETTINGS_NAV_SECTIONS[2],
      availability: taxCollection === null ? "unavailable" : taxCollection.supportsWrite ? "available" : "read-only",
      reason: taxCollection === null ? "Tax code endpoints are not enabled for this backend." : taxCollection.supportsWrite ? `${taxCodes.length} tax codes available.` : taxCollection.readOnlyReason,
    },
    {
      ...SETTINGS_NAV_SECTIONS[3],
      availability: documentQuery.data || accountingQuery.data ? "available" : "read-only",
      reason: documentQuery.data || accountingQuery.data ? "Backend-backed preferences are available for this organization." : "Preferences are not exposed through dedicated endpoints yet.",
    },
  ];
  const sectionsWithAccess = sections.map((section) => ({ ...section, isPermitted: hasAnyPermission(section.requiredPermissions) }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={currentOrganization?.name || "Settings"} title="Settings" description="Professional admin surfaces for organization, period, tax, and accounting preferences." />
      <PageActionBar left={<div className="text-sm text-muted-foreground">The backend remains authoritative for fiscal period status, tax code validity, numbering rules, and organization configuration truth.</div>} right={<div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active organization · {currentOrganization?.name ?? "Unknown"}</div>} />
      <SettingsNav sections={sectionsWithAccess} activeHref="/settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        {sectionsWithAccess.map((section) => <SettingsAvailabilityCard key={section.id} section={section} isPermitted={section.isPermitted ?? true} />)}
      </div>
    </div>
  );
}
