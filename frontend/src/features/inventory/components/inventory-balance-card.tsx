import { DecimalDisplay } from "@/components/shared/decimal-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { DateDisplay } from "@/components/shared/date-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryBalance } from "@/features/inventory/types";

export function InventoryBalanceCard({ balance, currencyCode }: { balance: InventoryBalance | null | undefined; currencyCode?: string | null }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Stock position</CardTitle>
        <CardDescription>Backend-calculated stock on hand, availability, and valuation snapshots.</CardDescription>
      </CardHeader>
      <CardContent>
        {!balance ? (
          <p className="text-sm text-muted-foreground">No balance snapshot is available for this item yet.</p>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Quantity on hand</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums"><DecimalDisplay value={balance.quantityOnHand} /></dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Available quantity</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums"><DecimalDisplay value={balance.availableQuantity} /></dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Reserved quantity</dt>
              <dd className="mt-1 tabular-nums"><DecimalDisplay value={balance.reservedQuantity} /></dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Average unit cost</dt>
              <dd className="mt-1"><MoneyDisplay value={balance.averageUnitCost} currencyCode={currencyCode} /></dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Inventory value</dt>
              <dd className="mt-1"><MoneyDisplay value={balance.inventoryValue} currencyCode={currencyCode} /></dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Last refreshed</dt>
              <dd className="mt-1"><DateDisplay value={balance.updatedAt} includeTime /></dd>
            </div>
            {balance.locationName ? (
              <div className="sm:col-span-2">
                <dt className="text-sm text-muted-foreground">Location</dt>
                <dd className="mt-1">{balance.locationName}</dd>
              </div>
            ) : null}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
