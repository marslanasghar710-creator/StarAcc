import Link from "next/link";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Group } from "@/features/consolidation/types";

export function GroupListTable({ groups }: { groups: Group[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Group</TableHead>
          <TableHead>Currency</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => (
          <TableRow key={group.id}>
            <TableCell>
              <Link className="font-medium text-primary underline-offset-4 hover:underline" href={`/consolidation/groups/${group.id}`}>
                {group.name}
              </Link>
            </TableCell>
            <TableCell>{group.reporting_currency}</TableCell>
            <TableCell>{group.description || "—"}</TableCell>
            <TableCell>{new Date(group.updated_at).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
