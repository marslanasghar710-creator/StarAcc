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
import type { FiscalPeriodRecord } from "@/features/settings/types";
import { useOrganization } from "@/providers/organization-provider";

export default function FiscalPeriodsPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission } = usePermissions();
  const canRead = hasAnyPermission(SETTINGS_PERMISSION_GROUPS.fiscalPeriodsRead);
  const canCreate = hasAnyPermission(SETTINGS_PERMISSION_GROUPS.fiscalPeriodsCreate);
  const canUpdate = hasAnyPermission(SETTINGS_PERMISSION_GROUPS.fiscalPeriodsUpdate);
  const canClose = hasAnyPermission(SETTINGS_PERMISSION_GROUPS.fiscalPeriodsClose);
  const canReopen = hasAnyPermission(SETTINGS_PERMISSION_GROUPS.fiscalPeriodsReopen);
  const periodsQuery = useFiscalPeriods(currentOrganizationId ?? undefined, canRead);
  const createMutation = useCreateFiscalPeriod(currentOrganizationId ?? undefined);
  const [editingPeriod, setEditingPeriod] = React.useState<FiscalPeriodRecord | null>(null);
  const [closingPeriod, setClosingPeriod] = React.useState<FiscalPeriodRecord | null>(null);
  const [reopeningPeriod, setReopeningPeriod] = React.useState<FiscalPeriodRecord | null>(null);
  const updateMutation = useUpdateFiscalPeriod(currentOrganizationId ?? undefined, editingPeriod?.id ?? undefined);
  const closeMutation = useCloseFiscalPeriod(currentOrganizationId ?? undefined, closingPeriod?.id ?? undefined);
  const reopenMutation = useReopenFiscalPeriod(currentOrganizationId ?? undefined, reopeningPeriod?.id ?? undefined);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const sections = SETTINGS_NAV_SECTIONS.map((section) => ({
    ...section,
    availability: "available" as const,
    reason: section.id === "fiscal-periods" ? "Backend-owned period lifecycle." : "Related settings module.",
    isPermitted: hasAnyPermission(section.requiredPermissions),
  }));

  async function handleSubmit(values: FiscalPeriodFormValues) {
    const startDate = new Date(values.start_date);
    const payload = {
      name: values.name.trim(),
      start_date: values.start_date,
      end_date: values.end_date,
      fiscal_year: startDate.getUTCFullYear(),
      period_number: startDate.getUTCMonth() + 1,
      notes: values.notes || null,
    };

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
      const updated = await closeMutation.mutateAsync();
      toast.success(`Closed ${updated.name}`);
      setClosingPeriod(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to close fiscal period.");
    }
  }

  async function handleReopen() {
    if (!reopeningPeriod) return;
    setActionError(null);
    try {
      const updated = await reopenMutation.mutateAsync();
      toast.success(`Reopened ${updated.name}`);
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
      <PageHeader eyebrow={currentOrganization?.name || "Settings"} title="Fiscal periods" description="Manage reporting periods while leaving close and reopen rules entirely to the backend." actions={canCreate ? <Button onClick={() => setEditingPeriod({ id: "", organizationId: currentOrganizationId, name: "", startDate: "", endDate: "", status: "open", fiscalYear: null, periodNumber: null, closedAt: null, closedBy: null, notes: null })}><Plus className="size-4" />New period</Button> : null} />
      <PageActionBar left={<div className="text-sm text-muted-foreground">Close and reopen actions always round-trip to the backend; validation failures are surfaced without local overrides.</div>} right={<div className="text-sm text-muted-foreground">{periods.length} period{periods.length === 1 ? "" : "s"}</div>} />
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
