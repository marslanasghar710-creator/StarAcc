import { DateDisplay } from "@/components/shared/date-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuditLogEntry } from "@/features/activity/types";

function formatMetadata(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return "—";
  }

  return JSON.stringify(value);
}

export function ActivityLogTable({ items }: { items: AuditLogEntry[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Metadata</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="whitespace-nowrap text-sm text-muted-foreground"><DateDisplay value={item.createdAt} includeTime /></TableCell>
            <TableCell>
              <div className="font-medium text-foreground">{item.action}</div>
              {item.ipAddress ? <div className="text-xs text-muted-foreground">IP {item.ipAddress}</div> : null}
            </TableCell>
            <TableCell>
              <div className="font-medium text-foreground">{item.entityType}</div>
              <div className="text-xs text-muted-foreground">{item.entityId || "No entity id"}</div>
            </TableCell>
            <TableCell>
              <div className="font-medium text-foreground">{item.actorEmail || "System"}</div>
              <div className="text-xs text-muted-foreground">{item.actorUserId || "No user id"}</div>
            </TableCell>
            <TableCell className="max-w-[360px]">
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">{formatMetadata(item.metadataJson)}</pre>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
