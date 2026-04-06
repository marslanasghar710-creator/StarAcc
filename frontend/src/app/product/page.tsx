import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicLayout } from "@/marketing/components/public-layout";
import { Section } from "@/marketing/components/sections";

export const metadata: Metadata = {
  title: "Product overview",
  description: "Understand how StarAcc connects accounting core, operations, controls, reporting, and multi-entity scale.",
  alternates: { canonical: "/product" },
};

export default function ProductPage() {
  return <PublicLayout>
    <Section title="Product overview" subtitle="StarAcc unifies operational accounting and control architecture in one platform.">
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["Accounting Core", "Journals, chart of accounts, period controls, and posting discipline."],
          ["AR/AP + Banking", "Invoices, bills, supplier and customer flows, reconciliation, and cashbook context."],
          ["Reporting + Exports", "P&L, balance sheet, trial balance, custom reporting, exports/PDFs."],
          ["Control Layer", "RBAC, activity timeline, audit posture, and org-isolated access."]
        ].map(([title, body]) => <Card key={title}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{body}</CardContent></Card>)}
      </div>
    </Section>
  </PublicLayout>;
}
