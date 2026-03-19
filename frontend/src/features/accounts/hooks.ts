"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { archiveAccount, createAccount, getAccount, getAccountBalance, getAccountLedger, listAccounts, searchAccounts, updateAccount } from "@/features/accounts/api";
import type { AccountMutationPayload } from "@/features/accounts/types";

export function useAccounts(organizationId?: string, search?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.accounts.list(organizationId, search ?? "") : ["accounts", "missing", "list"],
    queryFn: () => (search ? searchAccounts(organizationId as string, search) : listAccounts(organizationId as string)),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useAccount(organizationId?: string, accountId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && accountId ? queryKeys.accounts.detail(organizationId, accountId) : ["accounts", "missing", "detail"],
    queryFn: () => getAccount(organizationId as string, accountId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(accountId),
  });
}

export function useAccountBalance(organizationId?: string, accountId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && accountId ? queryKeys.accounts.balance(organizationId, accountId) : ["accounts", "missing", "balance"],
    queryFn: () => getAccountBalance(organizationId as string, accountId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(accountId),
  });
}

export function useAccountLedger(organizationId?: string, accountId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && accountId ? queryKeys.accounts.ledger(organizationId, accountId) : ["accounts", "missing", "ledger"],
    queryFn: () => getAccountLedger(organizationId as string, accountId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(accountId),
  });
}

export function useCreateAccount(organizationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AccountMutationPayload) => createAccount(organizationId as string, payload),
    onSuccess: async (account) => {
      if (!organizationId) {
        return;
      }

      queryClient.setQueryData(queryKeys.accounts.detail(organizationId, account.id), account);
      await queryClient.invalidateQueries({ queryKey: queryKeys.accounts.root(organizationId) });
    },
  });
}

export function useUpdateAccount(organizationId?: string, accountId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<AccountMutationPayload>) => updateAccount(organizationId as string, accountId as string, payload),
    onSuccess: async (account) => {
      if (!organizationId) {
        return;
      }

      queryClient.setQueryData(queryKeys.accounts.detail(organizationId, account.id), account);
      await queryClient.invalidateQueries({ queryKey: queryKeys.accounts.root(organizationId) });
    },
  });
}

export function useArchiveAccount(organizationId?: string, accountId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => archiveAccount(organizationId as string, accountId as string),
    onSuccess: async () => {
      if (!organizationId || !accountId) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts.root(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts.detail(organizationId, accountId) }),
      ]);
    },
  });
}
