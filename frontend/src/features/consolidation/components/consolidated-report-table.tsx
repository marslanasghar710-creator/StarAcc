import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ConsolidatedLine } from "@/features/consolidation/types";

export function ConsolidatedReportTable({ title, lines, amountLabel = "Amount" }: { title: string; lines: ConsolidatedLine[]; amountLabel?: string }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>{amountLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={`${title}-${line.account_code}-${line.account_name}`}>
              <TableCell>{line.account_code}</TableCell>
              <TableCell>{line.account_name}</TableCell>
              <TableCell className="capitalize">{line.account_type}</TableCell>
              <TableCell>{line.amount ?? line.debit_balance ?? line.credit_balance ?? "0"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
