import { DateDisplay } from "@/components/shared/date-display";
import { DecimalDisplay } from "@/components/shared/decimal-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InventoryStatusBadge } from "@/features/inventory/components/inventory-status-badge";
import type { InventoryAdjustment } from "@/features/inventory/types";

export function InventoryAdjustmentListTable({
  adjustments,
  itemNames,
  accountNames,
  currencyCode,
}: {
  adjustments: InventoryAdjustment[];
  itemNames: Record<string, string>;
  accountNames: Record<string, string>;
  currencyCode?: string | null;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Unit cost</TableHead>
            <TableHead className="text-right">Total cost</TableHead>
            <TableHead>Offset account</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adjustments.map((adjustment) => (
            <TableRow key={adjustment.id}>
              <TableCell><DateDisplay value={adjustment.occurredAt} includeTime /></TableCell>
              <TableCell>{itemNames[adjustment.itemId] ?? adjustment.itemId}</TableCell>
              <TableCell><InventoryStatusBadge kind="adjustment" value={adjustment.adjustmentType} /></TableCell>
              <TableCell className="text-right tabular-nums"><DecimalDisplay value={adjustment.quantity} /></TableCell>
              <TableCell className="text-right"><MoneyDisplay value={adjustment.unitCost} currencyCode={currencyCode} /></TableCell>
              <TableCell className="text-right"><MoneyDisplay value={adjustment.totalCost} currencyCode={currencyCode} /></TableCell>
              <TableCell className="break-all">{accountNames[adjustment.offsetAccountId] ?? adjustment.offsetAccountId}</TableCell>
              <TableCell>
                <div className="space-y-0.5">
                  <div>{adjustment.reason}</div>
                  <div className="text-xs text-muted-foreground">{adjustment.notes || "No additional notes."}</div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
