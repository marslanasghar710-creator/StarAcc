import { DateDisplay } from "@/components/shared/date-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryStatusBadge } from "@/features/inventory/components/inventory-status-badge";
import type { InventoryItem } from "@/features/inventory/types";

export function ItemDetailCard({
  item,
  accountNames,
  taxCodeNames,
}: {
  item: InventoryItem;
  accountNames: Record<string, string>;
  taxCodeNames: Record<string, string>;
}) {
  function lookupName(id: string | null, map: Record<string, string>) {
    if (!id) {
      return <span className="text-muted-foreground">—</span>;
    }

    return map[id] ?? id;
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Item details</CardTitle>
        <CardDescription>Master-data attributes come directly from the backend inventory catalog.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <InventoryStatusBadge kind="active" value={item.isActive} />
          <InventoryStatusBadge kind="tracked" value={item.isTrackedInventory} />
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">SKU / code</dt>
            <dd className="mt-1 font-medium">{item.sku || <span className="text-muted-foreground">—</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Unit of measure</dt>
            <dd className="mt-1">{item.unitOfMeasure || <span className="text-muted-foreground">—</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Sales account</dt>
            <dd className="mt-1 break-all">{lookupName(item.incomeAccountId, accountNames)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Expense account</dt>
            <dd className="mt-1 break-all">{lookupName(item.expenseAccountId, accountNames)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Inventory asset account</dt>
            <dd className="mt-1 break-all">{lookupName(item.inventoryAssetAccountId, accountNames)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Sales tax code</dt>
            <dd className="mt-1 break-all">{lookupName(item.salesTaxCodeId, taxCodeNames)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Purchase tax code</dt>
            <dd className="mt-1 break-all">{lookupName(item.purchaseTaxCodeId, taxCodeNames)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Costing / valuation</dt>
            <dd className="mt-1 capitalize">{item.costingMethod?.replaceAll("_", " ") || "Backend default"} / {item.valuationMethod?.replaceAll("_", " ") || "Backend default"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap">{item.description || <span className="text-muted-foreground">No description provided.</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Created</dt>
            <dd className="mt-1"><DateDisplay value={item.createdAt} includeTime /></dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Updated</dt>
            <dd className="mt-1"><DateDisplay value={item.updatedAt} includeTime /></dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
