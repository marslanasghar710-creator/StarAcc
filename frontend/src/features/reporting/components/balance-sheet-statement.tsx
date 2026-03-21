import * as React from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AmountCell } from "@/features/reporting/components/amount-cell";
import { ReportSectionHeader } from "@/features/reporting/components/report-section-header";
import { ReportStatusIndicator } from "@/features/reporting/components/report-status-indicator";
import { ReportTotalRow } from "@/features/reporting/components/report-total-row";
import type { BalanceSheetReport } from "@/features/reporting/types";

export function BalanceSheetStatement({ report }: { report: BalanceSheetReport }) {
  const showComparison = report.comparisonMode !== "none";

  return (
    <div className="space-y-4">
      {report.sections.map((section) => (
        <div key={section.id} className="rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="p-4">
            <ReportSectionHeader title={section.title} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account / category</TableHead>
                <TableHead className="text-right">Current</TableHead>
                {showComparison ? <TableHead className="text-right">{report.comparisonLabel || "Comparison"}</TableHead> : null}
                {showComparison ? <TableHead className="text-right">Variance</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.rows.map((row) => (
                <TableRow key={row.id} className={row.isEmphasized ? "font-medium" : undefined}>
                  <TableCell>
                    <div style={{ paddingLeft: `${row.depth * 14}px` }}>{row.label}</div>
                  </TableCell>
                  <TableCell><AmountCell value={row.values.amount} currencyCode={report.currencyCode} /></TableCell>
                  {showComparison ? <TableCell><AmountCell value={row.values.comparisonAmount} currencyCode={report.currencyCode} /></TableCell> : null}
                  {showComparison ? <TableCell><AmountCell value={row.values.variance} currencyCode={report.currencyCode} /></TableCell> : null}
                </TableRow>
              ))}
              {section.totals.map((row) => (
                <ReportTotalRow key={row.id} emphasized>
                  <TableCell>{row.label}</TableCell>
                  <TableCell><AmountCell value={row.values.amount} currencyCode={report.currencyCode} /></TableCell>
                  {showComparison ? <TableCell><AmountCell value={row.values.comparisonAmount} currencyCode={report.currencyCode} /></TableCell> : null}
                  {showComparison ? <TableCell><AmountCell value={row.values.variance} currencyCode={report.currencyCode} /></TableCell> : null}
                </ReportTotalRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}

      <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Total assets</p>
            <AmountCell value={report.totals.assets.primary} currencyCode={report.currencyCode} className="text-left" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total liabilities & equity</p>
            <AmountCell value={report.totals.liabilitiesAndEquity.primary} currencyCode={report.currencyCode} className="text-left" />
          </div>
        </div>
        <div className="mt-4">
          <ReportStatusIndicator
            label={report.totals.assets.isBalanced === null ? "Backend balance indicator unavailable" : report.totals.assets.isBalanced ? "Balanced" : "Check backend integrity flag"}
            tone={report.totals.assets.isBalanced === null ? "default" : report.totals.assets.isBalanced ? "success" : "warning"}
          />
        </div>
      </div>
    </div>
  );
}
