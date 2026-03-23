import Link from "next/link";

import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PayrollStatusBadge } from "@/features/payroll/components/payroll-status-badge";
import type { PayrollRun } from "@/features/payroll/types";

export function PayrollRunListTable({ runs, currencyCode }: { runs: PayrollRun[]; currencyCode?: string | null }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payroll run</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Pay date</TableHead>
            <TableHead className="text-right">Employees</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">Deductions</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell>
                <Link href={`/payroll/runs/${run.id}`} className="flex flex-col gap-0.5 hover:text-primary">
                  <span className="font-medium">{run.name}</span>
                  <span className="text-xs text-muted-foreground">{run.id}</span>
                </Link>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <DateDisplay value={run.periodStartDate} /> – <DateDisplay value={run.periodEndDate} />
                </div>
              </TableCell>
              <TableCell><DateDisplay value={run.payDate} /></TableCell>
              <TableCell className="text-right tabular-nums">{run.employeeCount}</TableCell>
              <TableCell className="text-right"><MoneyDisplay value={run.totalGross} currencyCode={run.currencyCode || currencyCode} /></TableCell>
              <TableCell className="text-right"><MoneyDisplay value={run.totalDeductions} currencyCode={run.currencyCode || currencyCode} /></TableCell>
              <TableCell className="text-right font-medium"><MoneyDisplay value={run.totalNet} currencyCode={run.currencyCode || currencyCode} /></TableCell>
              <TableCell><PayrollStatusBadge value={run.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
