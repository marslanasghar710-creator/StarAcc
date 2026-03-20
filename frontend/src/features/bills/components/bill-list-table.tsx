import Link from "next/link";

import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BillStatusBadge } from "@/features/bills/components/bill-status-badge";
import type { Bill } from "@/features/bills/types";

export function BillListTable({ bills }: { bills: Bill[] }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bill</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Issue date</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Amount due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Posted at</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills.map((bill) => (
            <TableRow key={bill.id}>
              <TableCell>
                <Link href={`/bills/${bill.id}`} className="block hover:text-primary">
                  <div className="font-medium">{bill.billNumber}</div>
                  <div className="text-muted-foreground">{bill.reference || bill.supplierInvoiceNumber || "—"}</div>
                </Link>
              </TableCell>
              <TableCell>{bill.supplierName || <span className="text-muted-foreground">{bill.supplierId || "—"}</span>}</TableCell>
              <TableCell><DateDisplay value={bill.issueDate} /></TableCell>
              <TableCell><DateDisplay value={bill.dueDate} /></TableCell>
              <TableCell><MoneyDisplay value={bill.totalAmount} currencyCode={bill.currencyCode} /></TableCell>
              <TableCell><MoneyDisplay value={bill.amountDue} currencyCode={bill.currencyCode} /></TableCell>
              <TableCell><BillStatusBadge bill={bill} /></TableCell>
              <TableCell><DateDisplay value={bill.postedAt} includeTime /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
