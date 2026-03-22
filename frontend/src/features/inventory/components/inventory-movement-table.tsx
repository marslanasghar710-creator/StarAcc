import { DateDisplay } from "@/components/shared/date-display";
import { DecimalDisplay } from "@/components/shared/decimal-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InventoryStatusBadge } from "@/features/inventory/components/inventory-status-badge";
import type { InventoryMovement } from "@/features/inventory/types";

export function InventoryMovementTable({ movements, currencyCode }: { movements: InventoryMovement[]; currencyCode?: string | null }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Movement</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Unit cost</TableHead>
            <TableHead className="text-right">Total cost</TableHead>
            <TableHead className="text-right">Running balance</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell><DateDisplay value={movement.occurredAt || movement.postedAt} includeTime /></TableCell>
              <TableCell><InventoryStatusBadge kind="movement" value={movement.movementType} /></TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="capitalize">{movement.sourceEntityType.replaceAll("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">{movement.sourceEntityId || "—"}</div>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums"><DecimalDisplay value={movement.quantity} /></TableCell>
              <TableCell className="text-right"><MoneyDisplay value={movement.unitCost} currencyCode={currencyCode} /></TableCell>
              <TableCell className="text-right"><MoneyDisplay value={movement.totalCost} currencyCode={currencyCode} /></TableCell>
              <TableCell className="text-right tabular-nums">{movement.quantityBalanceAfter ? <DecimalDisplay value={movement.quantityBalanceAfter} /> : <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="max-w-[240px] text-sm text-muted-foreground">{movement.notes || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
