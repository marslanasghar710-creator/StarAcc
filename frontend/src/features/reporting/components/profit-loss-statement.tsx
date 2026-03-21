import * as React from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AmountCell } from "@/features/reporting/components/amount-cell";
import { ReportSectionHeader } from "@/features/reporting/components/report-section-header";
import { ReportTotalRow } from "@/features/reporting/components/report-total-row";
import type { ProfitLossReport } from "@/features/reporting/types";

export function ProfitLossStatement({ report }: { report: ProfitLossReport }) {
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
                    <div style={{ paddingLeft: `${row.depth * 14}px` }}>
                      <div>{row.label}</div>
                      {row.code ? <div className="text-xs text-muted-foreground">{row.code}</div> : null}
                    </div>
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
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Net profit</p>
            <AmountCell value={report.netProfit.primary} currencyCode={report.currencyCode} className="text-left" />
          </div>
          {showComparison ? (
            <>
              <div>
                <p className="text-sm text-muted-foreground">{report.comparisonLabel || "Comparison period"}</p>
                <AmountCell value={report.netProfit.comparison} currencyCode={report.currencyCode} className="text-left" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Variance</p>
                <AmountCell value={report.netProfit.variance} currencyCode={report.currencyCode} className="text-left" />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
