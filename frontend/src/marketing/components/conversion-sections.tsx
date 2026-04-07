"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { BarChart3, Building2, CheckCircle2, Landmark, Link2, ShieldCheck, Workflow, WalletCards } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trackPublicEvent } from "@/marketing/lib/analytics";
import { TrackedLink } from "@/marketing/components/tracked-link";

function SectionShell({ id, eyebrow, title, subtitle, children, dense = "medium" }: { id?: string; eyebrow?: string; title: string; subtitle?: string; children: ReactNode; dense?: "low" | "medium" | "high" }) {
  const spacing = dense === "high" ? "py-14 md:py-16" : dense === "low" ? "py-12 md:py-14" : "py-16 md:py-20";
  return (
    <section id={id} className={`mx-auto max-w-6xl px-4 md:px-6 ${spacing}`}>
      <div className="mb-6 max-w-3xl space-y-3">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p> : null}
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
        {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function CtaCluster() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild size="lg"><TrackedLink href="/register?intent=start_workspace" eventPayload={{ cta: "start_workspace", zone: "hero" }}>Start Workspace</TrackedLink></Button>
      <Button asChild variant="outline" size="lg"><TrackedLink href="/demo" eventPayload={{ cta: "explore_demo", zone: "hero" }}>Explore Demo</TrackedLink></Button>
      <Button asChild variant="ghost" size="lg"><TrackedLink href="#value-grid" eventPayload={{ cta: "view_features", zone: "hero" }}>View Features</TrackedLink></Button>
    </div>
  );
}

function ProductFrame() {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="grid gap-3">
        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Finance command center</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg border border-border/60 bg-background px-2 py-1.5"><p className="text-muted-foreground">Cash</p><p className="font-semibold">$1.24M</p></div>
            <div className="rounded-lg border border-border/60 bg-background px-2 py-1.5"><p className="text-muted-foreground">AR</p><p className="font-semibold">$312K</p></div>
            <div className="rounded-lg border border-border/60 bg-background px-2 py-1.5"><p className="text-muted-foreground">AP</p><p className="font-semibold">$198K</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue vs expense trend</p>
          <div className="mt-2 h-20 rounded-lg bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-primary/15" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs">
            <p className="font-medium">Attention center</p>
            <p className="mt-1 text-muted-foreground">6 overdue items + 12 unreconciled transactions.</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs">
            <p className="font-medium">Reports</p>
            <p className="mt-1 text-muted-foreground">P&L, balance sheet, trial balance, exports.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:px-6 md:py-16">
      <div className="space-y-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Ledger-first financial operations platform</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Run accounting with control, visibility, and audit-ready confidence.</h1>
        <p className="text-lg text-muted-foreground">StarAcc brings dashboards, invoicing, bills, reconciliation, reporting, and activity control into one operationally serious accounting system for growing businesses and finance teams.</p>
        <CtaCluster />
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {[
            "Audit-safe ledger",
            "Reconciliation workflows",
            "Reporting & consolidation",
            "Multi-entity ready",
          ].map((point) => <p key={point} className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" /> {point}</p>)}
        </div>
      </div>
      <ProductFrame />
    </section>
  );
}

export function TrustStrip() {
  const items = [
    { icon: Landmark, label: "Immutable ledger", detail: "Accounting records are backend-authoritative and traceable." },
    { icon: ShieldCheck, label: "Audit visibility", detail: "Activity center provides source-to-report confidence." },
    { icon: Workflow, label: "Reconciliation ready", detail: "Banking workflows keep cash positions reliable." },
    { icon: BarChart3, label: "Reporting depth", detail: "Operational reporting and exports are built in." },
    { icon: Building2, label: "Multi-entity capable", detail: "Group structures and consolidation pathways are available." },
  ];

  return (
    <SectionShell id="trust" dense="high" eyebrow="Trust signals" title="Built for reliable financial operations" subtitle="Capability-based credibility, grounded in product truth.">
      <div className="grid gap-3 md:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <item.icon className="size-4 text-primary" />
            <p className="mt-2 text-sm font-medium">{item.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function ValueGrid() {
  const cards = [
    ["Dashboard visibility", "Cash, AR/AP risk, and trend intelligence with drilldown pathways."],
    ["Invoicing & receivables", "Status-aware AR workflow with follow-up and aging visibility."],
    ["Bills & payables", "Operational AP workflow with due-state and payment readiness."],
    ["Bank reconciliation", "Import, review, and reconcile transactions with clear exceptions."],
    ["Reporting & exports", "P&L, balance sheet, trial balance, and export-ready outputs."],
    ["Audit/activity control", "Trace actions and workflow history across team operations."],
    ["Consolidation", "Group reporting pathways for multi-entity organizations."],
    ["Integrations readiness", "Extensible integration framework for broader financial stack fit."],
  ];

  return (
    <SectionShell id="value-grid" dense="high" eyebrow="Product modules" title="A complete model of accounting operations" subtitle="Fast mental model of what StarAcc covers end-to-end.">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map(([title, body]) => (
          <Card key={title} className="border-border/70 shadow-sm">
            <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">{body}</CardContent>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}

export function WorkflowShowcase() {
  const steps = [
    "Capture daily transaction activity",
    "Manage invoices and bills with status control",
    "Reconcile bank movements and clear exceptions",
    "Review attention items before month-end",
    "Close with reporting confidence",
  ];

  return (
    <SectionShell dense="medium" eyebrow="Operational flow" title="From daily transactions to month-end control" subtitle="A procedural workflow designed for real finance operations.">
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Workflow sequence</CardTitle>
            <CardDescription>Concrete finance execution path, not generic productivity promises.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {steps.map((step, index) => <p key={step} className="inline-flex items-center gap-2"><span className="inline-flex size-5 items-center justify-center rounded-full border border-border text-[11px]">{index + 1}</span>{step}</p>)}
          </CardContent>
        </Card>
        <ProductFrame />
      </div>
    </SectionShell>
  );
}

export function DashboardShowcase() {
  const callouts = [
    "Cash visibility surfaces liquidity pressure early.",
    "AR/AP aging highlights where risk is concentrated.",
    "Attention center prioritizes operational follow-up.",
    "Report drill-through keeps decisions auditable.",
  ];
  return (
    <SectionShell dense="medium" eyebrow="Visibility" title="See what needs attention before it becomes a problem" subtitle="Dashboard and reporting surfaces connect daily workflow execution to confident financial review.">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <ProductFrame />
        <div className="space-y-3">
          {callouts.map((item) => <Card key={item} className="border-border/70 shadow-sm"><CardContent className="pt-4 text-sm text-muted-foreground">{item}</CardContent></Card>)}
        </div>
      </div>
    </SectionShell>
  );
}

export function AuditIntegrityBand() {
  return (
    <SectionShell dense="medium" eyebrow="Control" title="Built on an audit-safe ledger foundation" subtitle="Trace financial activity from workflow to report while maintaining reviewability as processes scale.">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          "Immutable financial history",
          "Traceable activity timeline",
          "Source-to-report confidence",
          "Role-aware operational controls",
        ].map((item) => <Card key={item} className="border-border/70 shadow-sm"><CardContent className="pt-5 text-sm">{item}</CardContent></Card>)}
      </div>
    </SectionShell>
  );
}

export function IntegrationsBand() {
  return (
    <SectionShell dense="high" eyebrow="Extensibility" title="Integration-ready by design" subtitle="Supports bank data pathways, exports, and a framework for broader workflow connectivity.">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 shadow-sm"><CardContent className="pt-5 text-sm text-muted-foreground"><Link2 className="mb-2 size-4 text-primary" />Bank data connectivity and import workflows.</CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardContent className="pt-5 text-sm text-muted-foreground"><WalletCards className="mb-2 size-4 text-primary" />Report exports for finance handoff and external review.</CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardContent className="pt-5 text-sm text-muted-foreground"><Workflow className="mb-2 size-4 text-primary" />Extensible integration layer for future growth needs.</CardContent></Card>
      </div>
    </SectionShell>
  );
}

export function RoleUseCases() {
  const roles = [
    { title: "Owners & operators", bullets: ["Understand cash and obligations quickly", "Run invoicing and payable workflows", "Keep month-end decisions grounded"] },
    { title: "Finance teams", bullets: ["Maintain ledger integrity", "Operate reconciliation and review queues", "Report with confidence and controls"] },
    { title: "Multi-entity businesses", bullets: ["Preserve process consistency", "Consolidate reporting across entities", "Scale governance as complexity grows"] },
  ];
  return (
    <SectionShell dense="high" eyebrow="Audience fit" title="Designed for operators, finance leads, and scaling teams" subtitle="Visitors can quickly self-identify how StarAcc fits their operating model.">
      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.title} className="border-border/70 shadow-sm">
            <CardHeader><CardTitle className="text-base">{role.title}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">{role.bullets.map((bullet) => <p key={bullet}>• {bullet}</p>)}</CardContent>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}

export function DemoCTASection() {
  return (
    <SectionShell dense="medium" eyebrow="Try before setup" title="Explore realistic sample data in an isolated demo workspace" subtitle="Demo includes dashboard, reports, invoices, bills, and reconciliation examples. It is separate from real setup, and you can create your own workspace at any time.">
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="lg"><TrackedLink href="/demo" eventPayload={{ cta: "explore_demo", zone: "demo_band" }}>Explore Demo</TrackedLink></Button>
        <Button asChild size="lg"><TrackedLink href="/register?intent=start_workspace" eventPayload={{ cta: "start_workspace", zone: "demo_band" }}>Start Workspace</TrackedLink></Button>
      </div>
    </SectionShell>
  );
}

export function FAQSection({ items }: { items: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<string | null>(items[0]?.q ?? null);
  return (
    <SectionShell id="faq" dense="high" eyebrow="FAQ" title="Answers to common evaluation questions" subtitle="Short, concrete answers to reduce friction before signup.">
      <div className="grid gap-3">
        {items.map((item) => (
          <button
            key={item.q}
            type="button"
            onClick={() => {
              setOpen((current) => current === item.q ? null : item.q);
              trackPublicEvent("faq_interacted", { question: item.q });
            }}
            className="w-full rounded-xl border border-border/70 bg-card p-4 text-left shadow-sm"
          >
            <p className="font-medium text-foreground">{item.q}</p>
            {open === item.q ? <p className="mt-2 text-sm text-muted-foreground">{item.a}</p> : null}
          </button>
        ))}
      </div>
    </SectionShell>
  );
}

export function FinalCTASection() {
  return (
    <SectionShell dense="low" title="Start with a real workspace, or explore the demo first." subtitle="Choose the path that fits your evaluation stage.">
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg"><TrackedLink href="/register?intent=start_workspace" eventPayload={{ cta: "start_workspace", zone: "final_cta" }}>Start Workspace</TrackedLink></Button>
        <Button asChild variant="outline" size="lg"><TrackedLink href="/demo" eventPayload={{ cta: "explore_demo", zone: "final_cta" }}>Explore Demo</TrackedLink></Button>
      </div>
    </SectionShell>
  );
}
