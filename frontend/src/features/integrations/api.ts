import { apiClient } from "@/lib/api/client";
import type { ExternalSourceAccount, ImportSummary, IntegrationConnection, IntegrationProvider, IntegrationSyncRun } from "@/features/integrations/types";

export function fetchIntegrationProviders(organizationId: string) {
  return apiClient<IntegrationProvider[]>(`/organizations/${organizationId}/integrations/providers`);
}

export function fetchIntegrationConnections(organizationId: string) {
  return apiClient<IntegrationConnection[]>(`/organizations/${organizationId}/integrations/connections`);
}

export function startIntegrationConnection(organizationId: string, payload: { provider_id: string }) {
  return apiClient<{ provider_id: string; connection_context: Record<string, unknown> }>(`/organizations/${organizationId}/integrations/connect/start`, { method: "POST", body: payload });
}

export function completeIntegrationConnection(organizationId: string, payload: { provider_id: string; display_name: string; auth_payload?: Record<string, unknown> }) {
  return apiClient<IntegrationConnection>(`/organizations/${organizationId}/integrations/connect/complete`, { method: "POST", body: payload });
}

export function createIntegrationConnection(organizationId: string, payload: { provider_key: string; display_name: string; connection_mode?: string; config?: Record<string, unknown>; secret_ref?: string }) {
  return apiClient<IntegrationConnection>(`/organizations/${organizationId}/integrations/connections`, { method: "POST", body: payload });
}

export function fetchSourceAccounts(organizationId: string, connectionId: string) {
  return apiClient<{ accounts: ExternalSourceAccount[] }>(`/organizations/${organizationId}/integrations/${connectionId}/source-accounts`);
}

export function mapExternalAccount(organizationId: string, connectionId: string, payload: { external_account_id: string; bank_account_id: string }) {
  return apiClient<{ mapping_id: string }>(`/organizations/${organizationId}/integrations/${connectionId}/map-account`, { method: "POST", body: payload });
}

export function triggerIntegrationSync(organizationId: string, connectionId: string, direction: "pull" | "push" | "bidirectional" = "pull") {
  return apiClient<IntegrationSyncRun>(`/organizations/${organizationId}/integrations/connections/${connectionId}/sync`, { method: "POST", body: { direction } });
}

export function fetchIntegrationSyncRuns(organizationId: string, connectionId: string) {
  return apiClient<IntegrationSyncRun[]>(`/organizations/${organizationId}/integrations/connections/${connectionId}/sync-runs`);
}

export function importBankStatement(organizationId: string, payload: { bank_account_id: string; source_filename: string; rows?: Array<{ transaction_date: string; description: string; amount: number; reference?: string | null; balance?: number | null }>; csv_content?: string; field_mapping?: Record<string, string>; connection_id?: string; external_account_id?: string }) {
  return apiClient<ImportSummary>(`/organizations/${organizationId}/integrations/import/bank-statement`, { method: "POST", body: payload });
}

export function disconnectIntegration(organizationId: string, connectionId: string) {
  return apiClient<{ message: string }>(`/organizations/${organizationId}/integrations/connections/${connectionId}`, { method: "DELETE" });
}
