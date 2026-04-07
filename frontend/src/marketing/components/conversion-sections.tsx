import type { ReactNode } from "react";
import { BarChart3, CheckCircle2, Landmark, ShieldCheck, Workflow, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Section } from "@/marketing/components/sections";
import { TrackedLink } from "@/marketing/components/tracked-link";

export function HeroConversionBand() {
  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-[1.15fr_0.85fr] md:px-6 md:py-20">
      <div className="space-y-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Ledger-first accounting platform</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Financial control for operators who need real accounting integrity.</h1>
        <p className="text-lg text-muted-foreground">StarAcc is built for SMB operators, accountants, and scaling teams that need audit-safe ledgers, reconciliation confidence, and operational reporting they can trust every day.</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg"><TrackedLink href="/demo" eventPayload={{ cta: "explore_demo", zone: "hero" }}>Explore Demo</TrackedLink></Button>
          <Button asChild variant="outline" size="lg"><TrackedLink href="/register?intent=start_workspace" eventPayload={{ cta: "start_workspace", zone: "hero" }}>Start Workspace</TrackedLink></Button>
          <Button asChild variant="ghost" size="lg"><TrackedLink href="#capabilities" eventPayload={{ cta: "view_features", zone: "hero" }}>View features</TrackedLink></Button>
        </div>
      </div>
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>What teams validate in under 10 minutes</CardTitle>
          <CardDescription>Concrete workflows, not abstract claims.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Cash, AR, AP, and period performance dashboard</p>
          <p>• Invoice and bill workflows with status integrity</p>
          <p>• Bank reconciliation and transaction matching</p>
          <p>• Profit & loss, balance sheet, trial balance exports</p>
          <p>• Audit activity center and role-based boundaries</p>
        </CardContent>
      </Card>
    </section>
  );
}

export function ValueProofGrid() {
  const cards = [
    { icon: Landmark, title: "Ledger integrity", body: "Backend-authoritative posting and period state keep accounting truth deterministic." },
    { icon: Workflow, title: "Operational flow", body: "AR/AP, banking, and workflows are built for daily finance execution." },
    { icon: BarChart3, title: "Reporting confidence", body: "Core financial statements and exports stay aligned with ledger state." },
    { icon: ShieldCheck, title: "Audit readiness", body: "Activity center, permissions, and immutable-sensitive flows are first-class." },
    { icon: Zap, title: "Scale pathways", body: "Automation, integrations, and multi-entity readiness support growth without rewrites." },
    { icon: CheckCircle2, title: "Activation guidance", body: "Structured setup checklist bridges signup to first meaningful accounting actions." },
  ];

  return (
    <Section title="Built for serious finance operations" subtitle="Positioned for three common buyer groups: owner-operators, finance leads, and scaling operations teams.">
      <div id="capabilities" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-lg"><card.icon className="size-4 text-primary" /> {card.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{card.body}</CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export function ConversionCtaBand({ title, subtitle, primaryHref = "/register?intent=start_workspace", secondaryHref = "/demo" }: { title: string; subtitle: string; primaryHref?: string; secondaryHref?: string }) {
  return (
    <Section title={title} subtitle={subtitle}>
      <div className="flex flex-wrap gap-3">
        <Button asChild><TrackedLink href={primaryHref} eventPayload={{ cta: "start_workspace", zone: "strip" }}>Start Workspace</TrackedLink></Button>
        <Button asChild variant="outline"><TrackedLink href={secondaryHref} eventPayload={{ cta: "explore_demo", zone: "strip" }}>Explore Demo</TrackedLink></Button>
      </div>
    </Section>
  );
}

export function FaqBlock({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <Section title="FAQ" subtitle="Practical answers for evaluation and rollout planning.">
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.q} className="border-border/70 shadow-sm">
            <CardHeader><CardTitle className="text-base">{item.q}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">{item.a}</CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export function MarketingMetric({ label, value, helper }: { label: string; value: string; helper: ReactNode }) {
  return <div className="rounded-xl border border-border/70 bg-muted/20 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{helper}</p></div>;
}
