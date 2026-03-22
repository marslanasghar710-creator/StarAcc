import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetStatusBadge } from "@/features/assets/components/asset-status-badge";
import type { Asset } from "@/features/assets/types";

export function AssetDetailCard({ asset, currencyCode }: { asset: Asset; currencyCode?: string | null }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Asset details</CardTitle>
        <CardDescription>Acquisition, depreciation, and disposal metadata come directly from the backend fixed-assets ledger.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <AssetStatusBadge value={asset.status} />
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Category</dt>
            <dd className="mt-1">{asset.assetCategoryName || <span className="text-muted-foreground">—</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Depreciation method</dt>
            <dd className="mt-1 capitalize">{asset.depreciationMethod.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Acquisition date</dt>
            <dd className="mt-1"><DateDisplay value={asset.acquisitionDate} /></dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Depreciation start</dt>
            <dd className="mt-1"><DateDisplay value={asset.depreciationStartDate} /></dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Acquisition cost</dt>
            <dd className="mt-1"><MoneyDisplay value={asset.acquisitionCost} currencyCode={currencyCode} /></dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Residual value</dt>
            <dd className="mt-1"><MoneyDisplay value={asset.residualValue} currencyCode={currencyCode} /></dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Accumulated depreciation</dt>
            <dd className="mt-1"><MoneyDisplay value={asset.accumulatedDepreciation} currencyCode={currencyCode} /></dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Net book value</dt>
            <dd className="mt-1 font-medium"><MoneyDisplay value={asset.netBookValue} currencyCode={currencyCode} /></dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Useful life</dt>
            <dd className="mt-1">{asset.usefulLifeMonths ? `${asset.usefulLifeMonths} months` : <span className="text-muted-foreground">—</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Disposed</dt>
            <dd className="mt-1">{asset.disposalDate ? <DateDisplay value={asset.disposalDate} /> : <span className="text-muted-foreground">No disposal recorded</span>}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap">{asset.description || <span className="text-muted-foreground">No description provided.</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Created</dt>
            <dd className="mt-1"><DateDisplay value={asset.createdAt} includeTime /></dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Updated</dt>
            <dd className="mt-1"><DateDisplay value={asset.updatedAt} includeTime /></dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
