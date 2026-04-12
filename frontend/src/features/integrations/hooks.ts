import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import {
  completeIntegrationConnection,
  createIntegrationConnection,
  disconnectIntegration,
  fetchIntegrationConnections,
  fetchIntegrationProviders,
  fetchIntegrationSyncRuns,
  fetchSourceAccounts,
  importBankStatement,
  mapExternalAccount,
  startIntegrationConnection,
  triggerIntegrationSync,
} from "@/features/integrations/api";

export function useIntegrationProviders(organizationId?: string) {
  return useQuery({
    queryKey: organizationId ? queryKeys.integrations.providers(organizationId) : ["integrations", "missing", "providers"],
    queryFn: () => fetchIntegrationProviders(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useIntegrationConnections(organizationId?: string) {
  return useQuery({
    queryKey: organizationId ? queryKeys.integrations.connections(organizationId) : ["integrations", "missing", "connections"],
    queryFn: () => fetchIntegrationConnections(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useStartIntegrationConnection(organizationId?: string) {
  return useMutation({ mutationFn: (payload: { provider_id: string }) => startIntegrationConnection(organizationId!, payload) });
}

export function useCompleteIntegrationConnection(organizationId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { provider_id: string; display_name: string; auth_payload?: Record<string, unknown> }) => completeIntegrationConnection(organizationId!, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await qc.invalidateQueries({ queryKey: queryKeys.integrations.connections(organizationId) });
    },
  });
}

export function useCreateIntegrationConnection(organizationId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { provider_key: string; display_name: string; connection_mode?: string; config?: Record<string, unknown>; secret_ref?: string }) => createIntegrationConnection(organizationId!, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await qc.invalidateQueries({ queryKey: queryKeys.integrations.connections(organizationId) });
    },
  });
}

export function useSourceAccounts(organizationId?: string, connectionId?: string) {
  return useQuery({
    queryKey: ["integrations", organizationId, connectionId, "source-accounts"],
    queryFn: () => fetchSourceAccounts(organizationId!, connectionId!),
    enabled: Boolean(organizationId && connectionId),
  });
}

export function useMapExternalAccount(organizationId?: string, connectionId?: string) {
  return useMutation({ mutationFn: (payload: { external_account_id: string; bank_account_id: string }) => mapExternalAccount(organizationId!, connectionId!, payload) });
}

export function useImportBankStatement(organizationId?: string) {
  return useMutation({
    mutationFn: (payload: { bank_account_id: string; source_filename: string; rows?: Array<{ transaction_date: string; description: string; amount: number; reference?: string | null; balance?: number | null }>; csv_content?: string; field_mapping?: Record<string, string>; connection_id?: string; external_account_id?: string }) => importBankStatement(organizationId!, payload),
  });
}

export function useDisconnectIntegration(organizationId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => disconnectIntegration(organizationId!, connectionId),
    onSuccess: async () => {
      if (!organizationId) return;
      await qc.invalidateQueries({ queryKey: queryKeys.integrations.connections(organizationId) });
    },
  });
}

export function useTriggerIntegrationSync(organizationId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ connectionId, direction }: { connectionId: string; direction?: "pull" | "push" | "bidirectional" }) => triggerIntegrationSync(organizationId!, connectionId, direction),
    onSuccess: async (_, variables) => {
      if (!organizationId) return;
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.integrations.connections(organizationId) }),
        qc.invalidateQueries({ queryKey: queryKeys.integrations.syncRuns(organizationId, variables.connectionId) }),
      ]);
    },
  });
}

export function useIntegrationSyncRuns(organizationId?: string, connectionId?: string) {
  return useQuery({
    queryKey: organizationId && connectionId ? queryKeys.integrations.syncRuns(organizationId, connectionId) : ["integrations", "missing", "sync-runs"],
    queryFn: () => fetchIntegrationSyncRuns(organizationId!, connectionId!),
    enabled: Boolean(organizationId && connectionId),
  });
}
