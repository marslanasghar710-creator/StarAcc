import Link from "next/link";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CustomerStatusBadge } from "@/features/customers/components/customer-status-badge";
import type { Customer } from "@/features/customers/types";

export function CustomerListTable({ customers }: { customers: Customer[] }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Payment terms</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>
                <Link href={`/customers/${customer.id}`} className="block hover:text-primary">
                  <div className="font-medium">{customer.displayName}</div>
                  <div className="text-muted-foreground">{customer.legalName || customer.customerNumber || "—"}</div>
                </Link>
              </TableCell>
              <TableCell>{customer.email || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell>{customer.phone || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell>{customer.currencyCode || <span className="text-muted-foreground">Base</span>}</TableCell>
              <TableCell>{customer.paymentTermsDays ? `${customer.paymentTermsDays} days` : <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell><CustomerStatusBadge isActive={customer.isActive} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
