import { trackEvent } from "@/features/funnel/analytics";

export type PublicEventName =
  | "landing_viewed"
  | "section_viewed"
  | "cta_clicked"
  | "demo_page_entered"
  | "signup_started"
  | "feature_viewed"
  | "faq_interacted"
  | "nav_clicked"
  | "pricing_viewed"
  | "security_viewed"
  | "contact_submitted";

export function trackPublicEvent(name: PublicEventName, payload: Record<string, unknown> = {}) {
  if (name === "landing_viewed") {
    return trackEvent("marketing.landing.viewed", {
      landing_page_id: "main",
      entry_section: null,
      hero_variant: "ledger_first",
      has_utm: Boolean(typeof window !== "undefined" && window.location.search.includes("utm_")),
      ...payload,
    }, { page_type: "landing", surface: "public_site", funnel_domain: "acquisition", funnel_stage: "acquired", dedupe_key: "landing_main" });
  }

  if (name === "section_viewed") {
    return trackEvent("marketing.section.viewed", payload, { page_type: "landing", surface: "public_site", funnel_domain: "acquisition", funnel_stage: "engaged", dedupe_key: String(payload.section_id ?? "") });
  }

  if (name === "cta_clicked") {
    return trackEvent("marketing.cta.clicked", {
      cta_id: payload.cta_id ?? payload.cta ?? "unknown_cta",
      cta_label: payload.cta_label ?? payload.cta ?? "Unknown",
      cta_variant: payload.cta_variant ?? "secondary",
      source_section: payload.source_section ?? payload.zone ?? "hero",
      destination_type: payload.destination_type ?? "other",
    }, { page_type: "landing", surface: "public_site", funnel_domain: "acquisition", funnel_stage: "engaged" });
  }

  if (name === "faq_interacted") {
    return trackEvent("marketing.faq.toggled", { question_id: payload.question ?? "unknown", action: payload.action ?? "opened", source_section: "faq" }, { page_type: "landing", surface: "public_site", funnel_domain: "acquisition", funnel_stage: "engaged" });
  }

  if (name === "demo_page_entered") {
    void trackEvent("demo.entry.started", { entry_point: "direct_route", ...payload }, { page_type: "demo", surface: "demo", funnel_domain: "demo", funnel_stage: "engaged", is_demo: true, dedupe_key: "demo_entry_started" });
    return trackEvent("demo.workspace.entered", { demo_session_id: "public-demo", entry_point: "direct_route", ...payload }, { page_type: "demo", surface: "demo", funnel_domain: "demo", funnel_stage: "demo_entered", is_demo: true, dedupe_key: "demo_entered" });
  }

  if (name === "nav_clicked") {
    return trackEvent("marketing.nav.clicked", payload, { page_type: "marketing", surface: "public_site", funnel_domain: "acquisition", funnel_stage: "engaged" });
  }

  if (name === "signup_started") {
    return trackEvent("auth.signup.started", payload, { page_type: "signup", surface: "signup", funnel_domain: "signup", funnel_stage: "signup_started" });
  }

  if (name === "pricing_viewed") {
    return trackEvent("pricing.page.viewed", payload, { page_type: "marketing", surface: "public_site", funnel_domain: "acquisition", funnel_stage: "engaged" });
  }

  return trackEvent("marketing.section.viewed", payload, { page_type: "marketing", surface: "public_site", funnel_domain: "acquisition", funnel_stage: "engaged" });
}
