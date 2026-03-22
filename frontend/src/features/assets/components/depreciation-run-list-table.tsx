import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssetStatusBadge } from "@/features/assets/components/asset-status-badge";
import type { DepreciationRunRecord } from "@/features/assets/types";

export function DepreciationRunListTable({ runs, currencyCode }: { runs: DepreciationRunRecord[]; currencyCode?: string | null }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Run date</TableHead>
            <TableHead>Through</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Assets</TableHead>
            <TableHead className="text-right">Total depreciation</TableHead>
            <TableHead>Posted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell><DateDisplay value={run.runDate || run.createdAt} includeTime /></TableCell>
              <TableCell><DateDisplay value={run.throughDate} /></TableCell>
              <TableCell><AssetStatusBadge value={run.status} /></TableCell>
              <TableCell className="text-right tabular-nums">{run.assetCount ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-right"><MoneyDisplay value={run.totalDepreciation} currencyCode={currencyCode} /></TableCell>
              <TableCell><DateDisplay value={run.postedAt} includeTime /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
