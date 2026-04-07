"use client";

import * as React from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { FirstRunEntry } from "@/features/onboarding/components/first-run-entry";
import { OnboardingHub } from "@/features/onboarding/components/onboarding-hub";
import { useOnboardingStatus } from "@/features/onboarding/hooks";
import { trackEvent } from "@/features/funnel/analytics";
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
    void trackEvent("activation.flow.entered", { entry_context: "resume_setup", checklist_version: "v1" }, { page_type: "activation", surface: "activation", funnel_domain: "activation", funnel_stage: "activation_started", org_id: currentOrganizationId, is_authenticated: true, dedupe_key: `setup_entered:${currentOrganizationId}` });
    void trackEvent("activation.checklist.viewed", { checklist_version: "v1", completion_percent: status.progress_percent }, { page_type: "activation", surface: "activation", funnel_domain: "activation", funnel_stage: "activation_started", org_id: currentOrganizationId, is_authenticated: true, dedupe_key: `checklist_viewed:${currentOrganizationId}` });
  }, [currentOrganizationId]);

  React.useEffect(() => {
    if (status.progress_percent >= 100) {
      void trackEvent("activation.completed", { org_id: currentOrganizationId, checklist_version: "v1", completed_item_ids: status.tasks.filter((task) => task.status === "completed").map((task) => task.key) }, { page_type: "activation", surface: "activation", funnel_domain: "activation", funnel_stage: "activated", org_id: currentOrganizationId, is_authenticated: true, dedupe_key: `activation_completed:${currentOrganizationId}` });
    }
  }, [currentOrganizationId, status.progress_percent]);

  React.useEffect(() => {
    if (status.readiness["first_transaction_exists"]) {
      void trackEvent("app.handoff.completed", { destination_route: "/dashboard", activation_state: status.progress_percent >= 100 ? "completed" : "in_progress" }, { page_type: "app", surface: "authenticated_app", funnel_domain: "activation", funnel_stage: "handoff_to_app", org_id: currentOrganizationId, is_authenticated: true, dedupe_key: `handoff:${currentOrganizationId}` });
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
