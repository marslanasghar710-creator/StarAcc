"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import {
  addGroupEntity,
  createElimination,
  createGroup,
  getConsolidatedBalanceSheet,
  getConsolidatedIncomeStatement,
  getConsolidatedTrialBalance,
  getConsolidationRun,
  getGroup,
  listConsolidationRuns,
  listEliminations,
  listGroupEntities,
  listGroups,
  removeGroupEntity,
  runConsolidation,
} from "@/features/consolidation/api";
import type {
  AddGroupEntityPayload,
  CreateEliminationPayload,
  CreateGroupPayload,
  RunConsolidationPayload,
} from "@/features/consolidation/types";

export function useGroups(organizationId?: string) {
  return useQuery({
    queryKey: organizationId ? queryKeys.consolidation.groups(organizationId) : ["consolidation", "missing", "groups"],
    queryFn: () => listGroups(organizationId as string),
    enabled: Boolean(organizationId),
  });
}

export function useGroup(organizationId?: string, groupId?: string) {
  return useQuery({
    queryKey: organizationId && groupId ? queryKeys.consolidation.group(organizationId, groupId) : ["consolidation", "missing", "group"],
    queryFn: () => getGroup(organizationId as string, groupId as string),
    enabled: Boolean(organizationId && groupId),
  });
}

export function useCreateGroup(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGroupPayload) => createGroup(organizationId as string, payload),
    onSuccess: async () => {
      if (organizationId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.consolidation.groups(organizationId) });
      }
    },
  });
}

export function useGroupEntities(groupId?: string) {
  return useQuery({
    queryKey: groupId ? queryKeys.consolidation.groupEntities(groupId) : ["consolidation", "missing", "entities"],
    queryFn: () => listGroupEntities(groupId as string),
    enabled: Boolean(groupId),
  });
}

export function useAddGroupEntity(groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddGroupEntityPayload) => addGroupEntity(groupId as string, payload),
    onSuccess: async () => {
      if (groupId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.consolidation.groupEntities(groupId) });
      }
    },
  });
}

export function useRemoveGroupEntity(groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entityId: string) => removeGroupEntity(groupId as string, entityId),
    onSuccess: async () => {
      if (groupId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.consolidation.groupEntities(groupId) });
      }
    },
  });
}

export function useRunConsolidation(groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RunConsolidationPayload) => runConsolidation(groupId as string, payload),
    onSuccess: async (run) => {
      if (groupId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.consolidation.runs(groupId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.consolidation.eliminations(groupId) }),
        ]);
        await queryClient.setQueryData(queryKeys.consolidation.run(groupId, run.id), run);
      }
    },
  });
}

export function useConsolidationRuns(groupId?: string) {
  return useQuery({
    queryKey: groupId ? queryKeys.consolidation.runs(groupId) : ["consolidation", "missing", "runs"],
    queryFn: () => listConsolidationRuns(groupId as string),
    enabled: Boolean(groupId),
  });
}

export function useConsolidationRun(groupId?: string, runId?: string) {
  return useQuery({
    queryKey: groupId && runId ? queryKeys.consolidation.run(groupId, runId) : ["consolidation", "missing", "run"],
    queryFn: () => getConsolidationRun(groupId as string, runId as string),
    enabled: Boolean(groupId && runId),
  });
}

export function useEliminations(groupId?: string) {
  return useQuery({
    queryKey: groupId ? queryKeys.consolidation.eliminations(groupId) : ["consolidation", "missing", "eliminations"],
    queryFn: () => listEliminations(groupId as string),
    enabled: Boolean(groupId),
  });
}

export function useCreateElimination(groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEliminationPayload) => createElimination(groupId as string, payload),
    onSuccess: async () => {
      if (groupId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.consolidation.eliminations(groupId) });
      }
    },
  });
}

export function useConsolidatedBalanceSheet(groupId?: string, runId?: string) {
  return useQuery({
    queryKey: groupId && runId ? queryKeys.consolidation.balanceSheet(groupId, runId) : ["consolidation", "missing", "balance-sheet"],
    queryFn: () => getConsolidatedBalanceSheet(groupId as string, runId as string),
    enabled: Boolean(groupId && runId),
  });
}

export function useConsolidatedIncomeStatement(groupId?: string, runId?: string) {
  return useQuery({
    queryKey: groupId && runId ? queryKeys.consolidation.incomeStatement(groupId, runId) : ["consolidation", "missing", "income-statement"],
    queryFn: () => getConsolidatedIncomeStatement(groupId as string, runId as string),
    enabled: Boolean(groupId && runId),
  });
}

export function useConsolidatedTrialBalance(groupId?: string, runId?: string) {
  return useQuery({
    queryKey: groupId && runId ? queryKeys.consolidation.trialBalance(groupId, runId) : ["consolidation", "missing", "trial-balance"],
    queryFn: () => getConsolidatedTrialBalance(groupId as string, runId as string),
    enabled: Boolean(groupId && runId),
  });
}
