import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicLayout } from "@/marketing/components/public-layout";
import { faqItems } from "@/marketing/content/site-content";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common buyer questions about StarAcc capabilities, demo access, controls, and onboarding.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return <PublicLayout>
    <section className="mx-auto max-w-4xl px-4 py-14 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">FAQ</h1>
      <div className="mt-8 space-y-4">
        {faqItems.map((item) => <Card key={item.q}><CardHeader><CardTitle className="text-lg">{item.q}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{item.a}</CardContent></Card>)}
      </div>
    </section>
  </PublicLayout>;
}
