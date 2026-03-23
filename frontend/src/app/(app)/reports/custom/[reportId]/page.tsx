"use client";

import { useParams } from "next/navigation";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { usePermissions } from "@/features/permissions/hooks";
import { CustomReportBuilderShell } from "@/features/reporting-builder/components/custom-report-builder-shell";
import { ReportBuilderErrorState } from "@/features/reporting-builder/components/report-builder-error-state";
import { useCustomReport, useCustomReportDatasets } from "@/features/reporting-builder/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function CustomReportDetailPage() {
  const params = useParams<{ reportId: string }>();
  const reportId = typeof params?.reportId === "string" ? params.reportId : "";
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const reportQuery = useCustomReport(currentOrganizationId ?? undefined, reportId, Boolean(currentOrganizationId) && Boolean(reportId) && can("reports.custom.read"));
  const datasetsQuery = useCustomReportDatasets(currentOrganizationId ?? undefined, Boolean(currentOrganizationId) && can("reports.custom.read"));

  if (isLoadingOrganizations) return <LoadingScreen label="Loading custom report" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening a saved custom report." />;
  if (!can("reports.custom.read")) return <AccessDeniedState description="You need custom reporting access to open this report." />;
  if (!reportId) return <EmptyState title="Report not found" description="This report identifier is missing from the route." />;
  if (reportQuery.isLoading || datasetsQuery.isLoading) return <LoadingScreen label="Loading custom report" />;
  if (reportQuery.isError || datasetsQuery.isError) return <ReportBuilderErrorState title="Custom report unavailable" description="We couldn't load the report definition or dataset metadata." onRetry={() => { void reportQuery.refetch(); void datasetsQuery.refetch(); }} />;
  if (!reportQuery.data) return <EmptyState title="Report not found" description="This saved report was not found or you no longer have access to it." />;

  return <CustomReportBuilderShell organizationId={currentOrganizationId} datasets={datasetsQuery.data ?? []} report={reportQuery.data} />;
}
