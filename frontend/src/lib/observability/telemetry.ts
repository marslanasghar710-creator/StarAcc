import { apiClient } from "@/lib/api/client";

export async function recordObservabilityEvent(
  organizationId: string,
  eventType: string,
  domain: "dashboard" | "activation" | "integrations" | "billing" | "reporting" | "api" = "api",
  metadata: Record<string, unknown> = {},
) {
  const eventId = `${eventType}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  return apiClient(`/organizations/${organizationId}/observability/telemetry`, {
    method: "POST",
    body: {
      event: {
        event_id: eventId,
        occurred_at: new Date().toISOString(),
        domain,
        event_type: eventType,
        severity: "info",
        environment: process.env.NODE_ENV === "production" ? "production" : process.env.NODE_ENV === "test" ? "staging" : "development",
        route: typeof window === "undefined" ? null : window.location.pathname,
        status: "success",
        metadata,
      },
    },
  });
}
