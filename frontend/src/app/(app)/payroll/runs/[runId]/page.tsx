"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalculatePayrollRun, usePayrollEntry, usePayrollRun, usePayrollRunEntries, usePostPayrollRun } from "@/features/payroll/hooks";
import { PayrollEntryDetailCard } from "@/features/payroll/components/payroll-entry-detail-card";
import { PayrollRunEntriesTable } from "@/features/payroll/components/payroll-run-entries-table";
import { PayrollStatusBadge } from "@/features/payroll/components/payroll-status-badge";
import { PayrollWorkflowActions } from "@/features/payroll/components/payroll-workflow-actions";
import type { PayrollEntry } from "@/features/payroll/types";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function PayrollRunDetailPage() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("payroll.read");
  const canCalculate = can("payroll.calculate");
  const canPost = can("payroll.post");
  const [selectedEntryId, setSelectedEntryId] = React.useState<string | null>(null);

  const runQuery = usePayrollRun(currentOrganizationId ?? undefined, runId, canRead);
  const entriesQuery = usePayrollRunEntries(currentOrganizationId ?? undefined, runId, canRead);
  const selectedEntryQuery = usePayrollEntry(currentOrganizationId ?? undefined, selectedEntryId ?? undefined, canRead && Boolean(selectedEntryId));
  const calculateMutation = useCalculatePayrollRun(currentOrganizationId ?? undefined, runId);
  const postMutation = usePostPayrollRun(currentOrganizationId ?? undefined, runId);

  React.useEffect(() => {
    if (!selectedEntryId && (entriesQuery.data?.length ?? 0) > 0) {
      setSelectedEntryId(entriesQuery.data?.[0]?.id ?? null);
    }
  }, [entriesQuery.data, selectedEntryId]);

  async function handleCalculate() {
    const run = await calculateMutation.mutateAsync();
    toast.success(`Calculated ${run.name}`);
  }

  async function handlePost() {
    const run = await postMutation.mutateAsync();
    toast.success(`Posted ${run.name}`);
  }

  function handleSelectEntry(entry: PayrollEntry) {
    setSelectedEntryId(entry.id);
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading payroll run" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening a payroll run." />;
  }

  if (!canRead) {
    return <AccessDeniedState description="You need payroll.read to review payroll runs and payslips." />;
  }

  if (runQuery.isLoading) {
    return <LoadingScreen label="Loading payroll run" />;
  }

  if (runQuery.isError) {
    return <ErrorState description="We couldn't load this payroll run." onRetry={() => void runQuery.refetch()} />;
  }

  const run = runQuery.data;

  if (!run) {
    return <EmptyState title="Payroll run not found" description="The requested payroll run could not be found in the active organization." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Payroll"}
        title={run.name}
        description="Review run totals, calculate or post with confirmation, and inspect per-employee payslip details without reproducing payroll logic in the UI."
        actions={<Button asChild variant="outline"><Link href="/payroll"><ArrowLeft className="size-4" />Back to payroll</Link></Button>}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Run status</CardTitle><CardDescription>Backend workflow state</CardDescription></CardHeader><CardContent><PayrollStatusBadge value={run.status} /></CardContent></Card>
            <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Total gross</CardTitle><CardDescription>Gross-to-net source data</CardDescription></CardHeader><CardContent><p className="font-semibold"><MoneyDisplay value={run.totalGross} currencyCode={run.currencyCode || currentOrganization?.base_currency} /></p></CardContent></Card>
            <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Total deductions</CardTitle><CardDescription>Backend deductions result</CardDescription></CardHeader><CardContent><p className="font-semibold"><MoneyDisplay value={run.totalDeductions} currencyCode={run.currencyCode || currentOrganization?.base_currency} /></p></CardContent></Card>
            <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Total net</CardTitle><CardDescription>Net payable</CardDescription></CardHeader><CardContent><p className="font-semibold"><MoneyDisplay value={run.totalNet} currencyCode={run.currencyCode || currentOrganization?.base_currency} /></p></CardContent></Card>
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Run review</CardTitle>
              <CardDescription>Core run information and payroll review context.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div><p className="text-sm text-muted-foreground">Payroll period</p><p className="mt-1 text-sm"><DateDisplay value={run.periodStartDate} /> – <DateDisplay value={run.periodEndDate} /></p></div>
              <div><p className="text-sm text-muted-foreground">Pay date</p><p className="mt-1 text-sm"><DateDisplay value={run.payDate} /></p></div>
              <div><p className="text-sm text-muted-foreground">Employees</p><p className="mt-1 text-sm tabular-nums">{run.employeeCount}</p></div>
              <div><p className="text-sm text-muted-foreground">Calculated / posted</p><p className="mt-1 text-sm"><DateDisplay value={run.calculatedAt} /> / <DateDisplay value={run.postedAt} /></p></div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Payroll entries</CardTitle>
              <CardDescription>Select an employee row to inspect their backend-generated payslip details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {entriesQuery.isLoading ? <LoadingScreen label="Loading payroll entries" /> : null}
              {entriesQuery.isError ? <ErrorState description="We couldn't load payroll entries." onRetry={() => void entriesQuery.refetch()} /> : null}
              {!entriesQuery.isLoading && !entriesQuery.isError && (entriesQuery.data?.length ?? 0) === 0 ? <EmptyState title="No payroll entries yet" description="Calculate the payroll run to populate per-employee entries and payslip lines." /> : null}
              {!entriesQuery.isLoading && !entriesQuery.isError && (entriesQuery.data?.length ?? 0) > 0 ? <PayrollRunEntriesTable entries={entriesQuery.data ?? []} selectedEntryId={selectedEntryId} onSelectEntry={handleSelectEntry} currencyCode={run.currencyCode || currentOrganization?.base_currency} /> : null}
            </CardContent>
          </Card>

          {selectedEntryId ? (
            selectedEntryQuery.isLoading ? <LoadingScreen label="Loading payslip detail" /> :
            selectedEntryQuery.isError ? <ErrorState description="We couldn't load the selected payslip detail." onRetry={() => void selectedEntryQuery.refetch()} /> :
            selectedEntryQuery.data ? <PayrollEntryDetailCard entry={selectedEntryQuery.data} currencyCode={run.currencyCode || currentOrganization?.base_currency} /> : null
          ) : null}
        </div>

        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <PayrollWorkflowActions
            run={run}
            canCalculate={canCalculate && !["posted", "processing"].includes(run.status)}
            canPost={canPost && ["calculated", "open", "draft"].includes(run.status)}
            onCalculate={handleCalculate}
            onPost={handlePost}
            isCalculating={calculateMutation.isPending}
            isPosting={postMutation.isPending}
          />
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Permission-aware workflow</CardTitle>
              <CardDescription>Current role visibility for this run.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="font-medium">payroll.calculate</span>: {canCalculate ? "Allowed" : "Restricted"}</p>
              <p><span className="font-medium">payroll.post</span>: {canPost ? "Allowed" : "Restricted"}</p>
              <p><span className="font-medium">payroll.read</span>: {canRead ? "Allowed" : "Restricted"}</p>
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Operational note</CardTitle>
              <CardDescription>Frontend review only; backend truth always wins.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Do not interpret displayed earnings and deductions as client-side calculations.</p>
              <p>Every amount on this page comes from payroll run and payroll entry endpoints.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
