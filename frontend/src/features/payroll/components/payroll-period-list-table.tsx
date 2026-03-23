import type { PayrollPeriod } from "@/features/payroll/types";
import { DateDisplay } from "@/components/shared/date-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PayrollStatusBadge } from "@/features/payroll/components/payroll-status-badge";

export function PayrollPeriodListTable({ periods }: { periods: PayrollPeriod[] }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payroll period</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Payment date</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead className="text-right">Employees</TableHead>
            <TableHead className="text-right">Runs</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.map((period) => (
            <TableRow key={period.id}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{period.name}</span>
                  <span className="text-xs text-muted-foreground">{period.id}</span>
                </div>
              </TableCell>
              <TableCell><DateDisplay value={period.startDate} /> – <DateDisplay value={period.endDate} /></TableCell>
              <TableCell><DateDisplay value={period.paymentDate} /></TableCell>
              <TableCell>{period.frequency || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-right tabular-nums">{period.employeeCount}</TableCell>
              <TableCell className="text-right tabular-nums">{period.runCount}</TableCell>
              <TableCell><PayrollStatusBadge value={period.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
