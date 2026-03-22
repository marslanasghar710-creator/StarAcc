import Link from "next/link";

import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssetStatusBadge } from "@/features/assets/components/asset-status-badge";
import type { AssetRegisterRow } from "@/features/assets/types";

export function AssetRegisterTable({ rows, currencyCode }: { rows: AssetRegisterRow[]; currencyCode?: string | null }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Acquired</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Accum. dep.</TableHead>
            <TableHead className="text-right">NBV</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link href={`/assets/${row.assetId}`} className="flex flex-col gap-0.5 hover:text-primary">
                  <span className="font-medium">{row.name}</span>
                  <span className="text-xs text-muted-foreground">{row.usefulLifeMonths ? `${row.usefulLifeMonths} months` : "Useful life not set"}</span>
                </Link>
              </TableCell>
              <TableCell>{row.categoryName || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell><DateDisplay value={row.acquisitionDate} /></TableCell>
              <TableCell className="capitalize">{row.depreciationMethod.replaceAll("_", " ")}</TableCell>
              <TableCell className="text-right"><MoneyDisplay value={row.acquisitionCost} currencyCode={currencyCode} /></TableCell>
              <TableCell className="text-right"><MoneyDisplay value={row.accumulatedDepreciation} currencyCode={currencyCode} /></TableCell>
              <TableCell className="text-right font-medium"><MoneyDisplay value={row.netBookValue} currencyCode={currencyCode} /></TableCell>
              <TableCell><AssetStatusBadge value={row.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
