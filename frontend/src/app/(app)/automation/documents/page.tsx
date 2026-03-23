"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, FileSearch } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentExtractionFormCard } from "@/features/automation/components/document-extraction-form-card";
import { DocumentJobDetailCard } from "@/features/automation/components/document-job-detail-card";
import { DocumentJobsTable } from "@/features/automation/components/document-jobs-table";
import { useDocumentIntelligenceJob, useDocumentIntelligenceJobs, useRunDocumentExtraction } from "@/features/automation/hooks";
import { type DocumentExtractionFormValues } from "@/features/automation/schemas";
import type { DocumentIntelligenceJob } from "@/features/automation/types";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function AutomationDocumentsPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("document_intelligence.read");
  const canRun = can("document_intelligence.run");
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);

  const jobsQuery = useDocumentIntelligenceJobs(currentOrganizationId ?? undefined, canRead);
  const selectedJobQuery = useDocumentIntelligenceJob(currentOrganizationId ?? undefined, selectedJobId ?? undefined, canRead && Boolean(selectedJobId));
  const runExtractionMutation = useRunDocumentExtraction(currentOrganizationId ?? undefined);

  React.useEffect(() => {
    if (!selectedJobId && (jobsQuery.data?.length ?? 0) > 0) {
      setSelectedJobId(jobsQuery.data?.[0]?.id ?? null);
    }
  }, [jobsQuery.data, selectedJobId]);

  async function handleRunExtraction(values: DocumentExtractionFormValues) {
    const job = await runExtractionMutation.mutateAsync({
      file_id: values.file_id || null,
      entity_type: values.entity_type || null,
      entity_id: values.entity_id || null,
      document_type: values.document_type || null,
    });
    setSelectedJobId(job.id);
    toast.success(`Started extraction job ${job.id}`);
  }

  function handleSelectJob(job: DocumentIntelligenceJob) {
    setSelectedJobId(job.id);
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading document intelligence" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening document intelligence." />;
  }

  if (!canRead && !canRun) {
    return <AccessDeniedState description="You need document intelligence permissions to access this area." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Automation"}
        title="Document intelligence"
        description="Run extraction jobs and review structured results with explainability before any human accounting decision is made."
        actions={<Button asChild variant="outline"><Link href="/automation"><ArrowLeft className="size-4" />Back to automation</Link></Button>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Total extraction jobs</CardTitle><CardDescription>Document intelligence jobs returned by the backend.</CardDescription></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{jobsQuery.data?.length ?? 0}</p></CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Review-required jobs</CardTitle><CardDescription>Jobs that still need human validation.</CardDescription></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{(jobsQuery.data ?? []).filter((job) => job.reviewRequired).length}</p></CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Permission state</CardTitle><CardDescription>Current access to run and inspect extraction jobs.</CardDescription></CardHeader><CardContent className="space-y-1 text-sm"><p>Read: {canRead ? "Allowed" : "Restricted"}</p><p>Run: {canRun ? "Allowed" : "Restricted"}</p></CardContent></Card>
      </div>

      {canRun ? <DocumentExtractionFormCard onSubmit={handleRunExtraction} isSubmitting={runExtractionMutation.isPending} /> : <AccessDeniedState title="Extraction runs restricted" description="Your role can view this area but cannot start new extraction jobs." />}

      {canRead ? (
        <>
          {jobsQuery.isLoading ? <LoadingScreen label="Loading document intelligence jobs" /> : null}
          {jobsQuery.isError ? <ErrorState description="We couldn't load document intelligence jobs." onRetry={() => void jobsQuery.refetch()} /> : null}
          {!jobsQuery.isLoading && !jobsQuery.isError && (jobsQuery.data?.length ?? 0) === 0 ? <EmptyState title="No extraction jobs yet" description="Run document extraction to create the first backend review job for this organization." action={canRun ? <Button onClick={() => void jobsQuery.refetch()}><FileSearch className="size-4" />Refresh jobs</Button> : undefined} /> : null}
          {!jobsQuery.isLoading && !jobsQuery.isError && (jobsQuery.data?.length ?? 0) > 0 ? <DocumentJobsTable jobs={jobsQuery.data ?? []} selectedJobId={selectedJobId} onSelect={handleSelectJob} /> : null}

          {selectedJobQuery.isLoading ? <LoadingScreen label="Loading extraction review" /> : null}
          {selectedJobQuery.isError ? <ErrorState description="We couldn't load the selected extraction review." onRetry={() => void selectedJobQuery.refetch()} /> : null}
          {selectedJobQuery.data ? <DocumentJobDetailCard job={selectedJobQuery.data.job} result={selectedJobQuery.data.result} /> : null}
        </>
      ) : null}
    </div>
  );
}
