import { DecimalDisplay } from "@/components/shared/decimal-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryValuationSummary } from "@/features/inventory/types";

export function InventoryValuationCard({ valuation, currencyCode }: { valuation: InventoryValuationSummary | null | undefined; currencyCode?: string | null }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Inventory valuation</CardTitle>
        <CardDescription>Valuation totals are backend-owned and reflect the active costing method.</CardDescription>
      </CardHeader>
      <CardContent>
        {!valuation ? (
          <p className="text-sm text-muted-foreground">Valuation data is unavailable for the active organization.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Method</p>
              <p className="mt-1 font-medium capitalize">{valuation.valuationMethod.replaceAll("_", " ")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total quantity on hand</p>
              <p className="mt-1 text-lg font-semibold tabular-nums"><DecimalDisplay value={valuation.totalQuantityOnHand} /></p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total inventory value</p>
              <p className="mt-1 text-lg font-semibold"><MoneyDisplay value={valuation.totalInventoryValue} currencyCode={currencyCode} /></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
