"use client";

import * as React from "react";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/permissions/hooks";
import { SettingsAvailabilityCard } from "@/features/settings/components/settings-availability-card";
import { SettingsEmptyState } from "@/features/settings/components/settings-empty-state";
import { SettingsErrorState } from "@/features/settings/components/settings-error-state";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { SettingsSectionShell } from "@/features/settings/components/settings-section-shell";
import { TaxCodeFormDialog } from "@/features/settings/components/tax-code-form-dialog";
import { TaxCodeListTable } from "@/features/settings/components/tax-code-list-table";
import { useArchiveTaxCode, useCreateTaxCode, useTaxCodes, useUpdateTaxCode } from "@/features/settings/hooks";
import type { TaxCodeFormValues } from "@/features/settings/schemas";
import type { SettingsSectionStatus, TaxCodeRecord } from "@/features/settings/types";
import { useOrganization } from "@/providers/organization-provider";

const READ_PERMISSIONS = ["settings.read", "tax_codes.read", "tax.settings.read"];
const CREATE_PERMISSIONS = ["tax_codes.create", "tax_rates.create"];
const UPDATE_PERMISSIONS = ["tax_codes.update", "tax_rates.update"];
const ARCHIVE_PERMISSIONS = ["tax_codes.archive", "tax_rates.archive"];

export default function TaxSettingsPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission } = usePermissions();
  const canRead = hasAnyPermission(READ_PERMISSIONS);
  const canCreate = hasAnyPermission(CREATE_PERMISSIONS);
  const canUpdate = hasAnyPermission(UPDATE_PERMISSIONS);
  const canArchive = hasAnyPermission(ARCHIVE_PERMISSIONS);
  const taxCodesQuery = useTaxCodes(currentOrganizationId ?? undefined, canRead);
  const createMutation = useCreateTaxCode(currentOrganizationId ?? undefined);
  const [editingTaxCode, setEditingTaxCode] = React.useState<TaxCodeRecord | null>(null);
  const [archivingTaxCode, setArchivingTaxCode] = React.useState<TaxCodeRecord | null>(null);
  const updateMutation = useUpdateTaxCode(currentOrganizationId ?? undefined, editingTaxCode?.id ?? undefined);
  const archiveMutation = useArchiveTaxCode(currentOrganizationId ?? undefined, archivingTaxCode?.id ?? undefined);

  const taxCodes = taxCodesQuery.data ?? [];
  const sectionDefinitions: SettingsSectionStatus[] = [
    { id: "organization", title: "Organization", description: "Entity profile and metadata", href: "/settings/organization", availability: "available", requiredPermissions: ["settings.read"], reason: "Organization profile." },
    { id: "fiscal-periods", title: "Fiscal periods", description: "Open and close posting periods", href: "/settings/fiscal-periods", availability: "available", requiredPermissions: ["settings.read", "periods.read"], reason: "Period controls." },
    { id: "tax", title: "Tax", description: "Tax code maintenance", href: "/settings/tax", availability: taxCodesQuery.data === null ? "unavailable" : "available", requiredPermissions: READ_PERMISSIONS, reason: taxCodesQuery.data === null ? "Backend tax code endpoints are not available." : "Tax codes are live." },
    { id: "preferences", title: "Preferences", description: "Numbering and accounting defaults", href: "/settings/preferences", availability: "available", requiredPermissions: ["settings.read", "branding.read", "numbering.read"], reason: "Preferences surface." },
  ];
  const sections = sectionDefinitions.map((section) => ({
    ...section,
    isPermitted: hasAnyPermission(section.requiredPermissions),
  }));

  async function handleSubmit(values: TaxCodeFormValues) {
    const payload = {
      name: values.name.trim(),
      code: values.code.trim(),
      rate: values.rate,
      type: values.type || null,
      description: values.description || null,
      applies_to_sales: values.applies_to_sales,
      applies_to_purchases: values.applies_to_purchases,
      is_active: values.is_active,
    };

    if (editingTaxCode?.id) {
      await updateMutation.mutateAsync(payload);
      toast.success(`Updated ${editingTaxCode.name}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      toast.success(`Created ${created.name}`);
    }
    setEditingTaxCode(null);
  }

  async function handleArchive(taxCode: TaxCodeRecord) {
    setArchivingTaxCode(taxCode);
    try {
      await archiveMutation.mutateAsync();
      toast.success(`Archived ${taxCode.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to archive tax code.");
    } finally {
      setArchivingTaxCode(null);
    }
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading tax settings" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening tax settings." />;
  if (!canRead) return <AccessDeniedState description="You need tax/settings permissions to view this page." />;
  if (taxCodesQuery.isLoading) return <LoadingScreen label="Loading tax settings" />;
  if (taxCodesQuery.isError) return <SettingsErrorState title="Tax settings unavailable" description="We couldn't load tax codes from the backend." onRetry={() => void taxCodesQuery.refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={currentOrganization?.name || "Settings"} title="Tax configuration" description="Maintain tax codes only where the backend exposes live endpoints and keeps calculation truth authoritative." actions={canCreate && taxCodesQuery.data !== null ? <Button onClick={() => setEditingTaxCode({ id: "", organizationId: currentOrganizationId, name: "", code: "", rate: "0", type: null, description: null, appliesToSales: true, appliesToPurchases: true, isActive: true, isDefaultSales: false, isDefaultPurchases: false, createdAt: null, updatedAt: null })}><Plus className="size-4" />New tax code</Button> : null} />
      <SettingsNav sections={sections} activeHref="/settings/tax" />
      {taxCodesQuery.data === null ? <SettingsAvailabilityCard section={sections[2]} isPermitted /> : taxCodes.length === 0 ? <SettingsEmptyState title="No tax codes" description="The backend returned no tax codes for this organization." /> : (
        <SettingsSectionShell title="Tax codes" description="Create, update, and archive tax codes only where backend endpoints are implemented.">
          <TaxCodeListTable taxCodes={taxCodes} canEdit={canUpdate} canArchive={canArchive} onEdit={setEditingTaxCode} onArchive={handleArchive} />
        </SettingsSectionShell>
      )}
      <TaxCodeFormDialog open={Boolean(editingTaxCode)} onOpenChange={(open) => { if (!open) setEditingTaxCode(null); }} taxCode={editingTaxCode?.id ? editingTaxCode : null} onSubmit={handleSubmit} isSubmitting={createMutation.isPending || updateMutation.isPending} />
    </div>
  );
}
