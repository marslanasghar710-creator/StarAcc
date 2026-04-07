import { trackFunnelEvent } from "@/features/funnel/analytics";

export type PublicEventName =
  | "landing_viewed"
  | "cta_clicked"
  | "demo_page_entered"
  | "signup_started"
  | "pricing_viewed"
  | "contact_submitted"
  | "security_viewed"
  | "feature_viewed";

const eventMap: Record<PublicEventName, Parameters<typeof trackFunnelEvent>[0]> = {
  landing_viewed: "landing_viewed",
  cta_clicked: "landing_cta_clicked",
  demo_page_entered: "demo_entered",
  signup_started: "signup_started",
  pricing_viewed: "features_viewed",
  contact_submitted: "features_viewed",
  security_viewed: "features_viewed",
  feature_viewed: "features_viewed",
};

export function trackPublicEvent(name: PublicEventName, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  void trackFunnelEvent(eventMap[name], payload);

  const win = window as Window & { dataLayer?: Array<Record<string, unknown>> };
  win.dataLayer = win.dataLayer ?? [];
  win.dataLayer.push({ event: name, ...payload });
  window.dispatchEvent(new CustomEvent("staracc:public-analytics", { detail: { name, payload, ts: new Date().toISOString() } }));
}
