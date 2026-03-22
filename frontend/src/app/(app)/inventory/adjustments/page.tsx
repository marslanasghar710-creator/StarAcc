"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccounts } from "@/features/accounts/hooks";
import { InventoryAdjustmentFormDialog } from "@/features/inventory/components/inventory-adjustment-form-dialog";
import { InventoryAdjustmentListTable } from "@/features/inventory/components/inventory-adjustment-list-table";
import { useCreateInventoryAdjustment, useInventoryAdjustments, useInventoryLocations, useItems } from "@/features/inventory/hooks";
import { type InventoryAdjustmentFormValues } from "@/features/inventory/schemas";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toPayload(values: InventoryAdjustmentFormValues) {
  return {
    item_id: values.item_id,
    location_id: values.location_id || null,
    adjustment_type: values.adjustment_type,
    quantity: values.quantity.trim(),
    unit_cost: values.unit_cost?.trim() || null,
    reason: values.reason.trim(),
    notes: values.notes?.trim() || null,
    offset_account_id: values.offset_account_id,
    occurred_at: new Date(values.occurred_at).toISOString(),
  };
}

export default function InventoryAdjustmentsPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("inventory.read");
  const canAdjust = can("inventory.adjust");
  const canReadAccounts = can("accounts.read");
  const [search, setSearch] = React.useState("");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  const adjustmentsQuery = useInventoryAdjustments(currentOrganizationId ?? undefined, canRead);
  const itemsQuery = useItems(currentOrganizationId ?? undefined, "", canRead);
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", canReadAccounts);
  const locationsQuery = useInventoryLocations(currentOrganizationId ?? undefined, canRead);
  const createAdjustmentMutation = useCreateInventoryAdjustment(currentOrganizationId ?? undefined);

  const filteredAdjustments = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const items = adjustmentsQuery.data ?? [];
    if (!term) {
      return items;
    }

    return items.filter((adjustment) => [adjustment.reason, adjustment.notes, adjustment.id].some((value) => value?.toLowerCase().includes(term)));
  }, [adjustmentsQuery.data, search]);

  const itemNames = React.useMemo(
    () => Object.fromEntries((itemsQuery.data ?? []).map((item) => [item.id, item.name])),
    [itemsQuery.data],
  );
  const accountNames = React.useMemo(
    () => Object.fromEntries((accountsQuery.data ?? []).map((account) => [account.id, `${account.code} · ${account.name}`])),
    [accountsQuery.data],
  );

  async function handleCreateAdjustment(values: InventoryAdjustmentFormValues) {
    const created = await createAdjustmentMutation.mutateAsync(toPayload(values));
    toast.success(`Created adjustment ${created.reason}`);
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading inventory adjustments" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening inventory adjustments." />;
  }

  if (!canRead) {
    return <AccessDeniedState description="You need inventory.read to view inventory adjustment history." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Inventory"}
        title="Inventory adjustments"
        description="Review stock write-ups, write-downs, and opening-balance entries posted through the backend inventory workflow."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/inventory"><ArrowLeft className="size-4" />Back to inventory</Link></Button>
            {canAdjust ? <Button onClick={() => setIsCreateOpen(true)}><Plus className="size-4" />New adjustment</Button> : null}
          </div>
        }
      />

      <PageActionBar left={<Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reasons, notes, or adjustment id" className="max-w-md" />} right={<p className="text-sm text-muted-foreground">Adjustments remain audit-sensitive and backend-validated.</p>} />

      {adjustmentsQuery.isLoading ? <LoadingScreen label="Loading adjustments" /> : null}
      {adjustmentsQuery.isError ? <ErrorState description="We couldn't load inventory adjustments." onRetry={() => void adjustmentsQuery.refetch()} /> : null}
      {!adjustmentsQuery.isLoading && !adjustmentsQuery.isError && filteredAdjustments.length === 0 ? (
        <EmptyState
          title={search ? "No matching adjustments" : "No inventory adjustments yet"}
          description={search ? "Try a broader search term to find the adjustment you need." : "Create the first inventory adjustment to record opening stock or stock corrections."}
          action={canAdjust ? <Button onClick={() => setIsCreateOpen(true)}>Create adjustment</Button> : undefined}
        />
      ) : null}
      {!adjustmentsQuery.isLoading && !adjustmentsQuery.isError && filteredAdjustments.length > 0 ? (
        <InventoryAdjustmentListTable adjustments={filteredAdjustments} itemNames={itemNames} accountNames={accountNames} currencyCode={currentOrganization?.base_currency} />
      ) : null}

      <InventoryAdjustmentFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateAdjustment}
        isSubmitting={createAdjustmentMutation.isPending}
        itemOptions={(itemsQuery.data ?? []).map((item) => ({ label: `${item.sku || "—"} · ${item.name}`, value: item.id }))}
        accountOptions={(accountsQuery.data ?? []).map((account) => ({ label: `${account.code} · ${account.name}`, value: account.id }))}
        locationOptions={(locationsQuery.data ?? []).map((location) => ({ label: `${location.code} · ${location.name}`, value: location.id }))}
      />
    </div>
  );
}
