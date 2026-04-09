import type { Metadata } from "next";

import { PricingPlanGrid } from "@/marketing/components/pricing-plan-grid";
import { PageViewTracker } from "@/marketing/components/page-view-tracker";
import { PublicLayout } from "@/marketing/components/public-layout";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple transparent pricing with deterministic limits and feature entitlements.",
  alternates: { canonical: "/pricing" },
};

const faq = [
  { q: "Can I upgrade anytime?", a: "Yes. Plan changes apply immediately and entitlements refresh instantly." },
  { q: "What happens if I hit a limit?", a: "New actions are blocked at API level and the app prompts upgrade." },
  { q: "Do yearly plans exist?", a: "Yearly billing is supported in the billing backend and surfaced during checkout." },
];

export default function PricingPage() {
  return (
    <PublicLayout>
      <PageViewTracker event="pricing_viewed" payload={{ page: "pricing" }} />
      <section className="mx-auto max-w-6xl space-y-10 px-4 py-14 md:px-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">Choose Starter, Growth, or Pro. Limits and features are enforced in backend entitlements.</p>
        </div>

        <PricingPlanGrid />

        <div className="rounded-2xl border border-border/70 bg-card p-6">
          <h2 className="text-xl font-semibold">Usage limits at a glance</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2">Limit</th><th>Starter</th><th>Growth</th><th>Pro</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="py-2">Invoices / month</td><td>50</td><td>500</td><td>Unlimited</td></tr>
                <tr><td className="py-2">Bills / month</td><td>50</td><td>500</td><td>Unlimited</td></tr>
                <tr><td className="py-2">Users</td><td>2</td><td>10</td><td>Unlimited</td></tr>
                <tr><td className="py-2">Bank accounts</td><td>1</td><td>5</td><td>Unlimited</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">FAQ</h2>
          {faq.map((item) => (
            <div key={item.q} className="rounded-xl border border-border/70 bg-card p-4">
              <p className="font-medium">{item.q}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
