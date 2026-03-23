import { MoneyDisplay } from "@/components/shared/money-display";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PayrollStatusBadge } from "@/features/payroll/components/payroll-status-badge";
import type { PayrollEntry } from "@/features/payroll/types";

export function PayrollRunEntriesTable({ entries, currencyCode, selectedEntryId, onSelectEntry }: { entries: PayrollEntry[]; currencyCode?: string | null; selectedEntryId?: string | null; onSelectEntry: (entry: PayrollEntry) => void; }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">Deductions</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead className="text-right">Payslip</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id} data-state={selectedEntryId === entry.id ? "selected" : undefined}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{entry.employeeName}</span>
                  <span className="text-xs text-muted-foreground">{entry.employeeId}</span>
                </div>
              </TableCell>
              <TableCell><PayrollStatusBadge value={entry.status} /></TableCell>
              <TableCell className="text-right"><MoneyDisplay value={entry.grossPay} currencyCode={currencyCode} /></TableCell>
              <TableCell className="text-right"><MoneyDisplay value={entry.deductionsTotal} currencyCode={currencyCode} /></TableCell>
              <TableCell className="text-right font-medium"><MoneyDisplay value={entry.netPay} currencyCode={currencyCode} /></TableCell>
              <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => onSelectEntry(entry)}>View payslip</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
