import Link from "next/link";

import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import type { Invoice } from "@/features/invoices/types";

export function InvoiceListTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issue date</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Amount due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sent at</TableHead>
            <TableHead>Posted at</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <Link href={`/invoices/${invoice.id}`} className="block hover:text-primary">
                  <div className="font-medium">{invoice.invoiceNumber}</div>
                  <div className="text-muted-foreground">{invoice.reference || "—"}</div>
                </Link>
              </TableCell>
              <TableCell>{invoice.customerName || <span className="text-muted-foreground">{invoice.customerId || "—"}</span>}</TableCell>
              <TableCell><DateDisplay value={invoice.issueDate} /></TableCell>
              <TableCell><DateDisplay value={invoice.dueDate} /></TableCell>
              <TableCell><MoneyDisplay value={invoice.totalAmount} currencyCode={invoice.currencyCode} /></TableCell>
              <TableCell><MoneyDisplay value={invoice.amountDue} currencyCode={invoice.currencyCode} /></TableCell>
              <TableCell><InvoiceStatusBadge invoice={invoice} /></TableCell>
              <TableCell><DateDisplay value={invoice.sentAt} includeTime /></TableCell>
              <TableCell><DateDisplay value={invoice.postedAt} includeTime /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
