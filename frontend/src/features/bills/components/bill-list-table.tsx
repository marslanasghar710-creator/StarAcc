import Link from "next/link";
import { Download } from "lucide-react";

import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BillStatusBadge } from "@/features/bills/components/bill-status-badge";
import type { Bill } from "@/features/bills/types";
import { exportRowsAsCsv } from "@/features/productivity/workflow/bulk-action-helpers";
import { cn } from "@/lib/utils";

export function BillListTable({
  bills,
  selectedId,
  onSelect,
  selectedIds,
  onSelectionChange,
}: {
  bills: Bill[];
  selectedId?: string | null;
  onSelect?: (billId: string) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}) {
  const allSelected = bills.length > 0 && bills.every((bill) => selectedIds?.has(bill.id));

  function toggleOne(billId: string) {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds ?? []);
    if (next.has(billId)) next.delete(billId);
    else next.add(billId);
    onSelectionChange(next);
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-sm">
        <p className="text-muted-foreground">Keyboard: <span className="font-medium text-foreground">j / k</span> to move, <span className="font-medium text-foreground">Enter</span> to open selected bill.</p>
        {(selectedIds?.size ?? 0) > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const selected = bills.filter((bill) => selectedIds?.has(bill.id));
              exportRowsAsCsv("bills-export.csv", selected.map((bill) => ({
                billNumber: bill.billNumber,
                supplierName: bill.supplierName ?? bill.supplierId,
                issueDate: bill.issueDate,
                dueDate: bill.dueDate,
                totalAmount: bill.totalAmount,
                amountDue: bill.amountDue,
                status: bill.status,
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
            <TableHead className="w-10"><input type="checkbox" aria-label="Select all bills" checked={allSelected} onChange={() => onSelectionChange?.(allSelected ? new Set() : new Set(bills.map((bill) => bill.id)))} /></TableHead>
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
            <TableRow key={bill.id} className={cn(selectedId === bill.id ? "bg-primary/5" : undefined)} onClick={() => onSelect?.(bill.id)}>
              <TableCell onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Select bill ${bill.billNumber}`} checked={selectedIds?.has(bill.id) ?? false} onChange={() => toggleOne(bill.id)} /></TableCell>
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
