"use client";

import { useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBillingState, useChangePlan, usePublicPlans, useUpdateCancelPolicy } from "@/features/billing/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function BillingSettingsPage() {
  const { currentOrganizationId } = useOrganization();
  const billingQuery = useBillingState(currentOrganizationId ?? undefined);
  const plansQuery = usePublicPlans();
  const changePlanMutation = useChangePlan(currentOrganizationId ?? undefined);
  const cancelPolicyMutation = useUpdateCancelPolicy(currentOrganizationId ?? undefined);
  const [selectedPlan, setSelectedPlan] = useState("growth");
  const [seatCount, setSeatCount] = useState("5");

  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization to manage billing." />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Commercial ops" title="Billing & entitlements" description="Manage subscription state, plan access, seats, and upgrade/cancel flows." />
      <Card>
        <CardHeader><CardTitle>Current subscription</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Plan: <strong>{billingQuery.data?.subscription.plan_code ?? "—"}</strong></p>
          <p>Status: <strong>{billingQuery.data?.subscription.status ?? "—"}</strong></p>
          <p>Interval: <strong>{billingQuery.data?.subscription.billing_interval ?? "—"}</strong></p>
          <p>Seats used / allowed: <strong>{billingQuery.data?.usage?.seats?.used ?? 0} / {billingQuery.data?.limits?.seats ?? 0}</strong></p>
          <p>Payroll employees used / allowed: <strong>{billingQuery.data?.usage?.payroll_employees?.used ?? 0} / {billingQuery.data?.limits?.payroll_employees ?? 0}</strong></p>
          <p>Cancel at period end: <strong>{billingQuery.data?.subscription.cancel_at_period_end ? "Yes" : "No"}</strong></p>
          <div className="pt-2"><Button variant="outline" onClick={() => cancelPolicyMutation.mutate(!(billingQuery.data?.subscription.cancel_at_period_end ?? false))}>Toggle cancel at period end</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change plan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Self-serve plans are listed below. Enterprise plans route to sales-assisted flow.</p>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value)}>
            {(plansQuery.data ?? []).map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
          </select>
          <Input value={seatCount} onChange={(event) => setSeatCount(event.target.value)} inputMode="numeric" placeholder="Seats" />
          <Button onClick={() => changePlanMutation.mutate({ plan_code: selectedPlan, billing_interval: "monthly", seats: Number(seatCount) || undefined })} disabled={changePlanMutation.isPending}>Apply plan</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Entitlement highlights</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(billingQuery.data?.features ?? {}).map(([key, value]) => <div key={key} className="rounded-md border border-border/60 p-3 text-sm"><p className="font-medium capitalize">{key.replaceAll("_", " ")}</p><p className="text-muted-foreground">{value ? "Enabled" : "Locked"}</p></div>)}
        </CardContent>
      </Card>
    </div>
  );
}
