"use client";

import Link from "next/link";
import * as React from "react";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/permissions/hooks";
import { CustomReportListTable } from "@/features/reporting-builder/components/custom-report-list-table";
import { ReportBuilderErrorState } from "@/features/reporting-builder/components/report-builder-error-state";
import { useCustomReports, useRunCustomReport, useDeleteCustomReport } from "@/features/reporting-builder/hooks";
import { ReportPageHeader } from "@/features/reporting/components/report-page-header";
import { ReportsNav } from "@/features/reporting/components/reports-nav";
import { useReportsMetadata } from "@/features/reporting/hooks";
import { useOrganization } from "@/providers/organization-provider";

const CUSTOM_REPORT_PERMISSIONS = ["reports.custom.read"];

export default function CustomReportsPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission, can } = usePermissions();
  const metadataQuery = useReportsMetadata(currentOrganizationId ?? undefined, hasAnyPermission(["reports.custom.read", "reports.profit_loss.read", "reports.balance_sheet.read", "reports.trial_balance.read", "reports.general_ledger.read"]));
  const reportsQuery = useCustomReports(currentOrganizationId ?? undefined, Boolean(currentOrganizationId) && hasAnyPermission(CUSTOM_REPORT_PERMISSIONS));
  const runMutation = useRunCustomReport(currentOrganizationId ?? undefined);
  const deleteMutation = useDeleteCustomReport(currentOrganizationId ?? undefined);

  if (isLoadingOrganizations) return <LoadingScreen label="Loading custom reports" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Select an organization to load saved custom reports." />;
  if (!hasAnyPermission(CUSTOM_REPORT_PERMISSIONS)) return <AccessDeniedState description="You need custom reporting permissions to open the report builder." />;
  if (reportsQuery.isLoading) return <LoadingScreen label="Loading custom reports" />;
  if (reportsQuery.isError) return <ReportBuilderErrorState title="Custom reports unavailable" description="We couldn't load saved report definitions for this organization." onRetry={() => void reportsQuery.refetch()} />;

  const reports = reportsQuery.data ?? [];
  const navReports = (metadataQuery.data?.reports ?? []).map((report) => ({ ...report, isPermitted: true }));

  return (
    <div className="space-y-6">
      <ReportPageHeader title="Custom reports" description="Saved definitions, reusable previews, and export-ready outputs for dense accounting workflows." eyebrow={currentOrganization?.name || "Reporting"} reports={navReports} activeHref="/reports/custom" generatedAt={metadataQuery.data?.generatedAt} />
      <div className="flex justify-end"><Button asChild><Link href="/reports/custom/new">New custom report</Link></Button></div>
      {reports.length ? (
        <CustomReportListTable reports={reports} onRun={(reportId) => void runMutation.mutateAsync(reportId)} onDelete={(reportId) => void deleteMutation.mutateAsync(reportId)} canDelete={can("reports.custom.delete")} />
      ) : (
        <EmptyState title="No saved custom reports" description="Create a report definition to reuse filters, groupings, and exports across your organization." action={<Button asChild><Link href="/reports/custom/new">Create custom report</Link></Button>} />
      )}
    </div>
  );
}
