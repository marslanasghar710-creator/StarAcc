"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccounts } from "@/features/accounts/hooks";
import { InventoryBalanceCard } from "@/features/inventory/components/inventory-balance-card";
import { ItemDetailCard } from "@/features/inventory/components/item-detail-card";
import { ItemFormDialog } from "@/features/inventory/components/item-form-dialog";
import { InventoryMovementTable } from "@/features/inventory/components/inventory-movement-table";
import { useItem, useInventoryItemBalance, useInventoryItemMovements, useUpdateItem } from "@/features/inventory/hooks";
import { type InventoryItemFormValues } from "@/features/inventory/schemas";
import type { InventoryItemMutationPayload } from "@/features/inventory/types";
import { usePermissions } from "@/features/permissions/hooks";
import { useTaxCodes } from "@/features/settings/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toPayload(values: InventoryItemFormValues): Partial<InventoryItemMutationPayload> {
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

export default function InventoryItemDetailPage() {
  const params = useParams<{ itemId: string }>();
  const itemId = params.itemId;
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("inventory.read");
  const canUpdate = can("inventory.update");
  const canReadAccounts = can("accounts.read");
  const canReadTaxCodes = can("tax_codes.read");
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  const itemQuery = useItem(currentOrganizationId ?? undefined, itemId, canRead);
  const balanceQuery = useInventoryItemBalance(currentOrganizationId ?? undefined, itemId, canRead);
  const movementsQuery = useInventoryItemMovements(currentOrganizationId ?? undefined, itemId, canRead);
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", canReadAccounts);
  const taxCodesQuery = useTaxCodes(currentOrganizationId ?? undefined, canReadTaxCodes);
  const updateItemMutation = useUpdateItem(currentOrganizationId ?? undefined, itemId);

  const accountOptions = React.useMemo(
    () => (accountsQuery.data ?? []).map((account) => ({ label: `${account.code} · ${account.name}`, value: account.id })),
    [accountsQuery.data],
  );
  const taxCodeOptions = React.useMemo(
    () => (taxCodesQuery.data?.items ?? []).map((taxCode) => ({ label: `${taxCode.code} · ${taxCode.name}`, value: taxCode.id })),
    [taxCodesQuery.data?.items],
  );
  const accountNames = React.useMemo(
    () => Object.fromEntries((accountsQuery.data ?? []).map((account) => [account.id, `${account.code} · ${account.name}`])),
    [accountsQuery.data],
  );
  const taxCodeNames = React.useMemo(
    () => Object.fromEntries((taxCodesQuery.data?.items ?? []).map((taxCode) => [taxCode.id, `${taxCode.code} · ${taxCode.name}`])),
    [taxCodesQuery.data?.items],
  );

  async function handleUpdate(values: InventoryItemFormValues) {
    const updated = await updateItemMutation.mutateAsync(toPayload(values));
    toast.success(`Updated ${updated.name}`);
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading inventory item" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening item details." />;
  }

  if (!canRead) {
    return <AccessDeniedState description="You need inventory.read to view item detail, balances, and movement history." />;
  }

  if (itemQuery.isLoading) {
    return <LoadingScreen label="Loading item details" />;
  }

  if (itemQuery.isError) {
    return <ErrorState description="We couldn't load this inventory item." onRetry={() => void itemQuery.refetch()} />;
  }

  const item = itemQuery.data;

  if (!item) {
    return <EmptyState title="Inventory item not found" description="The requested inventory item could not be found in the active organization." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title={`${item.sku || item.name}${item.sku ? ` · ${item.name}` : ""}`}
        description="Review backend-managed item attributes, stock on hand, and immutable movement history."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/inventory"><ArrowLeft className="size-4" />Back to inventory</Link></Button>
            {canUpdate ? <Button onClick={() => setIsEditOpen(true)}><Pencil className="size-4" />Edit item</Button> : null}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="space-y-6">
          <ItemDetailCard item={item} accountNames={accountNames} taxCodeNames={taxCodeNames} />
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Inventory movements</CardTitle>
              <CardDescription>Movement chronology stays backend-authoritative for quantity, cost, and source traceability.</CardDescription>
            </CardHeader>
            <CardContent>
              {movementsQuery.isLoading ? <LoadingScreen label="Loading inventory movements" /> : null}
              {movementsQuery.isError ? <ErrorState description="We couldn't load item movement history." onRetry={() => void movementsQuery.refetch()} /> : null}
              {!movementsQuery.isLoading && !movementsQuery.isError && (movementsQuery.data?.length ?? 0) === 0 ? (
                <EmptyState title="No movements yet" description="Purchases, sales, and adjustments will appear here once the backend records stock activity." />
              ) : null}
              {!movementsQuery.isLoading && !movementsQuery.isError && (movementsQuery.data?.length ?? 0) > 0 ? (
                <InventoryMovementTable movements={movementsQuery.data ?? []} currencyCode={currentOrganization?.base_currency} />
              ) : null}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <InventoryBalanceCard balance={balanceQuery.data} currencyCode={currentOrganization?.base_currency} />
        </div>
      </div>

      <ItemFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        item={item}
        onSubmit={handleUpdate}
        isSubmitting={updateItemMutation.isPending}
        accountOptions={accountOptions}
        taxCodeOptions={taxCodeOptions}
      />
    </div>
  );
}
