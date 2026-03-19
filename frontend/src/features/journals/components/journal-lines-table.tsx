import { DecimalDisplay } from "@/components/shared/decimal-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JournalLine } from "@/features/journals/types";

export function JournalLinesTable({ lines }: { lines: JournalLine[] }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Line</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
            <TableHead>Currency</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id ?? `${line.lineNumber}-${line.accountId}`}>
              <TableCell>{line.lineNumber}</TableCell>
              <TableCell>
                <div className="font-medium">{line.accountCode || "—"}</div>
                <div className="text-muted-foreground">{line.accountName || line.accountId}</div>
              </TableCell>
              <TableCell>{line.description || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-right"><DecimalDisplay value={line.debitAmount} /></TableCell>
              <TableCell className="text-right"><DecimalDisplay value={line.creditAmount} /></TableCell>
              <TableCell>{line.currencyCode || <span className="text-muted-foreground">—</span>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
