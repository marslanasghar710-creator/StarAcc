"use client";

import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PermissionGate } from "@/components/permissions/permission-gate";
import { DateDisplay } from "@/components/shared/date-display";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { usePermissions } from "@/features/permissions/hooks";
import { SETTINGS_NAV_SECTIONS, SETTINGS_PERMISSION_GROUPS } from "@/features/settings/constants";
import { OrganizationPreferencesForm } from "@/features/settings/components/organization-preferences-form";
import { SettingsErrorState } from "@/features/settings/components/settings-error-state";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { SettingsReadonlyCard } from "@/features/settings/components/settings-readonly-card";
import { SettingsSectionShell } from "@/features/settings/components/settings-section-shell";
import { useOrganizationPreferences, useUpdateOrganizationPreferences } from "@/features/settings/hooks";
import type { OrganizationPreferencesFormValues } from "@/features/settings/schemas";
import { useOrganization } from "@/providers/organization-provider";

export default function OrganizationSettingsPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission } = usePermissions();
  const canRead = hasAnyPermission(SETTINGS_PERMISSION_GROUPS.organizationRead);
  const canWrite = hasAnyPermission(SETTINGS_PERMISSION_GROUPS.organizationWrite);
  const preferencesQuery = useOrganizationPreferences(currentOrganizationId ?? undefined, canRead);
  const updateMutation = useUpdateOrganizationPreferences(currentOrganizationId ?? undefined);

  const sections = SETTINGS_NAV_SECTIONS.map((section) => ({
    ...section,
    availability: "available" as const,
    reason: section.id === "organization" ? "Live organization profile." : "Backend-backed settings module.",
    isPermitted: hasAnyPermission(section.requiredPermissions),
  }));

  async function handleSubmit(values: OrganizationPreferencesFormValues) {
    const updated = await updateMutation.mutateAsync({
      name: values.name.trim(),
      legal_name: values.legal_name || null,
      registration_number: values.registration_number || null,
      tax_number: values.tax_number || null,
      base_currency: values.base_currency.toUpperCase(),
      timezone: values.timezone,
      country: values.country || null,
      contact_email: values.contact_email || null,
      contact_phone: values.contact_phone || null,
      website: values.website || null,
      fiscal_year_start_month: Number.parseInt(values.fiscal_year_start_month, 10),
      fiscal_year_start_day: Number.parseInt(values.fiscal_year_start_day, 10),
    });
    toast.success(`Saved ${updated.name}`);
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading organization settings" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening organization settings." />;
  if (!canRead) return <AccessDeniedState description="You need organization/settings permissions to view this page." />;
  if (preferencesQuery.isLoading) return <LoadingScreen label="Loading organization settings" />;
  if (preferencesQuery.isError || !preferencesQuery.data) return <SettingsErrorState title="Organization settings unavailable" description="We couldn't load organization settings from the backend." onRetry={() => void preferencesQuery.refetch()} />;

  const preferences = preferencesQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={currentOrganization?.name || "Settings"} title="Organization settings" description="Maintain legal entity profile fields without moving validation or persistence truth into the client." />
      <PageActionBar left={<div className="text-sm text-muted-foreground">Created <DateDisplay value={preferences.createdAt} includeTime /> · Last updated <DateDisplay value={preferences.updatedAt} includeTime /></div>} right={<PermissionGate anyPermissions={SETTINGS_PERMISSION_GROUPS.organizationWrite} fallback={<span className="text-sm text-muted-foreground">Read-only for your role</span>}><span className="text-sm font-medium">Updates enabled</span></PermissionGate>} />
      <SettingsNav sections={sections} activeHref="/settings/organization" />
      <SettingsSectionShell title="Organization preferences" description="Editable only when both your permissions and the backend allow updates.">
        {canWrite ? <OrganizationPreferencesForm preferences={preferences} onSubmit={handleSubmit} isSubmitting={updateMutation.isPending} /> : <SettingsReadonlyCard title="Read-only organization settings" description="Your current role can view organization preferences but cannot update them." />}
      </SettingsSectionShell>
    </div>
  );
}
