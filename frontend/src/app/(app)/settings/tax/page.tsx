"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/permissions/hooks";
import { SETTINGS_NAV_SECTIONS, SETTINGS_PERMISSION_GROUPS } from "@/features/settings/constants";
import { SettingsAvailabilityCard } from "@/features/settings/components/settings-availability-card";
import { SettingsEmptyState } from "@/features/settings/components/settings-empty-state";
import { SettingsErrorState } from "@/features/settings/components/settings-error-state";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { SettingsReadonlyCard } from "@/features/settings/components/settings-readonly-card";
import { SettingsSectionShell } from "@/features/settings/components/settings-section-shell";
import { TaxCodeFormDialog } from "@/features/settings/components/tax-code-form-dialog";
import { TaxCodeListTable } from "@/features/settings/components/tax-code-list-table";
import { useArchiveTaxCode, useCreateTaxCode, useTaxCodes, useUpdateTaxCode } from "@/features/settings/hooks";
import type { TaxCodeFormValues } from "@/features/settings/schemas";
import type { TaxCodeRecord } from "@/features/settings/types";
import { useOrganization } from "@/providers/organization-provider";

export default function TaxSettingsPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission } = usePermissions();
  const canRead = hasAnyPermission(SETTINGS_PERMISSION_GROUPS.taxRead);
  const canCreate = hasAnyPermission(SETTINGS_PERMISSION_GROUPS.taxCreate);
  const canUpdate = hasAnyPermission(SETTINGS_PERMISSION_GROUPS.taxUpdate);
  const canArchive = hasAnyPermission(SETTINGS_PERMISSION_GROUPS.taxArchive);
  const taxCodesQuery = useTaxCodes(currentOrganizationId ?? undefined, canRead);
  const createMutation = useCreateTaxCode(currentOrganizationId ?? undefined);
  const [editingTaxCode, setEditingTaxCode] = React.useState<TaxCodeRecord | null>(null);
  const [archivingTaxCode, setArchivingTaxCode] = React.useState<TaxCodeRecord | null>(null);
  const updateMutation = useUpdateTaxCode(currentOrganizationId ?? undefined, editingTaxCode?.id ?? undefined);
  const archiveMutation = useArchiveTaxCode(currentOrganizationId ?? undefined, archivingTaxCode?.id ?? undefined);

  const taxCollection = taxCodesQuery.data ?? null;
  const taxCodes = taxCollection?.items ?? [];
  const supportsWrite = Boolean(taxCollection?.supportsWrite);
  const readOnlyReason = taxCollection?.readOnlyReason ?? null;

  const sections = SETTINGS_NAV_SECTIONS.map((section) => ({
    ...section,
    availability: section.id === "tax" ? taxCollection === null ? "unavailable" as const : supportsWrite ? "available" as const : "read-only" as const : "available" as const,
    reason: section.id === "tax" ? (taxCollection === null ? "Tax code endpoints are not enabled." : supportsWrite ? "Backend supports full tax-code maintenance." : readOnlyReason) : "Related settings module.",
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
      <PageHeader eyebrow={currentOrganization?.name || "Settings"} title="Tax configuration" description="Maintain tax codes where the backend exposes the simplified tax-code contract, and surface read-only compatibility states otherwise." actions={canCreate && supportsWrite ? <Button onClick={() => setEditingTaxCode({ id: "", organizationId: currentOrganizationId, name: "", code: "", rate: "0", type: null, description: null, appliesToSales: true, appliesToPurchases: true, isActive: true, isDefaultSales: false, isDefaultPurchases: false, createdAt: null, updatedAt: null })}><Plus className="size-4" />New tax code</Button> : null} />
      <PageActionBar left={<div className="text-sm text-muted-foreground">Tax engine logic, compound behavior, and validity rules remain backend-owned.</div>} right={<div className="text-sm text-muted-foreground">{taxCodes.length} tax code{taxCodes.length === 1 ? "" : "s"}</div>} />
      <SettingsNav sections={sections} activeHref="/settings/tax" />
      {taxCollection === null ? <SettingsAvailabilityCard section={sections.find((section) => section.id === "tax")!} isPermitted /> : taxCodes.length === 0 ? <SettingsEmptyState title="No tax codes" description="The backend returned no tax codes for this organization." /> : (
        <SettingsSectionShell title="Tax codes" description="Create, update, and archive tax codes only when backend endpoints explicitly support this simplified UI contract.">
          {!supportsWrite ? <div className="mb-4"><SettingsReadonlyCard title="Read-only tax compatibility mode" description={readOnlyReason ?? "Tax code writes are disabled for this backend contract."} /></div> : null}
          <TaxCodeListTable taxCodes={taxCodes} canEdit={canUpdate && supportsWrite} canArchive={canArchive && supportsWrite} onEdit={setEditingTaxCode} onArchive={handleArchive} />
        </SettingsSectionShell>
      )}
      <TaxCodeFormDialog open={Boolean(editingTaxCode)} onOpenChange={(open) => { if (!open) setEditingTaxCode(null); }} taxCode={editingTaxCode?.id ? editingTaxCode : null} onSubmit={handleSubmit} isSubmitting={createMutation.isPending || updateMutation.isPending} readOnlyReason={supportsWrite ? null : readOnlyReason} />
    </div>
  );
}
