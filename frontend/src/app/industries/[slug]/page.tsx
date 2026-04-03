import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/marketing/components/public-layout";
import { industryPages, type IndustrySlug } from "@/marketing/content/industry-pages";
import { TrackedLink } from "@/marketing/components/tracked-link";

export function generateStaticParams() {
  return Object.keys(industryPages).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = industryPages[params.slug as IndustrySlug];
  if (!page) return {};
  return { title: page.title, description: `${page.title} use cases for operational accounting teams.`, alternates: { canonical: `/industries/${params.slug}` } };
}

export default function IndustryPage({ params }: { params: { slug: string } }) {
  const page = industryPages[params.slug as IndustrySlug];
  if (!page) return notFound();

  return <PublicLayout>
    <section className="mx-auto max-w-5xl px-4 py-14 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">{page.points.map((point) => <Card key={point}><CardHeader><CardTitle className="text-lg">Outcome</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{point}</CardContent></Card>)}</div>
      <div className="mt-6 flex gap-3"><Button asChild><TrackedLink href="/demo">Explore Demo</TrackedLink></Button><Button asChild variant="outline"><TrackedLink href="/contact?intent=demo">Book Walkthrough</TrackedLink></Button></div>
    </section>
  </PublicLayout>;
}
