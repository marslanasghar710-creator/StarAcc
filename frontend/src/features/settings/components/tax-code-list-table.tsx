import * as React from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TaxCodeStatusBadge } from "@/features/settings/components/tax-code-status-badge";
import type { TaxCodeRecord } from "@/features/settings/types";

export function TaxCodeListTable({ taxCodes, canEdit, canArchive, onEdit, onArchive }: { taxCodes: TaxCodeRecord[]; canEdit: boolean; canArchive: boolean; onEdit: (taxCode: TaxCodeRecord) => void; onArchive: (taxCode: TaxCodeRecord) => void; }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Rate</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Applies to</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {taxCodes.map((taxCode) => (
          <TableRow key={taxCode.id}>
            <TableCell>{taxCode.name}</TableCell>
            <TableCell>{taxCode.code}</TableCell>
            <TableCell>{taxCode.rate}%</TableCell>
            <TableCell>{taxCode.type || "—"}</TableCell>
            <TableCell>{[taxCode.appliesToSales ? "Sales" : null, taxCode.appliesToPurchases ? "Purchases" : null].filter(Boolean).join(" / ") || "—"}</TableCell>
            <TableCell><TaxCodeStatusBadge isActive={taxCode.isActive} /></TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                {canEdit ? <Button type="button" variant="outline" onClick={() => onEdit(taxCode)}>Edit</Button> : null}
                {canArchive ? <Button type="button" variant="outline" onClick={() => onArchive(taxCode)}>Archive</Button> : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
