"use client";

import * as React from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trackEvent } from "@/features/funnel/analytics";
import { useBillingState, useChangePlan, usePublicPlans } from "@/features/billing/hooks";
import { useOrganization } from "@/providers/organization-provider";

const PLAN_ORDER = ["starter", "growth", "pro"];
const LIMIT_ROWS: Array<{ key: string; label: string }> = [
  { key: "max_invoices_per_month", label: "Invoices / month" },
  { key: "max_bills_per_month", label: "Bills / month" },
  { key: "max_users", label: "Users" },
  { key: "max_entities", label: "Entities" },
  { key: "max_bank_accounts", label: "Bank accounts" },
  { key: "max_integrations", label: "Integrations" },
];

function formatLimit(value: number | string | undefined): string {
  if (value === "unlimited") return "Unlimited";
  if (typeof value === "number") return String(value);
  return "—";
}

export function PricingPlanGrid() {
  const [interval] = useState<"monthly" | "yearly">("monthly");
  const plansQuery = usePublicPlans();
  const { currentOrganizationId } = useOrganization();
  const billingState = useBillingState(currentOrganizationId ?? undefined);
  const changePlanMutation = useChangePlan(currentOrganizationId ?? undefined);

  const plans = useMemo(() => {
    const raw = plansQuery.data ?? [];
    return [...raw].sort((a, b) => PLAN_ORDER.indexOf(a.code) - PLAN_ORDER.indexOf(b.code));
  }, [plansQuery.data]);

  const currentPlanCode = billingState.data?.subscription.plan_code;

  return (
    <div className="space-y-8">
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const monthly = Number(plan.pricing?.monthly_price ?? 0);
          const isCurrent = currentPlanCode === plan.code;
          const currentIndex = PLAN_ORDER.indexOf(currentPlanCode ?? "starter");
          const targetIndex = PLAN_ORDER.indexOf(plan.code);
          const actionLabel = isCurrent ? "Current Plan" : targetIndex > currentIndex ? "Upgrade" : "Downgrade";

          return (
            <Card key={plan.code} className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.code.toUpperCase()} plan</CardDescription>
                <p className="text-3xl font-semibold">
                  ${monthly}
                  <span className="text-sm text-muted-foreground">/mo</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {Object.entries(plan.features)
                    .filter(([, enabled]) => Boolean(enabled))
                    .map(([feature]) => <li key={feature}>• {feature.replaceAll("_", " ")}</li>)}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? "secondary" : "default"}
                  disabled={isCurrent || !currentOrganizationId || changePlanMutation.isPending}
                  onClick={() => {
                    void trackEvent("pricing.plan.selected", { plan_id: plan.code, billing_interval: interval }, { page_type: "marketing", surface: "public_site", funnel_domain: "acquisition", funnel_stage: "engaged", org_id: currentOrganizationId ?? null, is_authenticated: Boolean(currentOrganizationId) });
                    if (!currentOrganizationId) return;
                    changePlanMutation.mutate({ plan_code: plan.code, billing_interval: interval });
                  }}
                >
                  {actionLabel}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-6">
        <h2 className="text-xl font-semibold">Usage limits at a glance</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Limit</th>
                {plans.map((plan) => <th key={plan.code}>{plan.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {LIMIT_ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="py-2">{row.label}</td>
                  {plans.map((plan) => <td key={`${plan.code}-${row.key}`}>{formatLimit(plan.limits[row.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
