"use client";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { usePermissions } from "@/features/permissions/hooks";
import { CustomReportBuilderShell } from "@/features/reporting-builder/components/custom-report-builder-shell";
import { ReportBuilderErrorState } from "@/features/reporting-builder/components/report-builder-error-state";
import { useCustomReportDatasets } from "@/features/reporting-builder/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function NewCustomReportPage() {
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const datasetsQuery = useCustomReportDatasets(currentOrganizationId ?? undefined, Boolean(currentOrganizationId) && can("reports.custom.read"));

  if (isLoadingOrganizations) return <LoadingScreen label="Loading report builder" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before building a custom report." />;
  if (!can("reports.custom.read")) return <AccessDeniedState description="You need custom reporting access to use the builder." />;
  if (datasetsQuery.isLoading) return <LoadingScreen label="Loading report builder" />;
  if (datasetsQuery.isError) return <ReportBuilderErrorState title="Datasets unavailable" description="We couldn't load reporting datasets for this organization." onRetry={() => void datasetsQuery.refetch()} />;

  return <CustomReportBuilderShell organizationId={currentOrganizationId} datasets={datasetsQuery.data ?? []} />;
}
