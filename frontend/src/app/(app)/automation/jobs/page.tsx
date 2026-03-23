"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BrainCircuit } from "lucide-react";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AIJobDetailCard } from "@/features/automation/components/ai-job-detail-card";
import { AIJobsTable } from "@/features/automation/components/ai-jobs-table";
import { useAIJob, useAIJobs } from "@/features/automation/hooks";
import type { AIJob } from "@/features/automation/types";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function AutomationJobsPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("ai_jobs.read");
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);

  const jobsQuery = useAIJobs(currentOrganizationId ?? undefined, canRead);
  const jobDetailQuery = useAIJob(currentOrganizationId ?? undefined, selectedJobId ?? undefined, canRead && Boolean(selectedJobId));

  React.useEffect(() => {
    if (!selectedJobId && (jobsQuery.data?.length ?? 0) > 0) {
      setSelectedJobId(jobsQuery.data?.[0]?.id ?? null);
    }
  }, [jobsQuery.data, selectedJobId]);

  function handleSelectJob(job: AIJob) {
    setSelectedJobId(job.id);
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading AI jobs" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening AI jobs." />;
  }

  if (!canRead) {
    return <AccessDeniedState description="You need ai_jobs.read to inspect backend AI job status and detail." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Automation"}
        title="AI jobs"
        description="Monitor backend AI and automation job execution, retries, review flags, and error states without granting AI authority over accounting truth."
        actions={<Button asChild variant="outline"><Link href="/automation"><ArrowLeft className="size-4" />Back to automation</Link></Button>}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Total jobs</CardTitle><CardDescription>Jobs visible in the active organization.</CardDescription></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{jobsQuery.data?.length ?? 0}</p></CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Running jobs</CardTitle><CardDescription>Currently active or queued work.</CardDescription></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{(jobsQuery.data ?? []).filter((job) => ["queued", "running"].includes(job.status)).length}</p></CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Failed jobs</CardTitle><CardDescription>Jobs with returned backend errors.</CardDescription></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{(jobsQuery.data ?? []).filter((job) => job.status === "failed").length}</p></CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Review-required jobs</CardTitle><CardDescription>Jobs that still need human review.</CardDescription></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{(jobsQuery.data ?? []).filter((job) => job.reviewRequired).length}</p></CardContent></Card>
      </div>

      {jobsQuery.isLoading ? <LoadingScreen label="Loading AI jobs" /> : null}
      {jobsQuery.isError ? <ErrorState description="We couldn't load AI jobs." onRetry={() => void jobsQuery.refetch()} /> : null}
      {!jobsQuery.isLoading && !jobsQuery.isError && (jobsQuery.data?.length ?? 0) === 0 ? <EmptyState title="No AI jobs yet" description="AI and automation jobs will appear here as the backend queues extraction, suggestion, or automation work." action={<Button variant="outline" onClick={() => void jobsQuery.refetch()}><BrainCircuit className="size-4" />Refresh jobs</Button>} /> : null}
      {!jobsQuery.isLoading && !jobsQuery.isError && (jobsQuery.data?.length ?? 0) > 0 ? <AIJobsTable jobs={jobsQuery.data ?? []} selectedJobId={selectedJobId} onSelect={handleSelectJob} /> : null}

      {jobDetailQuery.isLoading ? <LoadingScreen label="Loading AI job detail" /> : null}
      {jobDetailQuery.isError ? <ErrorState description="We couldn't load the selected AI job detail." onRetry={() => void jobDetailQuery.refetch()} /> : null}
      {jobDetailQuery.data ? <AIJobDetailCard job={jobDetailQuery.data} /> : null}
    </div>
  );
}
