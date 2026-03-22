import * as React from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateDisplay } from "@/components/shared/date-display";
import { AmountCell } from "@/features/reporting/components/amount-cell";
import type { GeneralLedgerReport } from "@/features/reporting/types";

export function GeneralLedgerTable({ report }: { report: GeneralLedgerReport }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="grid gap-4 border-b border-border/70 px-6 py-4 md:grid-cols-4">
        <div>
          <p className="text-sm text-muted-foreground">Account</p>
          <p className="font-medium">{report.accountName || "Selected account"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Opening balance</p>
          <AmountCell value={report.openingBalance} currencyCode={report.currencyCode} className="text-left" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Closing balance</p>
          <AmountCell value={report.closingBalance} currencyCode={report.currencyCode} className="text-left" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Rows</p>
          <p className="font-medium">{report.lines.length}</p>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Txn date</TableHead>
            <TableHead>Posting date</TableHead>
            <TableHead>Journal ref</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
            <TableHead className="text-right">Running balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell><DateDisplay value={line.transactionDate} /></TableCell>
              <TableCell><DateDisplay value={line.postingDate} /></TableCell>
              <TableCell>{line.journalReference || "—"}</TableCell>
              <TableCell>{line.sourceLabel || "—"}</TableCell>
              <TableCell>{line.description || "—"}</TableCell>
              <TableCell><AmountCell value={line.debit} currencyCode={report.currencyCode} muted={!line.debit} /></TableCell>
              <TableCell><AmountCell value={line.credit} currencyCode={report.currencyCode} muted={!line.credit} /></TableCell>
              <TableCell><AmountCell value={line.runningBalance} currencyCode={report.currencyCode} muted={!line.runningBalance} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
