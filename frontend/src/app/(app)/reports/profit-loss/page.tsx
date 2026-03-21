"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { usePeriods } from "@/features/periods/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { ProfitLossStatement } from "@/features/reporting/components/profit-loss-statement";
import { ReportDateRangePicker } from "@/features/reporting/components/report-date-range-picker";
import { ReportEmptyState } from "@/features/reporting/components/report-empty-state";
import { ReportErrorState } from "@/features/reporting/components/report-error-state";
import { ReportExportActions } from "@/features/reporting/components/report-export-actions";
import { ReportFilterBar } from "@/features/reporting/components/report-filter-bar";
import { ReportLoadingSkeleton } from "@/features/reporting/components/report-loading-skeleton";
import { ReportPageHeader } from "@/features/reporting/components/report-page-header";
import { ReportPeriodSelector } from "@/features/reporting/components/report-period-selector";
import { StatementComparisonToggle } from "@/features/reporting/components/statement-comparison-toggle";
import { useExportProfitLoss, useProfitLoss, useReportsMetadata } from "@/features/reporting/hooks";
import { profitLossFilterSchema } from "@/features/reporting/schemas";
import { startOfMonthIso, todayIso, withUpdatedQuery } from "@/features/reporting/url-state";
import { useOrganization } from "@/providers/organization-provider";

const REPORT_PERMISSIONS = ["reports.read", "reporting.read", "profit_and_loss.read", "reports.profit_loss.read"];

export default function ProfitLossPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission, can } = usePermissions();
  const canRead = hasAnyPermission(REPORT_PERMISSIONS);
  const metadataQuery = useReportsMetadata(currentOrganizationId ?? undefined, canRead);
  const periodsQuery = usePeriods(currentOrganizationId ?? undefined, canRead);
  const parsedFilters = profitLossFilterSchema.safeParse({
    from_date: searchParams.get("from_date") ?? startOfMonthIso(),
    to_date: searchParams.get("to_date") ?? todayIso(),
    period_id: searchParams.get("period_id") ?? "",
    comparison_mode: searchParams.get("comparison_mode") ?? "none",
    basis: searchParams.get("basis") === "cash" ? "cash" : "accrual",
  });
  const reportQuery = useProfitLoss(currentOrganizationId ?? undefined, parsedFilters.success ? parsedFilters.data : { from_date: startOfMonthIso(), to_date: todayIso(), period_id: "", comparison_mode: "none", basis: "accrual" }, canRead && parsedFilters.success);
  const exportMutation = useExportProfitLoss(currentOrganizationId ?? undefined);

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
      toast.error(error instanceof Error ? error.message : "Unable to export profit and loss.");
    }
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading profit and loss" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening profit and loss." />;
  if (!canRead) return <AccessDeniedState description="You need profit and loss permissions to view this report." />;
  if (!parsedFilters.success) return <ReportErrorState title="Invalid profit and loss filters" description="Adjust the query parameters and reload the statement." onRetry={() => router.replace(pathname)} />;
  if (metadataQuery.isLoading || periodsQuery.isLoading) return <LoadingScreen label="Loading profit and loss" />;
  if (metadataQuery.isError || periodsQuery.isError) return <ReportErrorState title="Profit and loss filters unavailable" description="We couldn't load reporting metadata or fiscal periods." onRetry={() => { void metadataQuery.refetch(); void periodsQuery.refetch(); }} />;
  if (reportQuery.isLoading) return <ReportLoadingSkeleton />;
  if (reportQuery.isError || !reportQuery.data) return <ReportErrorState title="Profit and loss unavailable" description="We couldn't load profit and loss data from the backend." onRetry={() => void reportQuery.refetch()} />;

  const report = reportQuery.data;
  const metadataReports = (metadataQuery.data?.reports ?? []).map((item) => ({ ...item, isPermitted: hasAnyPermission(item.requiredPermissions) }));
  const comparisonOptions = (metadataQuery.data?.supportedComparisonModes ?? ["none", "previous_period", "prior_year"]) as Array<"none" | "previous_period" | "prior_year">;
  const basisOptions = metadataQuery.data?.supportedBases ?? ["accrual", "cash"];

  return (
    <div className="space-y-6">
      <ReportPageHeader
        title="Profit & Loss"
        description="Review revenue, gross profit, operating expenses, and net profit for the selected period."
        eyebrow={currentOrganization?.name || "Reporting"}
        reports={metadataReports}
        activeHref="/reports/profit-loss"
        generatedAt={metadataQuery.data?.generatedAt}
        actions={<ReportExportActions canExport={can("reports.export")} isExporting={exportMutation.isPending} onExport={handleExport} />}
      />

      <ReportFilterBar>
        <ReportDateRangePicker fromDate={parsedFilters.data.from_date} toDate={parsedFilters.data.to_date} onFromDateChange={(value) => updateFilters({ from_date: value })} onToDateChange={(value) => updateFilters({ to_date: value })} />
        <ReportPeriodSelector periods={periodsQuery.data ?? []} value={parsedFilters.data.period_id ?? ""} onValueChange={(value) => updateFilters({ period_id: value })} />
        <StatementComparisonToggle value={parsedFilters.data.comparison_mode} options={comparisonOptions} onChange={(value) => updateFilters({ comparison_mode: value })} />
        {basisOptions.length > 1 ? (
          <div className="flex overflow-hidden rounded-lg border border-border/70">
            {basisOptions.map((basis) => (
              <button key={basis} type="button" className={`px-3 py-2 text-sm ${parsedFilters.data.basis === basis ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`} onClick={() => updateFilters({ basis })}>
                {basis === "cash" ? "Cash basis" : "Accrual basis"}
              </button>
            ))}
          </div>
        ) : null}
      </ReportFilterBar>

      {report.sections.length === 0 ? <ReportEmptyState title="No statement rows" description="The backend returned no profit and loss lines for the selected period." /> : <ProfitLossStatement report={report} />}
    </div>
  );
}
