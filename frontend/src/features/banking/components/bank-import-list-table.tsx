import Link from "next/link";

import { DateDisplay } from "@/components/shared/date-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BankImportStatusBadge } from "@/features/banking/components/bank-import-status-badge";
import type { BankImport } from "@/features/banking/types";

export function BankImportListTable({ imports }: { imports: BankImport[] }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Import</TableHead>
            <TableHead>Bank account</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Imported at</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Imported</TableHead>
            <TableHead>Duplicates</TableHead>
            <TableHead>Failed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {imports.map((item) => (
            <TableRow key={item.id}>
              <TableCell><Link href={`/banking/imports/${item.id}`} className="hover:text-primary"><div className="font-medium">{item.fileName || item.id}</div><div className="text-muted-foreground">{item.id}</div></Link></TableCell>
              <TableCell>{item.bankAccountName || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell>{item.source || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell><DateDisplay value={item.importedAt} includeTime /></TableCell>
              <TableCell><BankImportStatusBadge status={item.status} /></TableCell>
              <TableCell>{item.totalLines ?? "—"}</TableCell>
              <TableCell>{item.importedLines ?? "—"}</TableCell>
              <TableCell>{item.duplicateLines ?? "—"}</TableCell>
              <TableCell>{item.failedLines ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
