import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageViewTracker } from "@/marketing/components/page-view-tracker";
import { PublicLayout } from "@/marketing/components/public-layout";
import { TrackedLink } from "@/marketing/components/tracked-link";
import { pricingPlans } from "@/marketing/content/site-content";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Pricing-ready StarAcc plans for starter teams through multi-entity and enterprise deployments.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return <PublicLayout>
    <PageViewTracker event="pricing_viewed" payload={{ page: "pricing" }} />
    <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">Production-ready structure with plan cards, comparison-ready highlights, enterprise path, and conversion CTAs.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {pricingPlans.map((plan) => <Card key={plan.name}><CardHeader><CardTitle>{plan.name}</CardTitle><CardDescription>{plan.description}</CardDescription><p className="text-3xl font-semibold">{plan.price}<span className="text-sm text-muted-foreground">{plan.period}</span></p></CardHeader><CardContent className="space-y-3"><ul className="space-y-2 text-sm text-muted-foreground">{plan.highlights.map((h) => <li key={h}>• {h}</li>)}</ul><Button asChild className="w-full"><TrackedLink href={plan.cta.href} eventPayload={{ cta: plan.cta.event }}>{plan.cta.label}</TrackedLink></Button></CardContent></Card>)}
      </div>
    </section>
  </PublicLayout>;
}
