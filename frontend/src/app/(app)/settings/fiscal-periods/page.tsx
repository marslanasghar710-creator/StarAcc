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
import { ClosePeriodDialog } from "@/features/settings/components/close-period-dialog";
import { FiscalPeriodDetailCard } from "@/features/settings/components/fiscal-period-detail-card";
import { FiscalPeriodFormDialog } from "@/features/settings/components/fiscal-period-form-dialog";
import { FiscalPeriodListTable } from "@/features/settings/components/fiscal-period-list-table";
import { ReopenPeriodDialog } from "@/features/settings/components/reopen-period-dialog";
import { SettingsEmptyState } from "@/features/settings/components/settings-empty-state";
import { SettingsErrorState } from "@/features/settings/components/settings-error-state";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { SettingsSectionShell } from "@/features/settings/components/settings-section-shell";
import { useCloseFiscalPeriod, useCreateFiscalPeriod, useFiscalPeriods, useReopenFiscalPeriod, useUpdateFiscalPeriod } from "@/features/settings/hooks";
import type { FiscalPeriodFormValues } from "@/features/settings/schemas";
import type { FiscalPeriodRecord, SettingsSectionStatus } from "@/features/settings/types";
import { useOrganization } from "@/providers/organization-provider";

const READ_PERMISSIONS = ["settings.read", "periods.read", "fiscal_periods.read"];
const CREATE_PERMISSIONS = ["periods.create", "fiscal_periods.create"];
const UPDATE_PERMISSIONS = ["periods.update", "fiscal_periods.update"];
const CLOSE_PERMISSIONS = ["periods.close", "fiscal_periods.close"];
const REOPEN_PERMISSIONS = ["periods.reopen", "fiscal_periods.reopen"];

export default function FiscalPeriodsPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission } = usePermissions();
  const canRead = hasAnyPermission(READ_PERMISSIONS);
  const canCreate = hasAnyPermission(CREATE_PERMISSIONS);
  const canUpdate = hasAnyPermission(UPDATE_PERMISSIONS);
  const canClose = hasAnyPermission(CLOSE_PERMISSIONS);
  const canReopen = hasAnyPermission(REOPEN_PERMISSIONS);
  const periodsQuery = useFiscalPeriods(currentOrganizationId ?? undefined, canRead);
  const createMutation = useCreateFiscalPeriod(currentOrganizationId ?? undefined);
  const [editingPeriod, setEditingPeriod] = React.useState<FiscalPeriodRecord | null>(null);
  const [closingPeriod, setClosingPeriod] = React.useState<FiscalPeriodRecord | null>(null);
  const [reopeningPeriod, setReopeningPeriod] = React.useState<FiscalPeriodRecord | null>(null);
  const updateMutation = useUpdateFiscalPeriod(currentOrganizationId ?? undefined, editingPeriod?.id ?? undefined);
  const closeMutation = useCloseFiscalPeriod(currentOrganizationId ?? undefined, closingPeriod?.id ?? undefined);
  const reopenMutation = useReopenFiscalPeriod(currentOrganizationId ?? undefined, reopeningPeriod?.id ?? undefined);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const sectionDefinitions: SettingsSectionStatus[] = [
    { id: "organization", title: "Organization", description: "Entity profile and metadata", href: "/settings/organization", availability: "available", requiredPermissions: ["settings.read"], reason: "Organization profile." },
    { id: "fiscal-periods", title: "Fiscal periods", description: "Open and close posting periods", href: "/settings/fiscal-periods", availability: "available", requiredPermissions: READ_PERMISSIONS, reason: "Backend period management." },
    { id: "tax", title: "Tax", description: "Tax code maintenance", href: "/settings/tax", availability: "available", requiredPermissions: ["settings.read", "tax_codes.read", "tax.settings.read"], reason: "Tax configuration surface." },
    { id: "preferences", title: "Preferences", description: "Numbering and accounting defaults", href: "/settings/preferences", availability: "available", requiredPermissions: ["settings.read", "branding.read", "numbering.read"], reason: "Preferences surface." },
  ];
  const sections = sectionDefinitions.map((section) => ({
    ...section,
    isPermitted: hasAnyPermission(section.requiredPermissions),
  }));

  async function handleSubmit(values: FiscalPeriodFormValues) {
    const payload = { name: values.name.trim(), start_date: values.start_date, end_date: values.end_date, notes: values.notes || null };
    if (editingPeriod?.id) {
      await updateMutation.mutateAsync(payload);
      toast.success(`Updated ${editingPeriod.name}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      toast.success(`Created ${created.name}`);
    }
    setEditingPeriod(null);
  }

  async function handleClose() {
    if (!closingPeriod) return;
    setActionError(null);
    try {
      await closeMutation.mutateAsync();
      toast.success(`Closed ${closingPeriod.name}`);
      setClosingPeriod(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to close fiscal period.");
    }
  }

  async function handleReopen() {
    if (!reopeningPeriod) return;
    setActionError(null);
    try {
      await reopenMutation.mutateAsync();
      toast.success(`Reopened ${reopeningPeriod.name}`);
      setReopeningPeriod(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to reopen fiscal period.");
    }
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading fiscal periods" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening fiscal periods." />;
  if (!canRead) return <AccessDeniedState description="You need fiscal period permissions to view this page." />;
  if (periodsQuery.isLoading) return <LoadingScreen label="Loading fiscal periods" />;
  if (periodsQuery.isError || !periodsQuery.data) return <SettingsErrorState title="Fiscal periods unavailable" description="We couldn't load fiscal periods from the backend." onRetry={() => void periodsQuery.refetch()} />;

  const periods = periodsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={currentOrganization?.name || "Settings"} title="Fiscal periods" description="Manage reporting periods and backend-owned close/reopen actions for the active organization." actions={canCreate ? <Button onClick={() => setEditingPeriod({ id: "", organizationId: currentOrganizationId, name: "", startDate: "", endDate: "", status: "open", fiscalYear: null, periodNumber: null, closedAt: null, closedBy: null, notes: null })}><Plus className="size-4" />New period</Button> : null} />
      <SettingsNav sections={sections} activeHref="/settings/fiscal-periods" />
      {periods.length === 0 ? <SettingsEmptyState title="No fiscal periods" description="The backend returned no fiscal periods for this organization." /> : (
        <>
          <FiscalPeriodDetailCard period={periods[0]} />
          <SettingsSectionShell title="Fiscal period register" description="Create, update, close, and reopen actions defer to backend rules and validation.">
            <FiscalPeriodListTable periods={periods} canEdit={canUpdate} canClose={canClose} canReopen={canReopen} onEdit={setEditingPeriod} onClose={setClosingPeriod} onReopen={setReopeningPeriod} />
          </SettingsSectionShell>
        </>
      )}
      <FiscalPeriodFormDialog open={Boolean(editingPeriod)} onOpenChange={(open) => { if (!open) setEditingPeriod(null); }} period={editingPeriod?.id ? editingPeriod : null} onSubmit={handleSubmit} isSubmitting={createMutation.isPending || updateMutation.isPending} />
      <ClosePeriodDialog open={Boolean(closingPeriod)} onOpenChange={(open) => { if (!open) { setClosingPeriod(null); setActionError(null); } }} period={closingPeriod} onConfirm={handleClose} isSubmitting={closeMutation.isPending} error={actionError} />
      <ReopenPeriodDialog open={Boolean(reopeningPeriod)} onOpenChange={(open) => { if (!open) { setReopeningPeriod(null); setActionError(null); } }} period={reopeningPeriod} onConfirm={handleReopen} isSubmitting={reopenMutation.isPending} error={actionError} />
    </div>
  );
}
