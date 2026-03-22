import * as React from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateDisplay } from "@/components/shared/date-display";
import type { FiscalPeriodRecord } from "@/features/settings/types";

export function FiscalPeriodListTable({ periods, canEdit, canClose, canReopen, onEdit, onClose, onReopen }: { periods: FiscalPeriodRecord[]; canEdit: boolean; canClose: boolean; canReopen: boolean; onEdit: (period: FiscalPeriodRecord) => void; onClose: (period: FiscalPeriodRecord) => void; onReopen: (period: FiscalPeriodRecord) => void; }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Closed at</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {periods.map((period) => (
          <TableRow key={period.id}>
            <TableCell>{period.name}</TableCell>
            <TableCell><DateDisplay value={period.startDate} /></TableCell>
            <TableCell><DateDisplay value={period.endDate} /></TableCell>
            <TableCell className="capitalize">{period.status}</TableCell>
            <TableCell><DateDisplay value={period.closedAt} includeTime /></TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                {canEdit ? <Button type="button" variant="outline" onClick={() => onEdit(period)}>Edit</Button> : null}
                {canClose && period.status === "open" ? <Button type="button" variant="outline" onClick={() => onClose(period)}>Close</Button> : null}
                {canReopen && period.status !== "open" ? <Button type="button" variant="outline" onClick={() => onReopen(period)}>Reopen</Button> : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
