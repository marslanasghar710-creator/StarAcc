export type PublicEventName =
  | "landing_viewed"
  | "cta_clicked"
  | "demo_page_entered"
  | "signup_started"
  | "pricing_viewed"
  | "contact_submitted"
  | "security_viewed"
  | "feature_viewed";

export function trackPublicEvent(name: PublicEventName, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const eventPayload = {
    name,
    payload,
    ts: new Date().toISOString(),
  };

  const win = window as Window & { dataLayer?: Array<Record<string, unknown>> };
  win.dataLayer = win.dataLayer ?? [];
  win.dataLayer.push({ event: name, ...payload });
  window.dispatchEvent(new CustomEvent("staracc:public-analytics", { detail: eventPayload }));
}
