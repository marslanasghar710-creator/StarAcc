import { MoneyDisplay } from "@/components/shared/money-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssetValuationSummary } from "@/features/assets/types";

export function AssetValuationCard({ valuation, currencyCode }: { valuation: AssetValuationSummary | null | undefined; currencyCode?: string | null }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Asset valuation</CardTitle>
        <CardDescription>Gross cost, accumulated depreciation, and net book value remain backend-authoritative.</CardDescription>
      </CardHeader>
      <CardContent>
        {!valuation ? (
          <p className="text-sm text-muted-foreground">Valuation data is unavailable for the active organization.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Gross asset cost</p>
              <p className="mt-1 text-lg font-semibold"><MoneyDisplay value={valuation.totalAssetCost} currencyCode={currencyCode} /></p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Accumulated depreciation</p>
              <p className="mt-1 text-lg font-semibold"><MoneyDisplay value={valuation.totalAccumulatedDepreciation} currencyCode={currencyCode} /></p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net book value</p>
              <p className="mt-1 text-lg font-semibold"><MoneyDisplay value={valuation.totalNetBookValue} currencyCode={currencyCode} /></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
