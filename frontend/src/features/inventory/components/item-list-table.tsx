import Link from "next/link";
import { Pencil } from "lucide-react";

import { MoneyDisplay } from "@/components/shared/money-display";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InventoryStatusBadge } from "@/features/inventory/components/inventory-status-badge";
import type { InventoryBalance, InventoryItem } from "@/features/inventory/types";

export function ItemListTable({
  items,
  balanceByItemId,
  canEdit,
  onEdit,
  currencyCode,
}: {
  items: InventoryItem[];
  balanceByItemId?: Map<string, InventoryBalance>;
  canEdit?: boolean;
  onEdit?: (item: InventoryItem) => void;
  currencyCode?: string | null;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tracking</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Sales price</TableHead>
            <TableHead className="text-right">Purchase price</TableHead>
            <TableHead className="text-right">Qty on hand</TableHead>
            <TableHead className="text-right">Inventory value</TableHead>
            {canEdit ? <TableHead className="w-[88px] text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const balance = balanceByItemId?.get(item.id);
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-muted-foreground">{item.sku || "—"}</TableCell>
                <TableCell>
                  <Link href={`/inventory/items/${item.id}`} className="flex flex-col gap-0.5 hover:text-primary">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{item.description || "Backend-managed inventory master record."}</span>
                  </Link>
                </TableCell>
                <TableCell><InventoryStatusBadge kind="active" value={item.isActive} /></TableCell>
                <TableCell><InventoryStatusBadge kind="tracked" value={item.isTrackedInventory} /></TableCell>
                <TableCell>{item.unitOfMeasure || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-right"><MoneyDisplay value={item.salesPrice} currencyCode={currencyCode} /></TableCell>
                <TableCell className="text-right"><MoneyDisplay value={item.purchasePrice} currencyCode={currencyCode} /></TableCell>
                <TableCell className="text-right tabular-nums">{balance?.quantityOnHand ?? "0"}</TableCell>
                <TableCell className="text-right"><MoneyDisplay value={balance?.inventoryValue} currencyCode={currencyCode} /></TableCell>
                {canEdit ? (
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="icon" onClick={() => onEdit?.(item)}>
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
