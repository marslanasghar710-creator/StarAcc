import Link from "next/link";
import { Download } from "lucide-react";

import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import type { Invoice } from "@/features/invoices/types";
import { exportRowsAsCsv } from "@/features/productivity/workflow/bulk-action-helpers";
import { cn } from "@/lib/utils";

export function InvoiceListTable({
  invoices,
  selectedId,
  onSelect,
  selectedIds,
  onSelectionChange,
}: {
  invoices: Invoice[];
  selectedId?: string | null;
  onSelect?: (invoiceId: string) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}) {
  const allSelected = invoices.length > 0 && invoices.every((invoice) => selectedIds?.has(invoice.id));

  function toggleOne(invoiceId: string) {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds ?? []);
    if (next.has(invoiceId)) next.delete(invoiceId);
    else next.add(invoiceId);
    onSelectionChange(next);
  }

  function toggleAll() {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
      return;
    }

    onSelectionChange(new Set(invoices.map((invoice) => invoice.id)));
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-sm">
        <p className="text-muted-foreground">Use <span className="font-medium text-foreground">j/k</span> to move rows and <span className="font-medium text-foreground">Enter</span> to open.</p>
        {(selectedIds?.size ?? 0) > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const selected = invoices.filter((invoice) => selectedIds?.has(invoice.id));
              exportRowsAsCsv("invoices-export.csv", selected.map((invoice) => ({
                invoiceNumber: invoice.invoiceNumber,
                customerName: invoice.customerName ?? invoice.customerId,
                issueDate: invoice.issueDate,
                dueDate: invoice.dueDate,
                totalAmount: invoice.totalAmount,
                amountDue: invoice.amountDue,
                status: invoice.status,
              })));
            }}
          >
            <Download className="size-4" />Export selected ({selectedIds?.size ?? 0})
          </Button>
        ) : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"><input type="checkbox" aria-label="Select all invoices" checked={allSelected} onChange={toggleAll} /></TableHead>
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
            <TableRow key={invoice.id} className={cn(selectedId === invoice.id ? "bg-primary/5" : undefined)} onClick={() => onSelect?.(invoice.id)}>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <input type="checkbox" aria-label={`Select invoice ${invoice.invoiceNumber}`} checked={selectedIds?.has(invoice.id) ?? false} onChange={() => toggleOne(invoice.id)} />
              </TableCell>
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
