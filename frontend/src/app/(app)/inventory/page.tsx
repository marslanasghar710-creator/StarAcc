"use client";

import * as React from "react";
import Link from "next/link";
import { Boxes, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { DecimalDisplay } from "@/components/shared/decimal-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccounts } from "@/features/accounts/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { useTaxCodes } from "@/features/settings/hooks";
import { InventoryValuationCard } from "@/features/inventory/components/inventory-valuation-card";
import { ItemFormDialog } from "@/features/inventory/components/item-form-dialog";
import { ItemListTable } from "@/features/inventory/components/item-list-table";
import { useCreateItem, useInventoryBalances, useInventoryValuation, useItems } from "@/features/inventory/hooks";
import { type InventoryItemFormValues } from "@/features/inventory/schemas";
import type { InventoryItemMutationPayload } from "@/features/inventory/types";
import { useOrganization } from "@/providers/organization-provider";

function toItemPayload(values: InventoryItemFormValues): InventoryItemMutationPayload {
  return {
    sku: values.sku?.trim() || null,
    name: values.name.trim(),
    description: values.description?.trim() || null,
    is_active: values.is_active,
    is_sellable: values.is_sellable,
    is_purchasable: values.is_purchasable,
    is_tracked_inventory: values.is_tracked_inventory,
    unit_of_measure: values.unit_of_measure?.trim() || null,
    sales_price: values.sales_price?.trim() || null,
    purchase_price: values.purchase_price?.trim() || null,
    income_account_id: values.income_account_id || null,
    expense_account_id: values.expense_account_id || null,
    inventory_asset_account_id: values.inventory_asset_account_id || null,
    sales_tax_code_id: values.sales_tax_code_id || null,
    purchase_tax_code_id: values.purchase_tax_code_id || null,
  };
}

export default function InventoryPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("inventory.read");
  const canCreate = can("inventory.create");
  const canValuationRead = can("inventory.valuation.read");
  const canReadAccounts = can("accounts.read");
  const canReadTaxCodes = can("tax_codes.read");
  const [search, setSearch] = React.useState("");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  const itemsQuery = useItems(currentOrganizationId ?? undefined, search, canRead);
  const balancesQuery = useInventoryBalances(currentOrganizationId ?? undefined, canRead);
  const valuationQuery = useInventoryValuation(currentOrganizationId ?? undefined, canRead && canValuationRead);
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", canReadAccounts);
  const taxCodesQuery = useTaxCodes(currentOrganizationId ?? undefined, canReadTaxCodes);
  const createItemMutation = useCreateItem(currentOrganizationId ?? undefined);

  const balanceByItemId = React.useMemo(
    () => new Map((balancesQuery.data ?? []).map((balance) => [balance.itemId, balance])),
    [balancesQuery.data],
  );

  const accountOptions = React.useMemo(
    () => (accountsQuery.data ?? []).map((account) => ({ label: `${account.code} · ${account.name}`, value: account.id })),
    [accountsQuery.data],
  );
  const taxCodeOptions = React.useMemo(
    () => (taxCodesQuery.data?.items ?? []).map((taxCode) => ({ label: `${taxCode.code} · ${taxCode.name}`, value: taxCode.id })),
    [taxCodesQuery.data?.items],
  );

  async function handleCreateItem(values: InventoryItemFormValues) {
    const created = await createItemMutation.mutateAsync(toItemPayload(values));
    toast.success(`Created inventory item ${created.name}`);
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading inventory" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening inventory." />;
  }

  if (!canRead) {
    return <AccessDeniedState description="You need inventory.read to view item balances, movements, and valuation." />;
  }

  const items = itemsQuery.data ?? [];
  const trackedCount = items.filter((item) => item.isTrackedInventory).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Inventory"}
        title="Inventory"
        description="Review backend-managed inventory items, stock positions, and valuation snapshots without moving costing truth into the client."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/inventory/adjustments"><SlidersHorizontal className="size-4" />Adjustments</Link>
            </Button>
            {canCreate ? <Button onClick={() => setIsCreateOpen(true)}><Plus className="size-4" />New item</Button> : null}
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Inventory overview</CardTitle>
            <CardDescription>High-level stock metrics derived from the current item and balance feeds.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Items</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{items.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tracked items</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{trackedCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance rows</p>
              <p className="mt-1 text-lg font-semibold tabular-nums"><DecimalDisplay value={(balancesQuery.data ?? []).length} /></p>
            </div>
          </CardContent>
        </Card>
        {canValuationRead ? (
          <InventoryValuationCard valuation={valuationQuery.data} currencyCode={currentOrganization?.base_currency} />
        ) : (
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Inventory valuation</CardTitle>
              <CardDescription>You need inventory.valuation.read to view backend valuation totals.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <PageActionBar
        left={<Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by SKU, name, or description" className="max-w-md" />}
        right={<p className="text-sm text-muted-foreground">Dense, backend-driven inventory master list.</p>}
      />

      {itemsQuery.isLoading || balancesQuery.isLoading ? <LoadingScreen label="Loading inventory items" /> : null}
      {itemsQuery.isError ? <ErrorState description="We couldn't load inventory items for the active organization." onRetry={() => void itemsQuery.refetch()} /> : null}
      {balancesQuery.isError ? <ErrorState description="We couldn't load stock balances for the active organization." onRetry={() => void balancesQuery.refetch()} /> : null}
      {!itemsQuery.isLoading && !itemsQuery.isError && items.length === 0 ? (
        <EmptyState
          title={search ? "No matching inventory items" : "No inventory items yet"}
          description={search ? "Try a broader search term or clear the search to review all items." : "Create the first inventory item to start tracking products, stock balances, and valuation."}
          action={canCreate ? <Button onClick={() => setIsCreateOpen(true)}><Boxes className="size-4" />Create inventory item</Button> : undefined}
        />
      ) : null}
      {!itemsQuery.isLoading && !itemsQuery.isError && items.length > 0 ? (
        <ItemListTable
          items={items}
          balanceByItemId={balanceByItemId}
          canEdit={false}
          currencyCode={currentOrganization?.base_currency}
        />
      ) : null}

      <ItemFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateItem}
        isSubmitting={createItemMutation.isPending}
        accountOptions={accountOptions}
        taxCodeOptions={taxCodeOptions}
      />
    </div>
  );
}
