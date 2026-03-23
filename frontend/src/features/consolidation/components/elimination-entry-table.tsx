import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EliminationEntry } from "@/features/consolidation/types";

export function EliminationEntryTable({ entries }: { entries: EliminationEntry[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Lines</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="font-medium">{entry.description}</TableCell>
            <TableCell>{entry.is_manual ? "Manual" : "Auto"}</TableCell>
            <TableCell>{entry.period_start} → {entry.period_end}</TableCell>
            <TableCell>{entry.journal_lines.length}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
