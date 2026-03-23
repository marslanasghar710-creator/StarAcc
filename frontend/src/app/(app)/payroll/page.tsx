"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, Calculator, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreatePayrollPeriod, useCreatePayrollRun, usePayrollLiabilities, usePayrollPeriods, usePayrollRuns, usePayrollSummary } from "@/features/payroll/hooks";
import { type PayrollPeriodFormValues, type PayrollRunFormValues } from "@/features/payroll/schemas";
import { PayrollPeriodFormDialog } from "@/features/payroll/components/payroll-period-form-dialog";
import { PayrollPeriodListTable } from "@/features/payroll/components/payroll-period-list-table";
import { PayrollRunFormDialog } from "@/features/payroll/components/payroll-run-form-dialog";
import { PayrollRunListTable } from "@/features/payroll/components/payroll-run-list-table";
import { PayrollSummaryCards } from "@/features/payroll/components/payroll-summary-cards";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function PayrollPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("payroll.read");
  const canCreate = can("payroll.create");
  const [isPeriodOpen, setIsPeriodOpen] = React.useState(false);
  const [isRunOpen, setIsRunOpen] = React.useState(false);
  const [runSearch, setRunSearch] = React.useState("");

  const periodsQuery = usePayrollPeriods(currentOrganizationId ?? undefined, canRead);
  const runsQuery = usePayrollRuns(currentOrganizationId ?? undefined, canRead);
  const summaryQuery = usePayrollSummary(currentOrganizationId ?? undefined, canRead);
  const liabilitiesQuery = usePayrollLiabilities(currentOrganizationId ?? undefined, canRead);
  const createPeriodMutation = useCreatePayrollPeriod(currentOrganizationId ?? undefined);
  const createRunMutation = useCreatePayrollRun(currentOrganizationId ?? undefined);

  const filteredRuns = React.useMemo(() => {
    const rows = runsQuery.data ?? [];
    const term = runSearch.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((run) => [run.name, run.status, run.periodStartDate, run.periodEndDate].some((value) => value?.toLowerCase().includes(term)));
  }, [runSearch, runsQuery.data]);

  async function handleCreatePeriod(values: PayrollPeriodFormValues) {
    const period = await createPeriodMutation.mutateAsync({
      name: values.name || null,
      start_date: values.start_date,
      end_date: values.end_date,
      payment_date: values.payment_date || null,
      frequency: values.frequency || null,
    });
    toast.success(`Created payroll period ${period.name}`);
  }

  async function handleCreateRun(values: PayrollRunFormValues) {
    const run = await createRunMutation.mutateAsync({
      payroll_period_id: values.payroll_period_id,
      name: values.name || null,
      pay_date: values.pay_date || null,
    });
    toast.success(`Created payroll run ${run.name}`);
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading payroll workspace" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening payroll." />;
  }

  if (!canRead) {
    return <AccessDeniedState description="You need payroll.read to access payroll periods, runs, and summaries." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Payroll"}
        title="Payroll"
        description="Run payroll review workflows with backend-backed employee, period, run, summary, and liability data. The frontend never calculates payroll truth."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/payroll/employees"><Users className="size-4" />Employees</Link></Button>
            {canCreate ? <Button variant="outline" onClick={() => setIsPeriodOpen(true)}><CalendarDays className="size-4" />New period</Button> : null}
            {canCreate ? <Button onClick={() => setIsRunOpen(true)}><Plus className="size-4" />New payroll run</Button> : null}
          </div>
        }
      />

      <PayrollSummaryCards summary={summaryQuery.data} liabilities={liabilitiesQuery.data ?? []} currencyCode={currentOrganization?.base_currency} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Workflow guardrails</CardTitle>
            <CardDescription>Payroll actions respect permissions and backend-owned accounting truth.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Use calculate only when the payroll run is ready for backend gross-to-net processing.</p>
            <p>Use post only after reviewing all entries and payslip detail on the run page.</p>
            <p>Employees and pay periods stay editable only for roles with the relevant permissions.</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Permission state</CardTitle>
            <CardDescription>Current role capabilities in the payroll workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium">payroll.create</span>: {canCreate ? "Allowed" : "Restricted"}</p>
            <p><span className="font-medium">payroll.calculate</span>: {can("payroll.calculate") ? "Allowed" : "Restricted"}</p>
            <p><span className="font-medium">payroll.post</span>: {can("payroll.post") ? "Allowed" : "Restricted"}</p>
            <p><span className="font-medium">employees.manage</span>: {can("employees.manage") ? "Allowed" : "Restricted"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Review checklist</CardTitle>
            <CardDescription>Recommended operational flow for each run.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Confirm employee master data and selected payroll period.</p>
            <p>2. Create the payroll run and review period dates and pay date.</p>
            <p>3. Calculate, inspect payslip entries, then post when approved.</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="runs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="runs">Payroll runs</TabsTrigger>
          <TabsTrigger value="periods">Payroll periods</TabsTrigger>
        </TabsList>
        <TabsContent value="runs" className="space-y-4">
          <PageActionBar
            left={<Input className="max-w-md" value={runSearch} onChange={(event) => setRunSearch(event.target.value)} placeholder="Search runs by name, status, or period dates" />}
            right={<p className="text-sm text-muted-foreground">Open a run to calculate, post, and inspect payslip details.</p>}
          />
          {runsQuery.isLoading ? <LoadingScreen label="Loading payroll runs" /> : null}
          {runsQuery.isError ? <ErrorState description="We couldn't load payroll runs." onRetry={() => void runsQuery.refetch()} /> : null}
          {!runsQuery.isLoading && !runsQuery.isError && filteredRuns.length === 0 ? (
            <EmptyState title={runSearch ? "No matching payroll runs" : "No payroll runs yet"} description={runSearch ? "Try a broader search term." : "Create your first payroll run after defining a period."} action={canCreate ? <Button onClick={() => setIsRunOpen(true)}><Plus className="size-4" />Create payroll run</Button> : undefined} />
          ) : null}
          {!runsQuery.isLoading && !runsQuery.isError && filteredRuns.length > 0 ? <PayrollRunListTable runs={filteredRuns} currencyCode={currentOrganization?.base_currency} /> : null}
        </TabsContent>
        <TabsContent value="periods" className="space-y-4">
          {periodsQuery.isLoading ? <LoadingScreen label="Loading payroll periods" /> : null}
          {periodsQuery.isError ? <ErrorState description="We couldn't load payroll periods." onRetry={() => void periodsQuery.refetch()} /> : null}
          {!periodsQuery.isLoading && !periodsQuery.isError && (periodsQuery.data?.length ?? 0) === 0 ? (
            <EmptyState title="No payroll periods yet" description="Create a payroll period to organize pay dates and workforce coverage." action={canCreate ? <Button onClick={() => setIsPeriodOpen(true)}><CalendarDays className="size-4" />Create payroll period</Button> : undefined} />
          ) : null}
          {!periodsQuery.isLoading && !periodsQuery.isError && (periodsQuery.data?.length ?? 0) > 0 ? <PayrollPeriodListTable periods={periodsQuery.data ?? []} /> : null}
        </TabsContent>
      </Tabs>

      <PayrollPeriodFormDialog open={isPeriodOpen} onOpenChange={setIsPeriodOpen} onSubmit={handleCreatePeriod} isSubmitting={createPeriodMutation.isPending} />
      <PayrollRunFormDialog open={isRunOpen} onOpenChange={setIsRunOpen} onSubmit={handleCreateRun} isSubmitting={createRunMutation.isPending} periods={periodsQuery.data ?? []} />
    </div>
  );
}
