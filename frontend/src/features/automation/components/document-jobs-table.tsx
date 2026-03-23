import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateDisplay } from "@/components/shared/date-display";
import { AutomationStatusBadge } from "@/features/automation/components/automation-status-badge";
import type { DocumentIntelligenceJob } from "@/features/automation/types";

export function DocumentJobsTable({ jobs, selectedJobId, onSelect }: { jobs: DocumentIntelligenceJob[]; selectedJobId?: string | null; onSelect: (job: DocumentIntelligenceJob) => void; }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job</TableHead>
            <TableHead>Document type</TableHead>
            <TableHead className="text-right">Attempts</TableHead>
            <TableHead>Review required</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id} data-state={selectedJobId === job.id ? "selected" : undefined}>
              <TableCell><div className="flex flex-col gap-0.5"><span className="font-medium">{job.entityType || "document"} {job.entityId || job.fileId || job.id}</span><span className="text-xs text-muted-foreground">{job.id}</span></div></TableCell>
              <TableCell>{job.documentType || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-right tabular-nums">{job.attempts}</TableCell>
              <TableCell>{job.reviewRequired ? "Yes" : "No"}</TableCell>
              <TableCell><AutomationStatusBadge value={job.status} /></TableCell>
              <TableCell><DateDisplay value={job.updatedAt} includeTime /></TableCell>
              <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => onSelect(job)}>Inspect</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
