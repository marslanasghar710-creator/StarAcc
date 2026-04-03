import type { Metadata } from "next";
import { PublicLayout } from "@/marketing/components/public-layout";

export const metadata: Metadata = {
  title: "Product updates",
  description: "Public changelog surface for StarAcc product updates and release communication.",
  alternates: { canonical: "/updates" },
};

export default function UpdatesPage() {
  return <PublicLayout><section className="mx-auto max-w-4xl px-4 py-14 md:px-6"><h1 className="text-3xl font-semibold tracking-tight">Product updates</h1><p className="mt-3 text-muted-foreground">Release notes feed placeholder ready for future GTM update cadence.</p></section></PublicLayout>;
}
