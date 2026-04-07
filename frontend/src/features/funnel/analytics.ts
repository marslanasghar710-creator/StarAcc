"use client";

import { apiClient } from "@/lib/api/client";
import { EVENT_VERSIONS, type AnalyticsEventEnvelope, type AnalyticsEventName, type FunnelDomain, type FunnelStage, type PageType, type SurfaceType } from "@/features/funnel/types";

const ATTRIBUTION_STORAGE_KEY = "staracc.funnel-attribution";
const ANON_ID_KEY = "staracc.funnel-anonymous-id";
const SESSION_ID_KEY = "staracc.funnel-session-id";
const EVENT_MEMORY_KEY = "staracc.funnel-event-memory";

type AttributionSnapshot = {
  first_touch: Record<string, string | null>;
  latest_touch: Record<string, string | null>;
};

function safeStorageGet(key: string) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function safeStorageSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

function ensureId(key: string) {
  const current = safeStorageGet(key);
  if (current) return current;
  const next = crypto.randomUUID();
  safeStorageSet(key, next);
  return next;
}

function currentAttribution() {
  if (typeof window === "undefined") return {} as Record<string, string | null>;
  const params = new URLSearchParams(window.location.search);
  return {
    referrer: document.referrer || null,
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
    landing_path: window.location.pathname,
    landing_at: new Date().toISOString(),
  };
}

function getAttributionSnapshot(): AttributionSnapshot {
  const existing = safeStorageGet(ATTRIBUTION_STORAGE_KEY);
  const touch = currentAttribution();
  if (!existing) {
    const snapshot = { first_touch: touch, latest_touch: touch };
    safeStorageSet(ATTRIBUTION_STORAGE_KEY, JSON.stringify(snapshot));
    return snapshot;
  }
  const parsed = JSON.parse(existing) as AttributionSnapshot;
  const snapshot = { ...parsed, latest_touch: { ...parsed.latest_touch, ...touch } };
  safeStorageSet(ATTRIBUTION_STORAGE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

function viewportBucket(width: number): AnalyticsEventEnvelope["viewport_bucket"] {
  if (width < 640) return "sm";
  if (width < 768) return "md";
  if (width < 1024) return "lg";
  if (width < 1280) return "xl";
  return "2xl";
}

function deviceType(width: number): AnalyticsEventEnvelope["device_type"] {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function environment(): AnalyticsEventEnvelope["environment"] {
  if (typeof window === "undefined") return "production";
  const host = window.location.hostname;
  if (host.includes("localhost") || host.includes("127.0.0.1")) return "development";
  if (host.includes("staging")) return "staging";
  return "production";
}

function shouldDedupe(eventName: AnalyticsEventName, dedupeKey?: string) {
  if (typeof window === "undefined") return false;
  if (!dedupeKey) return false;
  const seed = `${eventName}:${dedupeKey}`;
  const raw = safeStorageGet(EVENT_MEMORY_KEY);
  const memory = raw ? (JSON.parse(raw) as string[]) : [];
  if (memory.includes(seed)) return true;
  safeStorageSet(EVENT_MEMORY_KEY, JSON.stringify([...memory.slice(-200), seed]));
  return false;
}

export async function trackEvent(
  eventName: AnalyticsEventName,
  payload: Record<string, unknown>,
  context: {
    page_type?: PageType;
    surface?: SurfaceType;
    funnel_domain?: FunnelDomain;
    funnel_stage?: FunnelStage;
    is_demo?: boolean;
    is_authenticated?: boolean;
    user_id?: string | null;
    org_id?: string | null;
    workspace_id?: string | null;
    landing_variant?: string | null;
    experiment_assignments?: Record<string, string>;
    dedupe_key?: string;
  } = {},
) {
  if (typeof window === "undefined") return;
  if (shouldDedupe(eventName, context.dedupe_key)) return;

  const attribution = getAttributionSnapshot();
  const width = window.innerWidth;

  const envelope: AnalyticsEventEnvelope = {
    event_name: eventName,
    event_version: EVENT_VERSIONS[eventName],
    occurred_at: new Date().toISOString(),
    session_id: ensureId(SESSION_ID_KEY),
    anonymous_id: ensureId(ANON_ID_KEY),
    user_id: context.user_id ?? null,
    org_id: context.org_id ?? null,
    workspace_id: context.workspace_id ?? null,
    route: window.location.pathname,
    path: window.location.pathname,
    page_type: context.page_type,
    surface: context.surface,
    funnel_domain: context.funnel_domain,
    funnel_stage: context.funnel_stage,
    is_demo: context.is_demo,
    is_authenticated: context.is_authenticated,
    environment: environment(),
    referrer: attribution.latest_touch.referrer,
    utm_source: attribution.latest_touch.utm_source,
    utm_medium: attribution.latest_touch.utm_medium,
    utm_campaign: attribution.latest_touch.utm_campaign,
    utm_term: attribution.latest_touch.utm_term,
    utm_content: attribution.latest_touch.utm_content,
    landing_variant: context.landing_variant ?? null,
    experiment_assignments: context.experiment_assignments ?? {},
    device_type: deviceType(width),
    viewport_bucket: viewportBucket(width),
    locale: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    country: null,
    payload,
  };

  const win = window as Window & { dataLayer?: Array<Record<string, unknown>> };
  win.dataLayer = win.dataLayer ?? [];
  win.dataLayer.push({ event: eventName, ...payload });

  void apiClient("/analytics/events", {
    method: "POST",
    body: envelope,
    skipAuth: true,
    retryOnUnauthorized: false,
  }).catch(() => undefined);
}
