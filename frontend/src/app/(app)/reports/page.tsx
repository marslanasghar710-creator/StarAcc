"use client";

import * as React from "react";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { DateDisplay } from "@/components/shared/date-display";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { usePermissions } from "@/features/permissions/hooks";
import { ReportPageHeader } from "@/features/reporting/components/report-page-header";
import { ReportsNav } from "@/features/reporting/components/reports-nav";
import { useReportsMetadata } from "@/features/reporting/hooks";
import { useOrganization } from "@/providers/organization-provider";

const REPORT_ACCESS_PERMISSIONS = [
  "reports.read",
  "reporting.read",
  "reports.profit_loss.read",
  "reports.balance_sheet.read",
  "reports.trial_balance.read",
  "reports.general_ledger.read",
  "trial_balance.read",
  "general_ledger.read",
];

export default function ReportsLandingPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission, can } = usePermissions();
  const canReadReports = hasAnyPermission(REPORT_ACCESS_PERMISSIONS);
  const metadataQuery = useReportsMetadata(currentOrganizationId ?? undefined, canReadReports);

  if (isLoadingOrganizations) return <LoadingScreen label="Loading reports" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening reports." />;
  if (!canReadReports) return <AccessDeniedState description="You need reporting permissions to view financial reports." />;
  if (metadataQuery.isLoading) return <LoadingScreen label="Loading reports" />;
  if (metadataQuery.isError) return <ErrorState title="Reports unavailable" description="We couldn't load report metadata for this organization." onRetry={() => void metadataQuery.refetch()} />;

  const metadata = metadataQuery.data;
  const reports = (metadata?.reports ?? []).map((report) => ({
    ...report,
    isPermitted: hasAnyPermission(report.requiredPermissions),
  }));

  if (reports.length === 0) {
    return <EmptyState title="No reports available" description="This organization does not currently expose report metadata." />;
  }

  return (
    <div className="space-y-6">
      <ReportPageHeader
        title="Reports"
        description="Launch backend-generated financial statements and dense accounting reports for the active organization."
        eyebrow={currentOrganization?.name || "Reporting"}
        reports={reports}
        activeHref="/reports"
        generatedAt={metadata?.generatedAt}
      />

      <PageActionBar
        left={<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><span>Current period:</span><span className="font-medium text-foreground">{metadata?.currentPeriodLabel || "Not provided by backend"}</span></div>}
        right={<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><span>Exports:</span><span className="font-medium text-foreground">{can("reports.export") ? "Available where backend supports them" : "Restricted for this role"}</span>{metadata?.generatedAt ? <span>Metadata refreshed <DateDisplay value={metadata.generatedAt} includeTime /></span> : null}</div>}
      />

      <ReportsNav reports={reports} />
    </div>
  );
}
