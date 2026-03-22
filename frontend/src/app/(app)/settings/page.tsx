"use client";

import * as React from "react";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { PageHeader } from "@/components/layout/page-header";
import { usePermissions } from "@/features/permissions/hooks";
import { SettingsAvailabilityCard } from "@/features/settings/components/settings-availability-card";
import { SettingsErrorState } from "@/features/settings/components/settings-error-state";
import { SettingsLoadingSkeleton } from "@/features/settings/components/settings-loading-skeleton";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { useAccountingSettings, useDocumentSettings, useFiscalPeriods, useOrganizationPreferences, useTaxCodes } from "@/features/settings/hooks";
import type { SettingsSectionStatus } from "@/features/settings/types";
import { useOrganization } from "@/providers/organization-provider";

const SETTINGS_ACCESS = ["settings.read", "organization.read", "org.read", "periods.read", "tax_codes.read", "tax.settings.read", "branding.read", "numbering.read"];

export default function SettingsLandingPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission } = usePermissions();
  const canReadSettings = hasAnyPermission(SETTINGS_ACCESS);
  const orgQuery = useOrganizationPreferences(currentOrganizationId ?? undefined, canReadSettings);
  const periodsQuery = useFiscalPeriods(currentOrganizationId ?? undefined, canReadSettings);
  const taxQuery = useTaxCodes(currentOrganizationId ?? undefined, canReadSettings);
  const documentQuery = useDocumentSettings(currentOrganizationId ?? undefined, canReadSettings);
  const accountingQuery = useAccountingSettings(currentOrganizationId ?? undefined, canReadSettings);

  if (isLoadingOrganizations) return <LoadingScreen label="Loading settings" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening settings." />;
  if (!canReadSettings) return <AccessDeniedState description="You need settings-related permissions to view this area." />;
  if (orgQuery.isLoading || periodsQuery.isLoading || taxQuery.isLoading || documentQuery.isLoading || accountingQuery.isLoading) return <SettingsLoadingSkeleton />;
  if (orgQuery.isError || periodsQuery.isError || taxQuery.isError || documentQuery.isError || accountingQuery.isError) return <SettingsErrorState title="Settings unavailable" description="We couldn't load one or more settings surfaces for this organization." onRetry={() => { void orgQuery.refetch(); void periodsQuery.refetch(); void taxQuery.refetch(); void documentQuery.refetch(); void accountingQuery.refetch(); }} />;

  const taxCodes = taxQuery.data ?? [];
  const sections: SettingsSectionStatus[] = [
    {
      id: "organization",
      title: "Organization",
      description: "Legal entity profile, registration details, and core organization metadata.",
      href: "/settings/organization",
      availability: orgQuery.data ? "available" : "unavailable",
      requiredPermissions: ["settings.read", "organization.read", "org.read"],
      reason: orgQuery.data ? "Live organization profile and metadata." : "Organization preferences are not available for this backend.",
    },
    {
      id: "fiscal-periods",
      title: "Fiscal periods",
      description: "Maintain posting periods and trigger close/reopen actions when the backend supports them.",
      href: "/settings/fiscal-periods",
      availability: periodsQuery.data ? "available" : "unavailable",
      requiredPermissions: ["settings.read", "periods.read"],
      reason: periodsQuery.data ? `${periodsQuery.data.length} period records available.` : "Fiscal period endpoints are not available for this organization.",
    },
    {
      id: "tax",
      title: "Tax configuration",
      description: "Review and maintain tax codes without moving tax logic into the frontend.",
      href: "/settings/tax",
      availability: taxQuery.data === null ? "unavailable" : "available",
      requiredPermissions: ["settings.read", "tax_codes.read", "tax.settings.read"],
      reason: taxQuery.data === null ? "Tax code endpoints are not yet enabled in this backend." : `${taxCodes.length} tax codes available.`,
    },
    {
      id: "preferences",
      title: "Preferences",
      description: "Document numbering, locale, and accounting presentation settings.",
      href: "/settings/preferences",
      availability: documentQuery.data || accountingQuery.data ? "available" : "read-only",
      requiredPermissions: ["settings.read", "branding.read", "numbering.read"],
      reason: documentQuery.data || accountingQuery.data ? "Live settings are available from backend-backed organization settings surfaces." : "Preference endpoints are not fully available yet; read-only scaffolding remains in place.",
    },
  ];
  const sectionsWithAccess = sections.map((section) => ({ ...section, isPermitted: hasAnyPermission(section.requiredPermissions) }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={currentOrganization?.name || "Settings"} title="Settings" description="Admin-focused configuration areas with explicit live, read-only, and unavailable states." />
      <PageActionBar left={<div className="text-sm text-muted-foreground">The backend remains authoritative for fiscal period controls, tax validity, numbering rules, and organization preferences.</div>} />
      <SettingsNav sections={sectionsWithAccess} activeHref="/settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        {sectionsWithAccess.map((section) => <SettingsAvailabilityCard key={section.id} section={section} isPermitted={section.isPermitted ?? true} />)}
      </div>
    </div>
  );
}
