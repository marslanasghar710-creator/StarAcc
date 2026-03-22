"use client";

import * as React from "react";

import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { usePermissions } from "@/features/permissions/hooks";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { SettingsReadonlyCard } from "@/features/settings/components/settings-readonly-card";
import { SettingsSectionShell } from "@/features/settings/components/settings-section-shell";
import { OrganizationPreferencesForm } from "@/features/settings/components/organization-preferences-form";
import { SettingsErrorState } from "@/features/settings/components/settings-error-state";
import { useOrganizationPreferences, useUpdateOrganizationPreferences } from "@/features/settings/hooks";
import type { OrganizationPreferencesFormValues } from "@/features/settings/schemas";
import type { SettingsSectionStatus } from "@/features/settings/types";
import { useOrganization } from "@/providers/organization-provider";

const READ_PERMISSIONS = ["settings.read", "organization.read", "org.read"];
const WRITE_PERMISSIONS = ["settings.update", "organization.update", "org.update"];

export default function OrganizationSettingsPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission } = usePermissions();
  const canRead = hasAnyPermission(READ_PERMISSIONS);
  const canWrite = hasAnyPermission(WRITE_PERMISSIONS);
  const preferencesQuery = useOrganizationPreferences(currentOrganizationId ?? undefined, canRead);
  const updateMutation = useUpdateOrganizationPreferences(currentOrganizationId ?? undefined);

  const sectionDefinitions: SettingsSectionStatus[] = [
    { id: "organization", title: "Organization", description: "Entity profile and metadata", href: "/settings/organization", availability: "available", requiredPermissions: READ_PERMISSIONS, reason: "Live organization profile." },
    { id: "fiscal-periods", title: "Fiscal periods", description: "Open and close posting periods", href: "/settings/fiscal-periods", availability: "available", requiredPermissions: ["settings.read", "periods.read"], reason: "Backend-backed period controls." },
    { id: "tax", title: "Tax", description: "Tax code maintenance", href: "/settings/tax", availability: "available", requiredPermissions: ["settings.read", "tax_codes.read", "tax.settings.read"], reason: "Tax configuration surface." },
    { id: "preferences", title: "Preferences", description: "Numbering and accounting defaults", href: "/settings/preferences", availability: "available", requiredPermissions: ["settings.read", "branding.read", "numbering.read"], reason: "Document/accounting preferences." },
  ];
  const sections = sectionDefinitions.map((section) => ({
    ...section,
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

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={currentOrganization?.name || "Settings"} title="Organization settings" description="Maintain entity profile fields while leaving validation and persistence rules to the backend." />
      <SettingsNav sections={sections} activeHref="/settings/organization" />
      <SettingsSectionShell title="Organization preferences" description="Editable when the backend exposes update support and your role includes write access.">
        {canWrite ? <OrganizationPreferencesForm preferences={preferencesQuery.data} onSubmit={handleSubmit} isSubmitting={updateMutation.isPending} /> : <SettingsReadonlyCard title="Read-only organization settings" description="Your current role can view organization preferences but cannot update them." />}
      </SettingsSectionShell>
    </div>
  );
}
