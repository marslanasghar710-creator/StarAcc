import { apiClient } from "@/lib/api/client";

import type {
  AddGroupEntityPayload,
  ConsolidatedBalanceSheet,
  ConsolidatedIncomeStatement,
  ConsolidatedTrialBalance,
  ConsolidationRun,
  CreateEliminationPayload,
  CreateGroupPayload,
  EliminationEntry,
  Group,
  GroupEntity,
  RunConsolidationPayload,
} from "@/features/consolidation/types";

export async function listGroups(organizationId: string) {
  const response = await apiClient<{ items: Group[] }>(`/organizations/${organizationId}/groups`);
  return response.items;
}

export async function getGroup(organizationId: string, groupId: string) {
  return apiClient<Group>(`/organizations/${organizationId}/groups/${groupId}`);
}

export async function createGroup(organizationId: string, payload: CreateGroupPayload) {
  return apiClient<Group>(`/organizations/${organizationId}/groups`, { method: "POST", body: payload });
}

export async function listGroupEntities(groupId: string) {
  return apiClient<GroupEntity[]>(`/groups/${groupId}/entities`);
}

export async function addGroupEntity(groupId: string, payload: AddGroupEntityPayload) {
  return apiClient<GroupEntity>(`/groups/${groupId}/entities`, { method: "POST", body: payload });
}

export async function removeGroupEntity(groupId: string, entityId: string) {
  return apiClient<void>(`/groups/${groupId}/entities/${entityId}`, { method: "DELETE" });
}

export async function runConsolidation(groupId: string, payload: RunConsolidationPayload) {
  return apiClient<ConsolidationRun>(`/groups/${groupId}/consolidations/run`, { method: "POST", body: payload });
}

export async function listConsolidationRuns(groupId: string) {
  const response = await apiClient<{ items: ConsolidationRun[] }>(`/groups/${groupId}/consolidations`);
  return response.items;
}

export async function getConsolidationRun(groupId: string, runId: string) {
  return apiClient<ConsolidationRun>(`/groups/${groupId}/consolidations/${runId}`);
}

export async function listEliminations(groupId: string) {
  const response = await apiClient<{ items: EliminationEntry[] }>(`/groups/${groupId}/eliminations`);
  return response.items;
}

export async function createElimination(groupId: string, payload: CreateEliminationPayload) {
  return apiClient<EliminationEntry>(`/groups/${groupId}/eliminations`, { method: "POST", body: payload });
}

export async function getConsolidatedBalanceSheet(groupId: string, runId: string) {
  return apiClient<ConsolidatedBalanceSheet>(`/groups/${groupId}/reports/balance-sheet?run_id=${runId}`);
}

export async function getConsolidatedIncomeStatement(groupId: string, runId: string) {
  return apiClient<ConsolidatedIncomeStatement>(`/groups/${groupId}/reports/income-statement?run_id=${runId}`);
}

export async function getConsolidatedTrialBalance(groupId: string, runId: string) {
  return apiClient<ConsolidatedTrialBalance>(`/groups/${groupId}/reports/trial-balance?run_id=${runId}`);
}
