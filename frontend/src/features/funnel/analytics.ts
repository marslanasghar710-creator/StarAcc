"use client";

import { apiClient } from "@/lib/api/client";
import type { AttributionContext, FunnelEventName, FunnelEventPayload } from "@/features/funnel/types";

const ATTRIBUTION_STORAGE_KEY = "staracc.funnel-attribution";
const ANONYMOUS_ID_KEY = "staracc.funnel-anon-id";
const SESSION_ID_KEY = "staracc.funnel-session-id";

function readQueryAttribution() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get("utm_source"),
    campaign: params.get("utm_campaign"),
    medium: params.get("utm_medium"),
    term: params.get("utm_term"),
    content: params.get("utm_content"),
    referrer: document.referrer || null,
  } satisfies AttributionContext;
}

function ensureStorageId(key: string) {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);
  return next;
}

export function rememberAttributionContext() {
  if (typeof window === "undefined") return;
  const existing = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
  const parsed = existing ? (JSON.parse(existing) as AttributionContext) : {};
  const next = { ...parsed, ...readQueryAttribution() };
  window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(next));
}

export function getAttributionContext(): AttributionContext {
  if (typeof window === "undefined") return {};
  const saved = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
  return saved ? JSON.parse(saved) as AttributionContext : {};
}

export async function trackFunnelEvent(name: FunnelEventName, metadata: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  rememberAttributionContext();
  const attribution = getAttributionContext();
  const payload: FunnelEventPayload = {
    event_name: name,
    timestamp: new Date().toISOString(),
    anonymous_id: ensureStorageId(ANONYMOUS_ID_KEY),
    session_id: ensureStorageId(SESSION_ID_KEY),
    route: window.location.pathname,
    referrer: attribution.referrer ?? document.referrer ?? null,
    source: attribution.source ?? null,
    campaign: attribution.campaign ?? null,
    medium: attribution.medium ?? null,
    term: attribution.term ?? null,
    content: attribution.content ?? null,
    metadata,
  };

  const win = window as Window & { dataLayer?: Array<Record<string, unknown>> };
  win.dataLayer = win.dataLayer ?? [];
  win.dataLayer.push({ event: `funnel_${name}`, ...metadata });

  void apiClient("/analytics/events", {
    method: "POST",
    body: payload,
    skipAuth: true,
    retryOnUnauthorized: false,
  }).catch(() => undefined);
}
