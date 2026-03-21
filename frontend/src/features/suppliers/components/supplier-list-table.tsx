import Link from "next/link";

import { MoneyDisplay } from "@/components/shared/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SupplierStatusBadge } from "@/features/suppliers/components/supplier-status-badge";
import type { Supplier, SupplierBalance } from "@/features/suppliers/types";

export function SupplierListTable({ suppliers, balanceMap }: { suppliers: Supplier[]; balanceMap?: Map<string, SupplierBalance> }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Supplier</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Payment terms</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => {
            const balance = balanceMap?.get(supplier.id);
            return (
              <TableRow key={supplier.id}>
                <TableCell>
                  <Link href={`/suppliers/${supplier.id}`} className="block hover:text-primary">
                    <div className="font-medium">{supplier.displayName}</div>
                    <div className="text-muted-foreground">{supplier.legalName || supplier.supplierNumber || "—"}</div>
                  </Link>
                </TableCell>
                <TableCell>{supplier.email || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{supplier.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{supplier.currencyCode || <span className="text-muted-foreground">Base</span>}</TableCell>
                <TableCell>{supplier.paymentTermsDays ? `${supplier.paymentTermsDays} days` : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell><SupplierStatusBadge isActive={supplier.isActive} /></TableCell>
                <TableCell className="text-right">{balance ? <MoneyDisplay value={balance.totalOutstanding} currencyCode={supplier.currencyCode} className="justify-end" /> : <span className="text-muted-foreground">—</span>}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
