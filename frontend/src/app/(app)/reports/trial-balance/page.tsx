"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePeriods } from "@/features/periods/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { ReportDateRangePicker } from "@/features/reporting/components/report-date-range-picker";
import { ReportEmptyState } from "@/features/reporting/components/report-empty-state";
import { ReportErrorState } from "@/features/reporting/components/report-error-state";
import { ReportExportActions } from "@/features/reporting/components/report-export-actions";
import { ReportFilterBar } from "@/features/reporting/components/report-filter-bar";
import { ReportLoadingSkeleton } from "@/features/reporting/components/report-loading-skeleton";
import { ReportPageHeader } from "@/features/reporting/components/report-page-header";
import { ReportPeriodSelector } from "@/features/reporting/components/report-period-selector";
import { TrialBalanceTable } from "@/features/reporting/components/trial-balance-table";
import { useExportTrialBalance, useReportsMetadata, useTrialBalance } from "@/features/reporting/hooks";
import { trialBalanceFilterSchema } from "@/features/reporting/schemas";
import { todayIso, withUpdatedQuery } from "@/features/reporting/url-state";
import { useOrganization } from "@/providers/organization-provider";

const REPORT_PERMISSIONS = ["reports.read", "reporting.read", "trial_balance.read", "reports.trial_balance.read"];

export default function TrialBalancePage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission, can } = usePermissions();
  const canRead = hasAnyPermission(REPORT_PERMISSIONS);
  const metadataQuery = useReportsMetadata(currentOrganizationId ?? undefined, canRead);
  const periodsQuery = usePeriods(currentOrganizationId ?? undefined, canRead);
  const parsedFilters = trialBalanceFilterSchema.safeParse({
    as_of_date: searchParams.get("as_of_date") ?? todayIso(),
    period_id: searchParams.get("period_id") ?? "",
    account_type: searchParams.get("account_type") ?? "",
    search: searchParams.get("search") ?? "",
    include_zero_balances: searchParams.get("include_zero_balances") === "true",
  });
  const reportQuery = useTrialBalance(currentOrganizationId ?? undefined, parsedFilters.success ? parsedFilters.data : { as_of_date: todayIso(), period_id: "", account_type: "", search: "", include_zero_balances: false }, canRead && parsedFilters.success);
  const exportMutation = useExportTrialBalance(currentOrganizationId ?? undefined);

  function updateFilters(values: Record<string, string | boolean | null | undefined>) {
    const next = withUpdatedQuery(searchParams, values);
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  async function handleExport(format: "csv" | "pdf") {
    if (!parsedFilters.success || !currentOrganizationId) return;
    try {
      const result = await exportMutation.mutateAsync({ filters: parsedFilters.data, format });
      toast.success(`Started ${result.format.toUpperCase()} export: ${result.filename}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export trial balance.");
    }
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading trial balance" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening trial balance." />;
  if (!canRead) return <AccessDeniedState description="You need trial balance permissions to view this report." />;
  if (!parsedFilters.success) return <ReportErrorState title="Invalid trial balance filters" description="Adjust the query parameters and reload the report." onRetry={() => router.replace(pathname)} />;
  if (metadataQuery.isLoading || periodsQuery.isLoading) return <LoadingScreen label="Loading trial balance" />;
  if (metadataQuery.isError || periodsQuery.isError) return <ReportErrorState title="Trial balance filters unavailable" description="We couldn't load reporting metadata or fiscal periods." onRetry={() => { void metadataQuery.refetch(); void periodsQuery.refetch(); }} />;
  if (reportQuery.isLoading) return <ReportLoadingSkeleton />;
  if (reportQuery.isError || !reportQuery.data) return <ReportErrorState title="Trial balance unavailable" description="We couldn't load trial balance data from the backend." onRetry={() => void reportQuery.refetch()} />;

  const report = reportQuery.data;
  const metadataReports = (metadataQuery.data?.reports ?? []).map((item) => ({ ...item, isPermitted: hasAnyPermission(item.requiredPermissions) }));

  return (
    <div className="space-y-6">
      <ReportPageHeader
        title="Trial Balance"
        description="Review debit and credit balances by account as of the selected date."
        eyebrow={currentOrganization?.name || "Reporting"}
        reports={metadataReports}
        activeHref="/reports/trial-balance"
        generatedAt={metadataQuery.data?.generatedAt}
        actions={<ReportExportActions canExport={can("reports.export")} isExporting={exportMutation.isPending} onExport={handleExport} />}
      />

      <ReportFilterBar>
        <ReportDateRangePicker asOf fromDate={parsedFilters.data.as_of_date} onFromDateChange={(value: string) => updateFilters({ as_of_date: value })} />
        <ReportPeriodSelector periods={periodsQuery.data ?? []} value={parsedFilters.data.period_id ?? ""} onValueChange={(value) => updateFilters({ period_id: value })} />
        <Select value={parsedFilters.data.account_type || "all"} onValueChange={(value) => updateFilters({ account_type: value === "all" ? "" : value })}>
          <SelectTrigger className="min-w-[180px]"><SelectValue placeholder="Account type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All account types</SelectItem>
            {report.availableAccountTypes.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={parsedFilters.data.search} onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Search account code or name" className="min-w-[220px]" />
        <label className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
          <input type="checkbox" checked={parsedFilters.data.include_zero_balances} onChange={(event) => updateFilters({ include_zero_balances: event.target.checked })} />
          Include zero balances
        </label>
      </ReportFilterBar>

      {report.rows.length === 0 ? <ReportEmptyState title="No trial balance rows" description="The backend returned no accounts for the selected parameters." /> : <TrialBalanceTable report={report} />}
    </div>
  );
}
