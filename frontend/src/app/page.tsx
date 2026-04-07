import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { faqItems } from "@/marketing/content/site-content";
import { ConversionCtaBand, FaqBlock, HeroConversionBand, MarketingMetric, ValueProofGrid } from "@/marketing/components/conversion-sections";
import { PublicLayout } from "@/marketing/components/public-layout";
import { Section } from "@/marketing/components/sections";
import { PageViewTracker } from "@/marketing/components/page-view-tracker";

export const metadata: Metadata = {
  title: "Accounting platform for serious operators",
  description: "StarAcc is a multi-entity accounting platform with AR/AP, reconciliation, reporting, controls, and audit-safe workflows.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <PublicLayout>
      <PageViewTracker event="landing_viewed" payload={{ page: "home" }} />
      <HeroConversionBand />
      <Section title="Proof of operational fit" subtitle="Designed for daily accounting operations, not brochure metrics.">
        <div className="grid gap-4 md:grid-cols-3">
          <MarketingMetric label="Dashboard orientation" value="Cash + AR/AP first" helper="Daily command center framing for operator and controller workflows." />
          <MarketingMetric label="Control model" value="Role + org scoped" helper="Permissions and organization boundaries remain explicit across modules." />
          <MarketingMetric label="Audit posture" value="Timeline by default" helper="Activity center and immutable-sensitive accounting records remain traceable." />
        </div>
      </Section>
      <ValueProofGrid />
      <Section title="Workflow highlights" subtitle="From first invoice to reconciliation and reporting, with backend truth preserved at each step.">
        <div className="grid gap-4 md:grid-cols-2">
          {["Invoice and bill lifecycle with status-aware workflows", "Bank import, matching, and reconciliation operations", "P&L, balance sheet, trial balance, and exports", "Audit activity center and finance-team accountability"].map((item) => (
            <Card key={item} className="border-border/70 shadow-sm"><CardContent className="pt-6 text-sm">{item}</CardContent></Card>
          ))}
        </div>
      </Section>
      <ConversionCtaBand title="Choose your path" subtitle="Explore demo data instantly or start a real workspace with your own chart and workflows." />
      <FaqBlock items={faqItems} />
    </PublicLayout>
  );
}
