"use client";

import * as React from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { FirstRunEntry } from "@/features/onboarding/components/first-run-entry";
import { OnboardingHub } from "@/features/onboarding/components/onboarding-hub";
import { useOnboardingStatus } from "@/features/onboarding/hooks";
import { trackFunnelEvent } from "@/features/funnel/analytics";
import { useOrganization } from "@/providers/organization-provider";

export default function SetupCenterPage() {
  const { currentOrganizationId, currentOrganization } = useOrganization();
  const statusQuery = useOnboardingStatus(currentOrganizationId ?? undefined, Boolean(currentOrganizationId));

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization to open Setup Center." />;
  }

  if (statusQuery.isLoading || !statusQuery.data) {
    return <LoadingScreen label="Loading setup center" />;
  }

  const status = statusQuery.data;

  React.useEffect(() => {
    void trackFunnelEvent("activation_entered", { organization_id: currentOrganizationId });
  }, [currentOrganizationId]);

  React.useEffect(() => {
    if (status.progress_percent >= 100) {
      void trackFunnelEvent("activation_completed", { organization_id: currentOrganizationId });
    }
  }, [currentOrganizationId, status.progress_percent]);

  React.useEffect(() => {
    if (status.readiness["first_transaction_exists"]) {
      void trackFunnelEvent("first_business_action_completed", { organization_id: currentOrganizationId, action: "first_transaction" });
    }
  }, [currentOrganizationId, status.readiness]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Onboarding"}
        title="Setup Center"
        description="Backend-authoritative onboarding progress, readiness, and next-best actions."
      />
      {!status.path ? <FirstRunEntry organizationId={currentOrganizationId} onContinue={() => void statusQuery.refetch()} /> : null}
      <OnboardingHub organizationId={currentOrganizationId} status={status} />
    </div>
  );
}
