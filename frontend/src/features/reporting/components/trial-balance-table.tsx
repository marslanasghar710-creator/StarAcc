import * as React from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AmountCell } from "@/features/reporting/components/amount-cell";
import { ReportStatusIndicator } from "@/features/reporting/components/report-status-indicator";
import { ReportTotalRow } from "@/features/reporting/components/report-total-row";
import type { TrialBalanceReport } from "@/features/reporting/types";
import { cn } from "@/lib/utils";

export function TrialBalanceTable({ report }: { report: TrialBalanceReport }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Code</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.rows.map((row) => (
            <TableRow key={row.id} className={cn(row.isTotal ? "font-semibold" : undefined, row.isGroup ? "bg-muted/20" : undefined)}>
              <TableCell className="tabular-nums">{row.accountCode || "—"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2" style={{ paddingLeft: `${row.depth * 14}px` }}>
                  <span>{row.accountName}</span>
                  {row.isGroup ? <ReportStatusIndicator label="Group" tone="default" /> : null}
                </div>
              </TableCell>
              <TableCell>{row.accountType || row.groupName || "—"}</TableCell>
              <TableCell><AmountCell value={row.debit} currencyCode={report.currencyCode} muted={!row.debit} /></TableCell>
              <TableCell><AmountCell value={row.credit} currencyCode={report.currencyCode} muted={!row.credit} /></TableCell>
            </TableRow>
          ))}
          <ReportTotalRow emphasized>
            <TableCell colSpan={3}>Totals</TableCell>
            <TableCell><AmountCell value={report.totals.debit} currencyCode={report.currencyCode} /></TableCell>
            <TableCell><AmountCell value={report.totals.credit} currencyCode={report.currencyCode} /></TableCell>
          </ReportTotalRow>
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center gap-3 border-t border-border/70 px-6 py-4 text-sm text-muted-foreground">
        <ReportStatusIndicator
          label={report.totals.isBalanced === null ? "Balance status from backend unavailable" : report.totals.isBalanced ? "Balanced" : "Out of balance"}
          tone={report.totals.isBalanced === null ? "default" : report.totals.isBalanced ? "success" : "warning"}
        />
        {report.totals.difference ? <span>Difference: {report.totals.difference}</span> : null}
      </div>
    </div>
  );
}
