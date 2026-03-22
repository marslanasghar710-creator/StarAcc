"use client";

import * as React from "react";

import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { usePermissions } from "@/features/permissions/hooks";
import { AccountingSettingsForm } from "@/features/settings/components/accounting-settings-form";
import { DocumentSettingsForm } from "@/features/settings/components/document-settings-form";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { SettingsReadonlyCard } from "@/features/settings/components/settings-readonly-card";
import { SettingsSectionShell } from "@/features/settings/components/settings-section-shell";
import { SettingsErrorState } from "@/features/settings/components/settings-error-state";
import { useAccountingSettings, useDocumentSettings, useUpdateAccountingSettings, useUpdateDocumentSettings } from "@/features/settings/hooks";
import type { AccountingSettingsFormValues, DocumentSettingsFormValues } from "@/features/settings/schemas";
import type { SettingsSectionStatus } from "@/features/settings/types";
import { useOrganization } from "@/providers/organization-provider";

const READ_PERMISSIONS = ["settings.read", "branding.read", "numbering.read"];
const WRITE_PERMISSIONS = ["settings.update", "branding.update", "numbering.update"];

export default function PreferencesPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission } = usePermissions();
  const canRead = hasAnyPermission(READ_PERMISSIONS);
  const canWrite = hasAnyPermission(WRITE_PERMISSIONS);
  const documentQuery = useDocumentSettings(currentOrganizationId ?? undefined, canRead);
  const accountingQuery = useAccountingSettings(currentOrganizationId ?? undefined, canRead);
  const updateDocumentMutation = useUpdateDocumentSettings(currentOrganizationId ?? undefined);
  const updateAccountingMutation = useUpdateAccountingSettings(currentOrganizationId ?? undefined);

  const sectionDefinitions: SettingsSectionStatus[] = [
    { id: "organization", title: "Organization", description: "Entity profile and metadata", href: "/settings/organization", availability: "available", requiredPermissions: ["settings.read"], reason: "Organization profile." },
    { id: "fiscal-periods", title: "Fiscal periods", description: "Open and close posting periods", href: "/settings/fiscal-periods", availability: "available", requiredPermissions: ["settings.read", "periods.read"], reason: "Period controls." },
    { id: "tax", title: "Tax", description: "Tax code maintenance", href: "/settings/tax", availability: "available", requiredPermissions: ["settings.read", "tax_codes.read", "tax.settings.read"], reason: "Tax configuration surface." },
    { id: "preferences", title: "Preferences", description: "Numbering and accounting defaults", href: "/settings/preferences", availability: documentQuery.data || accountingQuery.data ? "available" : "read-only", requiredPermissions: READ_PERMISSIONS, reason: documentQuery.data || accountingQuery.data ? "Live settings where backend supports them." : "Read-only scaffold until backend preference endpoints are available." },
  ];
  const sections = sectionDefinitions.map((section) => ({
    ...section,
    isPermitted: hasAnyPermission(section.requiredPermissions),
  }));

  async function handleDocumentSubmit(values: DocumentSettingsFormValues) {
    await updateDocumentMutation.mutateAsync({
      invoice_prefix: values.invoice_prefix || null,
      bill_prefix: values.bill_prefix || null,
      journal_prefix: values.journal_prefix || null,
      credit_note_prefix: values.credit_note_prefix || null,
    });
    toast.success("Saved document settings");
  }

  async function handleAccountingSubmit(values: AccountingSettingsFormValues) {
    await updateAccountingMutation.mutateAsync({
      default_locale: values.default_locale || null,
      date_format: values.date_format || null,
      number_format: values.number_format || null,
      tax_enabled: values.tax_enabled,
      multi_currency_enabled: values.multi_currency_enabled,
      base_currency: values.base_currency || null,
      timezone: values.timezone || null,
    });
    toast.success("Saved accounting settings");
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading preferences" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening preferences." />;
  if (!canRead) return <AccessDeniedState description="You need settings, branding, or numbering permissions to view preferences." />;
  if (documentQuery.isLoading || accountingQuery.isLoading) return <LoadingScreen label="Loading preferences" />;
  if (documentQuery.isError || accountingQuery.isError) return <SettingsErrorState title="Preferences unavailable" description="We couldn't load document or accounting settings." onRetry={() => { void documentQuery.refetch(); void accountingQuery.refetch(); }} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={currentOrganization?.name || "Settings"} title="Preferences" description="Separate editable backend-backed preferences from read-only or not-yet-available settings surfaces." />
      <SettingsNav sections={sections} activeHref="/settings/preferences" />
      <SettingsSectionShell title="Document settings" description="Numbering prefixes and related document controls.">
        {documentQuery.data ? (
          <DocumentSettingsForm settings={documentQuery.data} onSubmit={handleDocumentSubmit} isSubmitting={updateDocumentMutation.isPending} readOnly={!canWrite} />
        ) : (
          <SettingsReadonlyCard title="Document settings unavailable" description="This backend does not yet expose dedicated document settings endpoints for the active organization." />
        )}
      </SettingsSectionShell>
      <SettingsSectionShell title="Accounting settings" description="Locale, number format, multi-currency, and presentation-related defaults.">
        {accountingQuery.data ? (
          <AccountingSettingsForm settings={accountingQuery.data} onSubmit={handleAccountingSubmit} isSubmitting={updateAccountingMutation.isPending} readOnly={!canWrite} />
        ) : (
          <SettingsReadonlyCard title="Accounting settings unavailable" description="Accounting settings are not exposed separately by this backend yet." />
        )}
      </SettingsSectionShell>
    </div>
  );
}
