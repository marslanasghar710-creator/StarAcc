"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import {
  archiveBankAccount,
  archiveBankRule,
  createBankAccount,
  createBankImport,
  createBankRule,
  getBankAccount,
  getBankAccountRegister,
  getBankAccountSummary,
  getBankImport,
  getBankTransaction,
  getBankTransactionSuggestions,
  getCashbook,
  getReconciliation,
  getReconciliationSummary,
  getBankRule,
  ignoreBankTransaction,
  listBankAccounts,
  listBankImportTransactions,
  listBankImports,
  listBankRules,
  listBankTransactions,
  listCustomerPaymentsForBanking,
  listReconciledBankTransactions,
  listReconciliations,
  listSupplierPaymentsForBanking,
  listUnreconciledBankTransactions,
  reconcileCashCode,
  reconcileMatchCustomerPayment,
  reconcileMatchJournal,
  reconcileMatchSupplierPayment,
  reconcileTransfer,
  testBankRule,
  unreconcileBankTransaction,
  updateBankAccount,
  updateBankRule,
} from "@/features/banking/api";
import type { BankAccountMutationPayload, BankImportMutationPayload, BankRuleMutationPayload } from "@/features/banking/types";

export function useBankAccounts(organizationId?: string, search?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.banking.bankAccounts(organizationId, search ?? "") : ["bank-accounts", "missing", "list"],
    queryFn: () => listBankAccounts(organizationId as string, search),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useBankAccount(organizationId?: string, bankAccountId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && bankAccountId ? queryKeys.banking.bankAccount(organizationId, bankAccountId) : ["bank-accounts", "missing", "detail"],
    queryFn: () => getBankAccount(organizationId as string, bankAccountId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(bankAccountId),
  });
}

export function useBankAccountSummary(organizationId?: string, bankAccountId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && bankAccountId ? queryKeys.banking.bankAccountSummary(organizationId, bankAccountId) : ["bank-accounts", "missing", "summary"],
    queryFn: () => getBankAccountSummary(organizationId as string, bankAccountId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(bankAccountId),
  });
}

export function useBankAccountRegister(organizationId?: string, bankAccountId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && bankAccountId ? queryKeys.banking.bankAccountRegister(organizationId, bankAccountId) : ["bank-accounts", "missing", "register"],
    queryFn: () => getBankAccountRegister(organizationId as string, bankAccountId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(bankAccountId),
  });
}

export function useBankImports(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.banking.bankImports(organizationId) : ["bank-imports", "missing", "list"],
    queryFn: () => listBankImports(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useBankImport(organizationId?: string, importId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && importId ? queryKeys.banking.bankImport(organizationId, importId) : ["bank-imports", "missing", "detail"],
    queryFn: () => getBankImport(organizationId as string, importId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(importId),
  });
}

export function useBankImportTransactions(organizationId?: string, importId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && importId ? queryKeys.banking.bankImportTransactions(organizationId, importId) : ["bank-imports", "missing", "transactions"],
    queryFn: () => listBankImportTransactions(organizationId as string, importId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(importId),
  });
}

export function useBankTransactions(organizationId?: string, search?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.banking.bankTransactions(organizationId, search ?? "") : ["bank-transactions", "missing", "list"],
    queryFn: () => listBankTransactions(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useUnreconciledBankTransactions(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? ["bank-transactions", organizationId, "unreconciled"] : ["bank-transactions", "missing", "unreconciled"],
    queryFn: () => listUnreconciledBankTransactions(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useReconciledBankTransactions(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? ["bank-transactions", organizationId, "reconciled"] : ["bank-transactions", "missing", "reconciled"],
    queryFn: () => listReconciledBankTransactions(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useBankTransaction(organizationId?: string, transactionId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && transactionId ? queryKeys.banking.bankTransaction(organizationId, transactionId) : ["bank-transactions", "missing", "detail"],
    queryFn: () => getBankTransaction(organizationId as string, transactionId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(transactionId),
  });
}

export function useBankTransactionSuggestions(organizationId?: string, transactionId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && transactionId ? queryKeys.banking.bankTransactionSuggestions(organizationId, transactionId) : ["bank-transactions", "missing", "suggestions"],
    queryFn: () => getBankTransactionSuggestions(organizationId as string, transactionId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(transactionId),
  });
}


export function useCustomerPaymentsForBanking(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? ["customer-payments", organizationId, "banking"] : ["customer-payments", "missing", "banking"],
    queryFn: () => listCustomerPaymentsForBanking(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useSupplierPaymentsForBanking(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? ["supplier-payments", organizationId, "banking"] : ["supplier-payments", "missing", "banking"],
    queryFn: () => listSupplierPaymentsForBanking(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}
export function useReconciliations(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.banking.reconciliations(organizationId) : ["reconciliations", "missing", "list"],
    queryFn: () => listReconciliations(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useReconciliation(organizationId?: string, reconciliationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && reconciliationId ? queryKeys.banking.reconciliation(organizationId, reconciliationId) : ["reconciliations", "missing", "detail"],
    queryFn: () => getReconciliation(organizationId as string, reconciliationId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(reconciliationId),
  });
}

export function useBankRules(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.banking.bankRules(organizationId) : ["bank-rules", "missing", "list"],
    queryFn: () => listBankRules(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useBankRule(organizationId?: string, ruleId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && ruleId ? queryKeys.banking.bankRule(organizationId, ruleId) : ["bank-rules", "missing", "detail"],
    queryFn: () => getBankRule(organizationId as string, ruleId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(ruleId),
  });
}

export function useCashbook(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.banking.cashbook(organizationId) : ["cashbook", "missing"],
    queryFn: () => getCashbook(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useReconciliationSummary(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.banking.reconciliationSummary(organizationId) : ["reconciliation-summary", "missing"],
    queryFn: () => getReconciliationSummary(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

function invalidateBankingOverview(queryClient: ReturnType<typeof useQueryClient>, organizationId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.banking.bankAccountsRoot(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.banking.bankTransactionsRoot(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.banking.bankImports(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.banking.cashbook(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.banking.reconciliationSummary(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.banking.reconciliations(organizationId) }),
  ]);
}

export function useCreateBankAccount(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BankAccountMutationPayload) => createBankAccount(organizationId as string, payload),
    onSuccess: async (bankAccount) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.banking.bankAccount(organizationId, bankAccount.id), bankAccount);
      await invalidateBankingOverview(queryClient, organizationId);
    },
  });
}

export function useUpdateBankAccount(organizationId?: string, bankAccountId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<BankAccountMutationPayload>) => updateBankAccount(organizationId as string, bankAccountId as string, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await invalidateBankingOverview(queryClient, organizationId);
    },
  });
}

export function useArchiveBankAccount(organizationId?: string, bankAccountId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archiveBankAccount(organizationId as string, bankAccountId as string),
    onSuccess: async () => {
      if (!organizationId) return;
      await invalidateBankingOverview(queryClient, organizationId);
    },
  });
}

export function useCreateBankImport(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BankImportMutationPayload) => createBankImport(organizationId as string, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await invalidateBankingOverview(queryClient, organizationId);
    },
  });
}

function invalidateTransaction(queryClient: ReturnType<typeof useQueryClient>, organizationId: string, transactionId: string) {
  return Promise.all([
    invalidateBankingOverview(queryClient, organizationId),
    queryClient.invalidateQueries({ queryKey: queryKeys.banking.bankTransaction(organizationId, transactionId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.banking.bankTransactionSuggestions(organizationId, transactionId) }),
  ]);
}

export function useIgnoreBankTransaction(organizationId?: string, transactionId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => ignoreBankTransaction(organizationId as string, transactionId as string, reason),
    onSuccess: async () => {
      if (!organizationId || !transactionId) return;
      await invalidateTransaction(queryClient, organizationId, transactionId);
    },
  });
}

export function useUnreconcileBankTransaction(organizationId?: string, transactionId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => unreconcileBankTransaction(organizationId as string, transactionId as string, reason),
    onSuccess: async () => {
      if (!organizationId || !transactionId) return;
      await invalidateTransaction(queryClient, organizationId, transactionId);
    },
  });
}

function reconciliationMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>, organizationId?: string, transactionId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      if (!organizationId || !transactionId) return;
      await invalidateTransaction(queryClient, organizationId, transactionId);
    },
  });
}

export function useMatchCustomerPaymentReconciliation(organizationId?: string, transactionId?: string) {
  return reconciliationMutation((customerPaymentId: string) => reconcileMatchCustomerPayment(organizationId as string, transactionId as string, customerPaymentId), organizationId, transactionId);
}

export function useMatchSupplierPaymentReconciliation(organizationId?: string, transactionId?: string) {
  return reconciliationMutation((supplierPaymentId: string) => reconcileMatchSupplierPayment(organizationId as string, transactionId as string, supplierPaymentId), organizationId, transactionId);
}

export function useMatchJournalReconciliation(organizationId?: string, transactionId?: string) {
  return reconciliationMutation((journalId: string) => reconcileMatchJournal(organizationId as string, transactionId as string, journalId), organizationId, transactionId);
}

export function useCashCodeReconciliation(organizationId?: string, transactionId?: string) {
  return reconciliationMutation((payload: Record<string, unknown>) => reconcileCashCode(organizationId as string, transactionId as string, payload), organizationId, transactionId);
}

export function useTransferReconciliation(organizationId?: string, transactionId?: string) {
  return reconciliationMutation((payload: Record<string, unknown>) => reconcileTransfer(organizationId as string, transactionId as string, payload), organizationId, transactionId);
}

export function useCreateBankRule(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BankRuleMutationPayload) => createBankRule(organizationId as string, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.banking.bankRules(organizationId) });
    },
  });
}

export function useUpdateBankRule(organizationId?: string, ruleId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<BankRuleMutationPayload>) => updateBankRule(organizationId as string, ruleId as string, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.banking.bankRules(organizationId) });
    },
  });
}

export function useArchiveBankRule(organizationId?: string, ruleId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetRuleId?: string) => archiveBankRule(organizationId as string, (targetRuleId ?? ruleId) as string),
    onSuccess: async () => {
      if (!organizationId) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.banking.bankRules(organizationId) });
    },
  });
}

export function useTestBankRule(organizationId?: string, ruleId?: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => testBankRule(organizationId as string, ruleId as string, payload),
  });
}
