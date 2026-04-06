"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePublicPlans } from "@/features/billing/hooks";
import { TrackedLink } from "@/marketing/components/tracked-link";
import { pricingPlans } from "@/marketing/content/site-content";

export function PricingPlanGrid() {
  const plansQuery = usePublicPlans();

  const plans = plansQuery.data?.map((plan) => ({
    name: plan.name,
    description: `${plan.tier.toUpperCase()} tier with ${Object.keys(plan.feature_bundle).filter((k) => plan.feature_bundle[k]).length} enabled modules.`,
    highlights: Object.entries(plan.feature_bundle)
      .filter(([, enabled]) => enabled)
      .slice(0, 3)
      .map(([key]) => key.replaceAll("_", " ")),
    cta: plan.contact_sales_only
      ? { label: "Contact Sales", href: "/contact?intent=pricing", event: `pricing_${plan.code}` }
      : { label: `Choose ${plan.name}`, href: "/register", event: `pricing_${plan.code}` },
    price: "Configurable",
    period: "",
  })) ?? pricingPlans;

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((plan) => (
        <Card key={plan.name}>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
            <p className="text-3xl font-semibold">{plan.price}<span className="text-sm text-muted-foreground">{plan.period}</span></p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm text-muted-foreground">{plan.highlights.map((h) => <li key={h}>• {h}</li>)}</ul>
            <Button asChild className="w-full"><TrackedLink href={plan.cta.href} eventPayload={{ cta: plan.cta.event }}>{plan.cta.label}</TrackedLink></Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
