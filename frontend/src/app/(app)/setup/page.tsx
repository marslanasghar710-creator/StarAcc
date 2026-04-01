"use client";

import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { FirstRunEntry } from "@/features/onboarding/components/first-run-entry";
import { OnboardingHub } from "@/features/onboarding/components/onboarding-hub";
import { useOnboardingStatus } from "@/features/onboarding/hooks";
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
