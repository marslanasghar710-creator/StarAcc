import { apiClient } from "@/lib/api/client";
import type { IntegrationConnection, IntegrationProvider, IntegrationSyncRun } from "@/features/integrations/types";

export function fetchIntegrationProviders(organizationId: string) {
  return apiClient<IntegrationProvider[]>(`/organizations/${organizationId}/integrations/providers`);
}

export function fetchIntegrationConnections(organizationId: string) {
  return apiClient<IntegrationConnection[]>(`/organizations/${organizationId}/integrations/connections`);
}

export function createIntegrationConnection(organizationId: string, payload: { provider_key: string; display_name: string; connection_mode?: string; config?: Record<string, unknown>; secret_ref?: string }) {
  return apiClient<IntegrationConnection>(`/organizations/${organizationId}/integrations/connections`, { method: "POST", body: payload });
}

export function triggerIntegrationSync(organizationId: string, connectionId: string, direction: "pull" | "push" | "bidirectional" = "pull") {
  return apiClient<IntegrationSyncRun>(`/organizations/${organizationId}/integrations/connections/${connectionId}/sync`, { method: "POST", body: { direction } });
}

export function fetchIntegrationSyncRuns(organizationId: string, connectionId: string) {
  return apiClient<IntegrationSyncRun[]>(`/organizations/${organizationId}/integrations/connections/${connectionId}/sync-runs`);
}
