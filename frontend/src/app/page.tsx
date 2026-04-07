import type { Metadata } from "next";

import { faqItems } from "@/marketing/content/site-content";
import {
  AuditIntegrityBand,
  DashboardShowcase,
  DemoCTASection,
  FAQSection,
  FinalCTASection,
  HeroSection,
  IntegrationsBand,
  RoleUseCases,
  TrustStrip,
  ValueGrid,
  WorkflowShowcase,
} from "@/marketing/components/conversion-sections";
import { PublicLayout } from "@/marketing/components/public-layout";
import { PageViewTracker } from "@/marketing/components/page-view-tracker";

export const metadata: Metadata = {
  title: "Accounting platform for serious operators",
  description: "StarAcc is a multi-entity accounting platform with AR/AP, reconciliation, reporting, controls, and audit-safe workflows.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <PublicLayout>
      <PageViewTracker event="landing_viewed" payload={{ page: "home" }} />
      <HeroSection />
      <TrustStrip />
      <ValueGrid />
      <WorkflowShowcase />
      <DashboardShowcase />
      <AuditIntegrityBand />
      <IntegrationsBand />
      <RoleUseCases />
      <DemoCTASection />
      <FAQSection items={faqItems} />
      <FinalCTASection />
    </PublicLayout>
  );
}
