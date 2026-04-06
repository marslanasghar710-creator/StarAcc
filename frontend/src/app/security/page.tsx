import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageViewTracker } from "@/marketing/components/page-view-tracker";
import { PublicLayout } from "@/marketing/components/public-layout";

export const metadata: Metadata = {
  title: "Security and controls",
  description: "How StarAcc handles org separation, RBAC, auditability, and finance-grade workflow control.",
  alternates: { canonical: "/security" },
};

export default function SecurityPage() {
  return <PublicLayout>
    <PageViewTracker event="security_viewed" payload={{ page: "security" }} />
    <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Security, control, and trust posture</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[
          ["Organization data separation", "Every organization runs in isolated operational context with scoped data access."],
          ["Role-based access control", "Permissions and navigation are role-aware for operational governance."],
          ["Auditability", "Activity center and immutable-sensitive workflows preserve accounting evidence."],
          ["Data portability", "Reports, exports, and PDF outputs support external review and handoff."],
          ["Operational controls", "Period controls and backend-authoritative posting protect ledger quality."],
          ["Compliance-ready trajectory", "Architecture is designed for future compliance readiness without false certification claims."]
        ].map(([title, body]) => <Card key={title}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{body}</CardContent></Card>)}
      </div>
    </section>
  </PublicLayout>;
}
