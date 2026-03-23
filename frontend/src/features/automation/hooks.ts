"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { ApiError } from "@/lib/api/errors";
import {
  acceptSuggestion,
  archiveAutomationRule,
  createAutomationRule,
  generateBankTransactionSuggestions,
  generateCodingSuggestions,
  getAIJob,
  getAutomationRule,
  getDocumentIntelligenceJob,
  getDocumentIntelligenceJobResult,
  getSuggestion,
  listAIJobs,
  listAutomationRules,
  listBankTransactionSuggestions,
  listCodingSuggestions,
  listDocumentIntelligenceJobs,
  listSuggestions,
  listSuggestionsForEntity,
  rejectSuggestion,
  runDocumentExtraction,
  testAutomationRule,
  updateAutomationRule,
} from "@/features/automation/api";
import type { AutomationRuleMutationPayload, CodingSuggestionRequest, DocumentExtractionPayload } from "@/features/automation/types";

function invalidateAutomationRoot(queryClient: ReturnType<typeof useQueryClient>, organizationId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.automation.root(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.automation.rulesRoot(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.automation.suggestionsRoot(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.automation.documentJobsRoot(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.automation.aiJobsRoot(organizationId) }),
  ]);
}

export function useAutomationRules(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.automation.rules(organizationId) : ["automation", "rules", "missing"],
    queryFn: () => listAutomationRules(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useAutomationRule(organizationId?: string, ruleId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && ruleId ? queryKeys.automation.rule(organizationId, ruleId) : ["automation", "rule", "missing"],
    queryFn: () => getAutomationRule(organizationId as string, ruleId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(ruleId),
  });
}

export function useCreateAutomationRule(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AutomationRuleMutationPayload) => createAutomationRule(organizationId as string, payload),
    onSuccess: async (rule) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.automation.rule(organizationId, rule.id), rule);
      await invalidateAutomationRoot(queryClient, organizationId);
    },
  });
}

export function useUpdateAutomationRule(organizationId?: string, ruleId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AutomationRuleMutationPayload>) => updateAutomationRule(organizationId as string, ruleId as string, payload),
    onSuccess: async (rule) => {
      if (!organizationId || !ruleId) return;
      queryClient.setQueryData(queryKeys.automation.rule(organizationId, ruleId), rule);
      await invalidateAutomationRoot(queryClient, organizationId);
    },
  });
}

export function useArchiveAutomationRule(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => archiveAutomationRule(organizationId as string, ruleId),
    onSuccess: async () => {
      if (!organizationId) return;
      await invalidateAutomationRoot(queryClient, organizationId);
    },
  });
}

export function useTestAutomationRule(organizationId?: string, ruleId?: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => testAutomationRule(organizationId as string, ruleId as string, payload),
  });
}

export function useSuggestions(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.automation.suggestions(organizationId) : ["automation", "suggestions", "missing"],
    queryFn: () => listSuggestions(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useSuggestion(organizationId?: string, suggestionId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && suggestionId ? queryKeys.automation.suggestion(organizationId, suggestionId) : ["automation", "suggestion", "missing"],
    queryFn: () => getSuggestion(organizationId as string, suggestionId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(suggestionId),
  });
}

export function useSuggestionsForEntity(organizationId?: string, entityType?: string, entityId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && entityType && entityId ? queryKeys.automation.suggestionsForEntity(organizationId, entityType, entityId) : ["automation", "entity-suggestions", "missing"],
    queryFn: () => listSuggestionsForEntity(organizationId as string, entityType as string, entityId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(entityType) && Boolean(entityId),
  });
}

export function useAcceptSuggestion(organizationId?: string, suggestionId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => acceptSuggestion(organizationId as string, suggestionId as string),
    onSuccess: async (suggestion) => {
      if (!organizationId || !suggestionId) return;
      queryClient.setQueryData(queryKeys.automation.suggestion(organizationId, suggestionId), suggestion);
      await invalidateAutomationRoot(queryClient, organizationId);
    },
  });
}

export function useRejectSuggestion(organizationId?: string, suggestionId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rejectSuggestion(organizationId as string, suggestionId as string),
    onSuccess: async (suggestion) => {
      if (!organizationId || !suggestionId) return;
      queryClient.setQueryData(queryKeys.automation.suggestion(organizationId, suggestionId), suggestion);
      await invalidateAutomationRoot(queryClient, organizationId);
    },
  });
}

export function useDocumentIntelligenceJobs(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.automation.documentJobs(organizationId) : ["automation", "document-jobs", "missing"],
    queryFn: () => listDocumentIntelligenceJobs(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useDocumentIntelligenceJob(organizationId?: string, jobId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && jobId ? queryKeys.automation.documentJob(organizationId, jobId) : ["automation", "document-job", "missing"],
    queryFn: async () => {
      const job = await getDocumentIntelligenceJob(organizationId as string, jobId as string);
      if (!jobId) return { job, result: null };
      try {
        const result = await getDocumentIntelligenceJobResult(organizationId as string, jobId);
        return { job, result };
      } catch (error) {
        if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
          return { job, result: null };
        }
        throw error;
      }
    },
    enabled: enabled && Boolean(organizationId) && Boolean(jobId),
  });
}

export function useRunDocumentExtraction(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DocumentExtractionPayload) => runDocumentExtraction(organizationId as string, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await invalidateAutomationRoot(queryClient, organizationId);
    },
  });
}

export function useBankTransactionSuggestions(organizationId?: string, bankTransactionId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && bankTransactionId ? queryKeys.automation.bankTransactionSuggestions(organizationId, bankTransactionId) : ["automation", "bank-suggestions", "missing"],
    queryFn: () => listBankTransactionSuggestions(organizationId as string, bankTransactionId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(bankTransactionId),
  });
}

export function useGenerateBankTransactionSuggestions(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bankTransactionId: string) => generateBankTransactionSuggestions(organizationId as string, bankTransactionId),
    onSuccess: async (suggestions, bankTransactionId) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.automation.bankTransactionSuggestions(organizationId, bankTransactionId), suggestions);
      await invalidateAutomationRoot(queryClient, organizationId);
    },
  });
}

export function useCodingSuggestions(organizationId?: string, payload?: CodingSuggestionRequest, enabled = true) {
  return useQuery({
    queryKey: organizationId && payload ? queryKeys.automation.codingSuggestions(organizationId, payload.entity_type, payload.entity_id) : ["automation", "coding-suggestions", "missing"],
    queryFn: () => listCodingSuggestions(organizationId as string, payload as CodingSuggestionRequest),
    enabled: enabled && Boolean(organizationId) && Boolean(payload?.entity_type) && Boolean(payload?.entity_id),
  });
}

export function useGenerateCodingSuggestions(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CodingSuggestionRequest) => generateCodingSuggestions(organizationId as string, payload),
    onSuccess: async (suggestions, payload) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.automation.codingSuggestions(organizationId, payload.entity_type, payload.entity_id), suggestions);
      await invalidateAutomationRoot(queryClient, organizationId);
    },
  });
}

export function useAIJobs(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.automation.aiJobs(organizationId) : ["automation", "ai-jobs", "missing"],
    queryFn: () => listAIJobs(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useAIJob(organizationId?: string, jobId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && jobId ? queryKeys.automation.aiJob(organizationId, jobId) : ["automation", "ai-job", "missing"],
    queryFn: () => getAIJob(organizationId as string, jobId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(jobId),
  });
}
