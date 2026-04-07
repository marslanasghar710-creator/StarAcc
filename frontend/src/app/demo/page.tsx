import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageViewTracker } from "@/marketing/components/page-view-tracker";
import { PublicLayout } from "@/marketing/components/public-layout";
import { TrackedLink } from "@/marketing/components/tracked-link";

export const metadata: Metadata = {
  title: "Public demo",
  description: "Explore StarAcc in an isolated demo pathway with sample accounting data and guided workflow links.",
  alternates: { canonical: "/demo" },
};

export default function DemoPage() {
  return <PublicLayout>
    <PageViewTracker event="demo_page_entered" payload={{ page: "demo" }} />
    <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
      <Badge variant="secondary" className="mb-4">Demo mode • isolated sample data</Badge>
      <h1 className="text-3xl font-semibold tracking-tight">Public demo entry</h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">Demo mode uses isolated seeded sample organizations. It is intentionally separate from real customer ledgers and admin operations.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>What to explore</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><p>• Dashboard finance summary</p><p>• Invoice and bill lifecycle</p><p>• Bank reconciliation</p><p>• Profit & Loss and exports</p><p>• Audit timeline</p><p>• Project profitability and consolidation</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Conversion pathways</CardTitle></CardHeader><CardContent className="space-y-3"><Button asChild className="w-full"><TrackedLink href="/register?intent=start_workspace" eventPayload={{ cta: "demo_start_setup" }}>Create your own workspace</TrackedLink></Button><Button asChild variant="outline" className="w-full"><TrackedLink href="/contact?intent=demo" eventPayload={{ cta: "demo_book_walkthrough" }}>Book a guided walkthrough</TrackedLink></Button><Button asChild variant="secondary" className="w-full"><TrackedLink href="/login?redirectTo=/start" eventPayload={{ cta: "demo_login" }}>Go to sign in</TrackedLink></Button></CardContent></Card>
      </div>
    </section>
  </PublicLayout>;
}
