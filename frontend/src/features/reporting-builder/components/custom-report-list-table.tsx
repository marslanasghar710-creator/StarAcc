import Link from "next/link";
import { Play, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SavedCustomReport } from "@/features/reporting-builder/types";

export function CustomReportListTable({ reports, onRun, onDelete, canDelete }: { reports: SavedCustomReport[]; onRun: (reportId: string) => void; onDelete: (reportId: string) => void; canDelete: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Dataset</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Created by</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Last run</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell>
                <div className="font-medium"><Link href={`/reports/custom/${report.id}`} className="hover:underline">{report.name}</Link></div>
                {report.validationErrors.length ? <p className="text-xs text-amber-600">Needs repair</p> : null}
              </TableCell>
              <TableCell>{report.datasetId}</TableCell>
              <TableCell>{report.description || "—"}</TableCell>
              <TableCell>{report.createdByEmail || "Unknown"}</TableCell>
              <TableCell>{report.updatedAt ? new Date(report.updatedAt).toLocaleString() : "—"}</TableCell>
              <TableCell>{report.lastRunAt ? new Date(report.lastRunAt).toLocaleString() : "Never"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onRun(report.id)}><Play className="size-4" />Run</Button>
                  {canDelete ? <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(report.id)} aria-label="Delete report"><Trash2 className="size-4" /></Button> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
