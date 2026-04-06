import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { createIntegrationConnection, fetchIntegrationConnections, fetchIntegrationProviders, fetchIntegrationSyncRuns, triggerIntegrationSync } from "@/features/integrations/api";

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
