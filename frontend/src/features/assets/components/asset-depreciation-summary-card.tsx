import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssetDepreciationSummary } from "@/features/assets/types";

export function AssetDepreciationSummaryCard({ summary, currencyCode }: { summary: AssetDepreciationSummary | null | undefined; currencyCode?: string | null }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Depreciation summary</CardTitle>
        <CardDescription>Current-period and life-to-date depreciation totals are sourced from backend postings and schedules.</CardDescription>
      </CardHeader>
      <CardContent>
        {!summary ? (
          <p className="text-sm text-muted-foreground">Depreciation summary is unavailable for the active organization.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Current period</p>
              <p className="mt-1 font-semibold"><MoneyDisplay value={summary.currentPeriodDepreciation} currencyCode={currencyCode} /></p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Year to date</p>
              <p className="mt-1 font-semibold"><MoneyDisplay value={summary.yearToDateDepreciation} currencyCode={currencyCode} /></p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Life to date</p>
              <p className="mt-1 font-semibold"><MoneyDisplay value={summary.lifeToDateDepreciation} currencyCode={currencyCode} /></p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last run</p>
              <p className="mt-1"><DateDisplay value={summary.lastRunAt} includeTime /></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
