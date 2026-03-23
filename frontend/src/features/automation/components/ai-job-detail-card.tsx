import { DateDisplay } from "@/components/shared/date-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AutomationStatusBadge } from "@/features/automation/components/automation-status-badge";
import { StructuredDataViewer } from "@/features/automation/components/structured-data-viewer";
import type { AIJob } from "@/features/automation/types";

export function AIJobDetailCard({ job }: { job: AIJob }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>AI job detail</CardTitle>
        <CardDescription>Review queue state, attempts, errors, and metadata without allowing AI jobs to become authoritative for accounting state.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-sm text-muted-foreground">Status</p><div className="mt-1"><AutomationStatusBadge value={job.status} /></div></div>
          <div><p className="text-sm text-muted-foreground">Attempts</p><p className="mt-1 font-medium tabular-nums">{job.attempts}{job.maxAttempts != null ? ` / ${job.maxAttempts}` : ""}</p></div>
          <div><p className="text-sm text-muted-foreground">Progress</p><p className="mt-1 font-medium">{job.progressPercent != null ? `${job.progressPercent}%` : "—"}</p></div>
          <div><p className="text-sm text-muted-foreground">Review required</p><p className="mt-1 font-medium">{job.reviewRequired ? "Yes" : "No"}</p></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><p className="text-sm text-muted-foreground">Created</p><p className="mt-1 text-sm"><DateDisplay value={job.createdAt} includeTime /></p></div>
          <div><p className="text-sm text-muted-foreground">Completed</p><p className="mt-1 text-sm"><DateDisplay value={job.completedAt} includeTime /></p></div>
        </div>
        {job.errorMessage ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{job.errorMessage}</div> : null}
        <div>
          <p className="text-sm text-muted-foreground">Metadata</p>
          <StructuredDataViewer data={job.metadata} className="mt-2" emptyLabel="No job metadata returned." />
        </div>
      </CardContent>
    </Card>
  );
}
