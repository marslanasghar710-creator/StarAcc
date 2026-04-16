"use client";

import * as React from "react";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FirstRunEntry } from "@/features/onboarding/components/first-run-entry";
import { OnboardingHub } from "@/features/onboarding/components/onboarding-hub";
import { useOnboardingStatus } from "@/features/onboarding/hooks";
import { useActivationSnapshot } from "@/features/activation/hooks";
import { trackEvent } from "@/features/funnel/analytics";
import { useOrganization } from "@/providers/organization-provider";

export default function SetupCenterPage() {
  const { currentOrganizationId, currentOrganization } = useOrganization();
  const hasScopedOrganization = Boolean(currentOrganizationId && currentOrganization);
  const statusQuery = useOnboardingStatus(currentOrganizationId ?? undefined, hasScopedOrganization);
  const activationQuery = useActivationSnapshot(currentOrganizationId ?? undefined, hasScopedOrganization);

  if (!hasScopedOrganization || !currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization to open Setup Center." />;
  }

  if (statusQuery.isLoading || !statusQuery.data || activationQuery.isLoading || !activationQuery.data) {
    return <LoadingScreen label="Loading setup center" />;
  }

  const status = statusQuery.data;
  const activation = activationQuery.data.snapshot;

  React.useEffect(() => {
    void trackEvent("activation.flow.entered", { entry_context: "resume_setup", checklist_version: activation.checklist_version }, { page_type: "activation", surface: "activation", funnel_domain: "activation", funnel_stage: "activation_started", org_id: currentOrganizationId, is_authenticated: true, dedupe_key: `setup_entered:${currentOrganizationId}` });
    void trackEvent("activation.checklist.viewed", { checklist_version: activation.checklist_version, completion_percent: activation.completion_percent }, { page_type: "activation", surface: "activation", funnel_domain: "activation", funnel_stage: "activation_started", org_id: currentOrganizationId, is_authenticated: true, dedupe_key: `checklist_viewed:${currentOrganizationId}` });
  }, [currentOrganizationId, activation.checklist_version, activation.completion_percent]);

  React.useEffect(() => {
    if (activation.status === "completed") {
      void trackEvent("activation.completed", { org_id: currentOrganizationId, checklist_version: activation.checklist_version, completed_item_ids: activation.items.filter((item) => item.status === "complete").map((item) => item.item_id) }, { page_type: "activation", surface: "activation", funnel_domain: "activation", funnel_stage: "activated", org_id: currentOrganizationId, is_authenticated: true, dedupe_key: `activation_completed:${currentOrganizationId}` });
    }
  }, [currentOrganizationId, activation.status, activation.checklist_version, activation.items]);

  React.useEffect(() => {
    if (activation.milestones.first_transaction_workflow_started) {
      void trackEvent("app.handoff.completed", { destination_route: "/dashboard", activation_state: activation.status === "completed" ? "completed" : "in_progress" }, { page_type: "app", surface: "authenticated_app", funnel_domain: "activation", funnel_stage: "handoff_to_app", org_id: currentOrganizationId, is_authenticated: true, dedupe_key: `handoff:${currentOrganizationId}` });
    }
  }, [currentOrganizationId, activation.milestones.first_transaction_workflow_started, activation.status]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Onboarding"}
        title="Setup Center"
        description="Backend-authoritative onboarding progress, readiness, and next-best actions."
      />
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Activation status: {activation.status === "completed" ? "Completed" : "In progress"}</CardTitle>
          <CardDescription>{activation.completion_percent}% complete • {activation.completed_item_count}/{activation.total_visible_item_count} checklist items complete.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard" onClick={() => {
              void trackEvent("app.handoff.completed", { destination_route: "/dashboard", activation_state: activation.status }, { page_type: "app", surface: "authenticated_app", funnel_domain: "activation", funnel_stage: "handoff_to_app", org_id: currentOrganizationId, is_authenticated: true, dedupe_key: `handoff_click:${currentOrganizationId}` });
            }}>
              Go to dashboard
            </Link>
          </Button>
          {activation.status !== "completed" ? <p className="text-xs text-muted-foreground self-center">You can keep working in setup while using the app; activation completes automatically from real workflow activity.</p> : null}
        </CardContent>
      </Card>
      {!status.path ? <FirstRunEntry organizationId={currentOrganizationId} onContinue={() => void statusQuery.refetch()} /> : null}
      <OnboardingHub organizationId={currentOrganizationId} status={status} />
    </div>
  );
}
