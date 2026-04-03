import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { capabilityPillars, primaryCtas } from "@/marketing/content/site-content";
import { PublicLayout } from "@/marketing/components/public-layout";
import { Section } from "@/marketing/components/sections";
import { TrackedLink } from "@/marketing/components/tracked-link";
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
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-[1.1fr_0.9fr] md:px-6 md:py-20">
        <div className="space-y-6">
          <Badge variant="outline">Public demo + production onboarding</Badge>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Modern multi-entity accounting with audit-safe architecture.</h1>
          <p className="text-lg text-muted-foreground">StarAcc combines accounting core, operational workflows, reporting, controls, and automation in one serious finance system.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><TrackedLink href={primaryCtas.primary.href} eventPayload={{ cta: primaryCtas.primary.label }}>{primaryCtas.primary.label}</TrackedLink></Button>
            <Button asChild variant="outline" size="lg"><TrackedLink href={primaryCtas.secondary.href} eventPayload={{ cta: primaryCtas.secondary.label }}>{primaryCtas.secondary.label}</TrackedLink></Button>
          </div>
        </div>
        <Card>
          <CardHeader><CardTitle>What prospects can evaluate immediately</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>• Dashboard + core accounting flows</p>
            <p>• Invoices, bills, and bank reconciliation</p>
            <p>• P&L, balance sheet, trial balance, and exports/PDFs</p>
            <p>• Activity center, RBAC, and organization isolation</p>
            <p>• Consolidation + elimination pathways for groups</p>
          </CardContent>
        </Card>
      </section>

      <Section title="Product pillars mapped to real capabilities" subtitle="No aspirational vapor; each pillar corresponds to implemented modules.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {capabilityPillars.map((pillar) => (
            <Card key={pillar.title}><CardHeader><CardTitle className="text-lg">{pillar.title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{pillar.body}</CardContent></Card>
          ))}
        </div>
      </Section>

      <Section title="Why StarAcc feels different" subtitle="Built from backend truth first: immutable-sensitive accounting, role-aware controls, and dense finance UX.">
        <div className="grid gap-4 md:grid-cols-2">
          {["Backend-authoritative accounting operations", "Audit timeline and activity center by default", "Multi-organization boundaries with scoped access", "Advanced reporting + exports as first-class outputs"].map((item) => (
            <Card key={item}><CardContent className="pt-6 text-sm">{item}</CardContent></Card>
          ))}
        </div>
      </Section>

      <Section title="Trust and control for accounting operations" subtitle="Designed to be finance-grade: boundaries, reviewability, and exportability.">
        <div className="grid gap-4 md:grid-cols-3">
          {["Org-isolated data context", "Controlled permissions + RBAC", "Immutable-first audit trail", "Export and PDF portability", "Operationally reliable workflows", "Performance-hardened application shell"].map((item) => (
            <Card key={item}><CardContent className="pt-6 text-sm">{item}</CardContent></Card>
          ))}
        </div>
      </Section>

      <Section title="Choose your next step">
        <div className="flex flex-wrap gap-3">
          <Button asChild><TrackedLink href="/demo" eventPayload={{ cta: "explore_demo" }}>Explore Demo</TrackedLink></Button>
          <Button asChild variant="outline"><TrackedLink href="/register" eventPayload={{ cta: "start_setup" }}>Set up my company</TrackedLink></Button>
          <Button asChild variant="secondary"><TrackedLink href="/contact?intent=demo" eventPayload={{ cta: "book_walkthrough" }}>Book Walkthrough</TrackedLink></Button>
        </div>
      </Section>
    </PublicLayout>
  );
}
