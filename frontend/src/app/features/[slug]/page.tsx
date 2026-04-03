import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/marketing/components/public-layout";
import { featurePages, type FeatureSlug } from "@/marketing/content/feature-pages";
import { TrackedLink } from "@/marketing/components/tracked-link";

export function generateStaticParams() {
  return Object.keys(featurePages).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = featurePages[params.slug as FeatureSlug];
  if (!page) return {};
  return { title: page.title, description: page.problem, alternates: { canonical: `/features/${params.slug}` } };
}

export default function FeaturePage({ params }: { params: { slug: string } }) {
  const page = featurePages[params.slug as FeatureSlug];
  if (!page) return notFound();

  return <PublicLayout>
    <section className="mx-auto max-w-5xl px-4 py-14 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
      <p className="mt-3 text-muted-foreground">{page.problem}</p>
      <Card className="mt-8"><CardHeader><CardTitle>Workflow summary</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{page.workflow}</CardContent></Card>
      <div className="mt-6 flex flex-wrap gap-3"><Button asChild><TrackedLink href="/demo" eventPayload={{ feature: params.slug }}>Explore Demo</TrackedLink></Button><Button asChild variant="outline"><TrackedLink href="/register" eventPayload={{ feature: params.slug }}>Start Setup</TrackedLink></Button></div>
    </section>
  </PublicLayout>;
}
