import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssetStatusBadge } from "@/features/assets/components/asset-status-badge";
import type { DepreciationScheduleLine } from "@/features/assets/types";

export function DepreciationScheduleTable({ lines, currencyCode }: { lines: DepreciationScheduleLine[]; currencyCode?: string | null }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Depreciation</TableHead>
            <TableHead className="text-right">Accum. dep.</TableHead>
            <TableHead className="text-right">NBV</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Posted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell><DateDisplay value={line.periodDate} /></TableCell>
              <TableCell className="text-right"><MoneyDisplay value={line.depreciationAmount} currencyCode={currencyCode} /></TableCell>
              <TableCell className="text-right"><MoneyDisplay value={line.accumulatedDepreciation} currencyCode={currencyCode} /></TableCell>
              <TableCell className="text-right font-medium"><MoneyDisplay value={line.netBookValue} currencyCode={currencyCode} /></TableCell>
              <TableCell><AssetStatusBadge value={line.status} /></TableCell>
              <TableCell><DateDisplay value={line.postedAt} includeTime /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
