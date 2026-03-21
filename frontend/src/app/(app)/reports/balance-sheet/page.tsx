"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { usePeriods } from "@/features/periods/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { BalanceSheetStatement } from "@/features/reporting/components/balance-sheet-statement";
import { ReportDateRangePicker } from "@/features/reporting/components/report-date-range-picker";
import { ReportEmptyState } from "@/features/reporting/components/report-empty-state";
import { ReportErrorState } from "@/features/reporting/components/report-error-state";
import { ReportExportActions } from "@/features/reporting/components/report-export-actions";
import { ReportFilterBar } from "@/features/reporting/components/report-filter-bar";
import { ReportLoadingSkeleton } from "@/features/reporting/components/report-loading-skeleton";
import { ReportPageHeader } from "@/features/reporting/components/report-page-header";
import { ReportPeriodSelector } from "@/features/reporting/components/report-period-selector";
import { StatementComparisonToggle } from "@/features/reporting/components/statement-comparison-toggle";
import { useBalanceSheet, useExportBalanceSheet, useReportsMetadata } from "@/features/reporting/hooks";
import { balanceSheetFilterSchema } from "@/features/reporting/schemas";
import { todayIso, withUpdatedQuery } from "@/features/reporting/url-state";
import { useOrganization } from "@/providers/organization-provider";

const REPORT_PERMISSIONS = ["reports.read", "reporting.read", "balance_sheet.read", "reports.balance_sheet.read"];

export default function BalanceSheetPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission, can } = usePermissions();
  const canRead = hasAnyPermission(REPORT_PERMISSIONS);
  const metadataQuery = useReportsMetadata(currentOrganizationId ?? undefined, canRead);
  const periodsQuery = usePeriods(currentOrganizationId ?? undefined, canRead);
  const parsedFilters = balanceSheetFilterSchema.safeParse({
    as_of_date: searchParams.get("as_of_date") ?? todayIso(),
    period_id: searchParams.get("period_id") ?? "",
    comparison_mode: searchParams.get("comparison_mode") ?? "none",
  });
  const reportQuery = useBalanceSheet(currentOrganizationId ?? undefined, parsedFilters.success ? parsedFilters.data : { as_of_date: todayIso(), period_id: "", comparison_mode: "none" }, canRead && parsedFilters.success);
  const exportMutation = useExportBalanceSheet(currentOrganizationId ?? undefined);

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
      toast.error(error instanceof Error ? error.message : "Unable to export balance sheet.");
    }
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading balance sheet" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening balance sheet." />;
  if (!canRead) return <AccessDeniedState description="You need balance sheet permissions to view this report." />;
  if (!parsedFilters.success) return <ReportErrorState title="Invalid balance sheet filters" description="Adjust the query parameters and reload the statement." onRetry={() => router.replace(pathname)} />;
  if (metadataQuery.isLoading || periodsQuery.isLoading) return <LoadingScreen label="Loading balance sheet" />;
  if (metadataQuery.isError || periodsQuery.isError) return <ReportErrorState title="Balance sheet filters unavailable" description="We couldn't load reporting metadata or fiscal periods." onRetry={() => { void metadataQuery.refetch(); void periodsQuery.refetch(); }} />;
  if (reportQuery.isLoading) return <ReportLoadingSkeleton />;
  if (reportQuery.isError || !reportQuery.data) return <ReportErrorState title="Balance sheet unavailable" description="We couldn't load balance sheet data from the backend." onRetry={() => void reportQuery.refetch()} />;

  const report = reportQuery.data;
  const metadataReports = (metadataQuery.data?.reports ?? []).map((item) => ({ ...item, isPermitted: hasAnyPermission(item.requiredPermissions) }));
  const comparisonOptions = (metadataQuery.data?.supportedComparisonModes ?? ["none", "previous_period", "prior_year"]) as Array<"none" | "previous_period" | "prior_year">;

  return (
    <div className="space-y-6">
      <ReportPageHeader
        title="Balance Sheet"
        description="Inspect assets, liabilities, and equity at the selected reporting date."
        eyebrow={currentOrganization?.name || "Reporting"}
        reports={metadataReports}
        activeHref="/reports/balance-sheet"
        generatedAt={metadataQuery.data?.generatedAt}
        actions={<ReportExportActions canExport={can("reports.export")} isExporting={exportMutation.isPending} onExport={handleExport} />}
      />

      <ReportFilterBar>
        <ReportDateRangePicker asOf fromDate={parsedFilters.data.as_of_date} onFromDateChange={(value) => updateFilters({ as_of_date: value })} />
        <ReportPeriodSelector periods={periodsQuery.data ?? []} value={parsedFilters.data.period_id ?? ""} onValueChange={(value) => updateFilters({ period_id: value })} placeholder="Fiscal period end" />
        <StatementComparisonToggle value={parsedFilters.data.comparison_mode} options={comparisonOptions} onChange={(value) => updateFilters({ comparison_mode: value })} />
      </ReportFilterBar>

      {report.sections.length === 0 ? <ReportEmptyState title="No balance sheet rows" description="The backend returned no balance sheet lines for the selected date." /> : <BalanceSheetStatement report={report} />}
    </div>
  );
}
