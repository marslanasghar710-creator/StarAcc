import Link from "next/link";

import { DateDisplay } from "@/components/shared/date-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JournalStatusBadge } from "@/features/journals/components/journal-status-badge";
import type { Journal } from "@/features/journals/types";
import type { Period } from "@/features/periods/types";

export function JournalListTable({ journals, periods }: { journals: Journal[]; periods: Period[] }) {
  const periodMap = new Map(periods.map((period) => [period.id, period]));

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entry number</TableHead>
            <TableHead>Entry date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Created by</TableHead>
            <TableHead>Posted at</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {journals.map((journal) => (
            <TableRow key={journal.id}>
              <TableCell className="font-medium"><Link href={`/journals/${journal.id}`} className="hover:text-primary">{journal.entryNumber}</Link></TableCell>
              <TableCell><DateDisplay value={journal.entryDate} /></TableCell>
              <TableCell>{journal.description}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{journal.sourceModule || <span className="text-muted-foreground">Manual</span>}</div>
                  <div className="text-muted-foreground">{journal.sourceType || "Journal"}</div>
                </div>
              </TableCell>
              <TableCell><JournalStatusBadge status={journal.status} /></TableCell>
              <TableCell>{journal.periodName ?? periodMap.get(journal.periodId)?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell>{journal.createdBy || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell><DateDisplay value={journal.postedAt} includeTime /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
