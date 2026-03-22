"use client";

import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { usePermissions } from "@/features/permissions/hooks";
import { SETTINGS_NAV_SECTIONS, SETTINGS_PERMISSION_GROUPS } from "@/features/settings/constants";
import { AccountingSettingsForm } from "@/features/settings/components/accounting-settings-form";
import { DocumentSettingsForm } from "@/features/settings/components/document-settings-form";
import { SettingsErrorState } from "@/features/settings/components/settings-error-state";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { SettingsReadonlyCard } from "@/features/settings/components/settings-readonly-card";
import { SettingsSectionShell } from "@/features/settings/components/settings-section-shell";
import { useAccountingSettings, useDocumentSettings, useUpdateAccountingSettings, useUpdateDocumentSettings } from "@/features/settings/hooks";
import type { AccountingSettingsFormValues, DocumentSettingsFormValues } from "@/features/settings/schemas";
import { useOrganization } from "@/providers/organization-provider";

export default function PreferencesPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission } = usePermissions();
  const canRead = hasAnyPermission(SETTINGS_PERMISSION_GROUPS.preferencesRead);
  const canWrite = hasAnyPermission(SETTINGS_PERMISSION_GROUPS.preferencesWrite);
  const documentQuery = useDocumentSettings(currentOrganizationId ?? undefined, canRead);
  const accountingQuery = useAccountingSettings(currentOrganizationId ?? undefined, canRead);
  const updateDocumentMutation = useUpdateDocumentSettings(currentOrganizationId ?? undefined);
  const updateAccountingMutation = useUpdateAccountingSettings(currentOrganizationId ?? undefined);

  const sections = SETTINGS_NAV_SECTIONS.map((section) => ({
    ...section,
    availability: section.id === "preferences" ? documentQuery.data || accountingQuery.data ? "available" as const : "read-only" as const : "available" as const,
    reason: section.id === "preferences" ? documentQuery.data || accountingQuery.data ? "Backend-backed preferences are available." : "Preference endpoints are not currently writable for this org/backend combination." : "Related settings module.",
    isPermitted: hasAnyPermission(section.requiredPermissions),
  }));

  async function handleDocumentSubmit(values: DocumentSettingsFormValues) {
    await updateDocumentMutation.mutateAsync({
      invoice_prefix: values.invoice_prefix || null,
      bill_prefix: values.bill_prefix || null,
      journal_prefix: values.journal_prefix || null,
      credit_note_prefix: values.credit_note_prefix || null,
      payment_prefix: values.payment_prefix || null,
      supplier_credit_prefix: values.supplier_credit_prefix || null,
      supplier_payment_prefix: values.supplier_payment_prefix || null,
      quote_prefix: values.quote_prefix || null,
      purchase_order_prefix: values.purchase_order_prefix || null,
      next_invoice_number: values.next_invoice_number ? Number.parseInt(values.next_invoice_number, 10) : null,
      next_bill_number: values.next_bill_number ? Number.parseInt(values.next_bill_number, 10) : null,
      next_journal_number: values.next_journal_number ? Number.parseInt(values.next_journal_number, 10) : null,
      next_credit_note_number: values.next_credit_note_number ? Number.parseInt(values.next_credit_note_number, 10) : null,
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
      week_start_day: values.week_start_day === "" ? null : Number.parseInt(values.week_start_day, 10),
      default_document_language: values.default_document_language || null,
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
      <PageHeader eyebrow={currentOrganization?.name || "Settings"} title="Preferences" description="Document numbering, locale, and accounting defaults remain backend-backed and are grouped here for dense operational workflows." />
      <PageActionBar left={<div className="text-sm text-muted-foreground">Preferences may be served by dedicated endpoints or compatible legacy settings routes; the UI documents that distinction instead of inventing client truth.</div>} right={<div className="text-sm text-muted-foreground">{canWrite ? "Editable" : "Read only"}</div>} />
      <SettingsNav sections={sections} activeHref="/settings/preferences" />
      <SettingsSectionShell title="Document settings" description="Numbering prefixes and next-number previews when the backend provides them.">
        {documentQuery.data ? (
          <DocumentSettingsForm settings={documentQuery.data} onSubmit={handleDocumentSubmit} isSubmitting={updateDocumentMutation.isPending} readOnly={!canWrite} />
        ) : (
          <SettingsReadonlyCard title="Document settings unavailable" description="This backend does not currently expose document or numbering settings for the active organization." />
        )}
      </SettingsSectionShell>
      <SettingsSectionShell title="Accounting settings" description="Locale, date format, week start, and related presentation defaults.">
        {accountingQuery.data ? (
          <AccountingSettingsForm settings={accountingQuery.data} onSubmit={handleAccountingSubmit} isSubmitting={updateAccountingMutation.isPending} readOnly={!canWrite} />
        ) : (
          <SettingsReadonlyCard title="Accounting settings unavailable" description="Accounting settings are not exposed separately by this backend yet." />
        )}
      </SettingsSectionShell>
    </div>
  );
}
