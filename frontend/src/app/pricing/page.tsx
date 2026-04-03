import type { Metadata } from "next";

import { PageViewTracker } from "@/marketing/components/page-view-tracker";
import { PricingPlanGrid } from "@/marketing/components/pricing-plan-grid";
import { PublicLayout } from "@/marketing/components/public-layout";

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
      <PricingPlanGrid />
    </section>
  </PublicLayout>;
}
