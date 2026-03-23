import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateDisplay } from "@/components/shared/date-display";
import { AutomationStatusBadge } from "@/features/automation/components/automation-status-badge";
import type { AIJob } from "@/features/automation/types";

export function AIJobsTable({ jobs, selectedJobId, onSelect }: { jobs: AIJob[]; selectedJobId?: string | null; onSelect: (job: AIJob) => void; }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Attempts</TableHead>
            <TableHead className="text-right">Progress</TableHead>
            <TableHead>Related entity</TableHead>
            <TableHead>Started</TableHead>
            <TableHead className="text-right">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id} data-state={selectedJobId === job.id ? "selected" : undefined}>
              <TableCell><div className="flex flex-col gap-0.5"><span className="font-medium capitalize">{job.jobType.replaceAll("_", " ")}</span><span className="text-xs text-muted-foreground">{job.id}</span></div></TableCell>
              <TableCell><AutomationStatusBadge value={job.status} /></TableCell>
              <TableCell className="text-right tabular-nums">{job.attempts}{job.maxAttempts != null ? ` / ${job.maxAttempts}` : ""}</TableCell>
              <TableCell className="text-right tabular-nums">{job.progressPercent != null ? `${job.progressPercent}%` : "—"}</TableCell>
              <TableCell>{job.relatedEntityType || <span className="text-muted-foreground">—</span>} {job.relatedEntityId || ""}</TableCell>
              <TableCell><DateDisplay value={job.startedAt} includeTime /></TableCell>
              <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => onSelect(job)}>Inspect</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
