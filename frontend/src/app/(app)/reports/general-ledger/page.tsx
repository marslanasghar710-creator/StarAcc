"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { useAccounts } from "@/features/accounts/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { GeneralLedgerFilters } from "@/features/reporting/components/general-ledger-filters";
import { GeneralLedgerTable } from "@/features/reporting/components/general-ledger-table";
import { ReportEmptyState } from "@/features/reporting/components/report-empty-state";
import { ReportErrorState } from "@/features/reporting/components/report-error-state";
import { ReportExportActions } from "@/features/reporting/components/report-export-actions";
import { ReportFilterBar } from "@/features/reporting/components/report-filter-bar";
import { ReportLoadingSkeleton } from "@/features/reporting/components/report-loading-skeleton";
import { ReportPageHeader } from "@/features/reporting/components/report-page-header";
import { useExportGeneralLedger, useGeneralLedger, useReportsMetadata } from "@/features/reporting/hooks";
import { generalLedgerFilterSchema } from "@/features/reporting/schemas";
import { withUpdatedQuery } from "@/features/reporting/url-state";
import { useOrganization } from "@/providers/organization-provider";

const REPORT_PERMISSIONS = ["reports.read", "reporting.read", "general_ledger.read", "reports.general_ledger.read", "ledger.read"];

export default function GeneralLedgerPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission, can } = usePermissions();
  const canRead = hasAnyPermission(REPORT_PERMISSIONS);
  const metadataQuery = useReportsMetadata(currentOrganizationId ?? undefined, canRead);
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", canRead);
  const rawFilters = {
    account_id: searchParams.get("account_id") ?? "",
    from_date: searchParams.get("from_date") ?? "",
    to_date: searchParams.get("to_date") ?? "",
    journal_reference: searchParams.get("journal_reference") ?? "",
    source_module: searchParams.get("source_module") ?? "",
    status: searchParams.get("status") ?? "",
    cursor: searchParams.get("cursor") ?? "",
  };
  const parsedFilters = rawFilters.account_id ? generalLedgerFilterSchema.safeParse(rawFilters) : null;
  const reportQuery = useGeneralLedger(
    currentOrganizationId ?? undefined,
    parsedFilters?.success ? parsedFilters.data : { account_id: "00000000-0000-0000-0000-000000000000", from_date: "", to_date: "", journal_reference: "", source_module: "", status: "", cursor: "" },
    canRead && Boolean(parsedFilters?.success),
  );
  const exportMutation = useExportGeneralLedger(currentOrganizationId ?? undefined);

  function updateFilters(values: Record<string, string | boolean | null | undefined>) {
    const next = withUpdatedQuery(searchParams, values);
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  async function handleExport(format: "csv" | "pdf") {
    if (!parsedFilters?.success || !currentOrganizationId) return;
    try {
      const result = await exportMutation.mutateAsync({ filters: parsedFilters.data, format });
      toast.success(`Started ${result.format.toUpperCase()} export: ${result.filename}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export general ledger.");
    }
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading general ledger" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening general ledger." />;
  if (!canRead) return <AccessDeniedState description="You need general ledger permissions to view this report." />;
  if (metadataQuery.isLoading || accountsQuery.isLoading) return <LoadingScreen label="Loading general ledger" />;
  if (metadataQuery.isError || accountsQuery.isError) return <ReportErrorState title="General ledger filters unavailable" description="We couldn't load reporting metadata or account options." onRetry={() => { void metadataQuery.refetch(); void accountsQuery.refetch(); }} />;
  if (rawFilters.account_id && parsedFilters && !parsedFilters.success) return <ReportErrorState title="Invalid general ledger filters" description="Adjust the query parameters and reload the report." onRetry={() => router.replace(pathname)} />;

  const metadataReports = (metadataQuery.data?.reports ?? []).map((item) => ({ ...item, isPermitted: hasAnyPermission(item.requiredPermissions) }));
  const report = parsedFilters?.success ? reportQuery.data : null;
  const sourceOptions = report?.sourceOptions ?? [];

  return (
    <div className="space-y-6">
      <ReportPageHeader
        title="General Ledger"
        description="Trace detailed ledger activity for a selected account without making the frontend authoritative."
        eyebrow={currentOrganization?.name || "Reporting"}
        reports={metadataReports}
        activeHref="/reports/general-ledger"
        generatedAt={metadataQuery.data?.generatedAt}
        actions={<ReportExportActions canExport={can("reports.export") && Boolean(parsedFilters?.success)} isExporting={exportMutation.isPending} onExport={handleExport} />}
      />

      <ReportFilterBar>
        <GeneralLedgerFilters
          accounts={accountsQuery.data ?? []}
          sourceOptions={sourceOptions}
          accountId={rawFilters.account_id}
          fromDate={rawFilters.from_date}
          toDate={rawFilters.to_date}
          journalReference={rawFilters.journal_reference}
          sourceModule={rawFilters.source_module}
          status={rawFilters.status}
          onAccountIdChange={(value) => updateFilters({ account_id: value, cursor: null })}
          onFromDateChange={(value) => updateFilters({ from_date: value, cursor: null })}
          onToDateChange={(value) => updateFilters({ to_date: value, cursor: null })}
          onJournalReferenceChange={(value) => updateFilters({ journal_reference: value, cursor: null })}
          onSourceModuleChange={(value) => updateFilters({ source_module: value, cursor: null })}
          onStatusChange={(value) => updateFilters({ status: value, cursor: null })}
          onApply={() => updateFilters({ cursor: null })}
        />
      </ReportFilterBar>

      {!rawFilters.account_id ? (
        <ReportEmptyState title="Select an account" description="Choose an account before requesting general ledger detail from the backend." />
      ) : reportQuery.isLoading ? (
        <ReportLoadingSkeleton />
      ) : reportQuery.isError || !report ? (
        <ReportErrorState title="General ledger unavailable" description="We couldn't load general ledger detail from the backend." onRetry={() => void reportQuery.refetch()} />
      ) : report.lines.length === 0 ? (
        <ReportEmptyState title="No ledger rows" description="The backend returned no ledger movements for the selected account and date range." />
      ) : (
        <>
          <GeneralLedgerTable report={report} />
          {report.pagination.hasMore && report.pagination.nextCursor ? (
            <div className="flex justify-end">
              <button type="button" className="rounded-lg border border-border/70 px-4 py-2 text-sm font-medium" onClick={() => updateFilters({ cursor: report.pagination.nextCursor })}>
                Load next page
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
