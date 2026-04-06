import type { Metadata } from "next";

import { PublicLayout } from "@/marketing/components/public-layout";
import { ContactForm } from "@/marketing/components/contact-form";

export const metadata: Metadata = {
  title: "Contact and demo request",
  description: "Contact StarAcc for demos, pricing discussions, or general questions.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 py-14 md:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Contact / request demo</h1>
        <p className="mt-3 text-muted-foreground">Share context and we will follow up with the right path: demo, pricing, or implementation discussion.</p>
        <ContactForm />
      </section>
    </PublicLayout>
  );
}
