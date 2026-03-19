import { apiClient } from "@/lib/api/client";
import { sanitizeDecimalInput } from "@/lib/accounting/decimal";

import type { Account, AccountBalance, AccountLedgerLine, AccountMutationPayload, RawAccount, RawAccountLedgerLine } from "@/features/accounts/types";

function adaptAccount(raw: RawAccount): Account {
  return {
    id: raw.id,
    organizationId: raw.organization_id ?? raw.organizationId,
    code: raw.code,
    name: raw.name,
    description: raw.description ?? null,
    accountType: raw.account_type ?? raw.accountType ?? "asset",
    accountSubtype: raw.account_subtype ?? raw.accountSubtype ?? null,
    normalBalance: raw.normal_balance ?? raw.normalBalance ?? "debit",
    parentAccountId: raw.parent_account_id ?? raw.parentAccountId ?? null,
    currencyCode: raw.currency_code ?? raw.currencyCode ?? null,
    isActive: raw.is_active ?? raw.isActive ?? true,
    isPostable: raw.is_postable ?? raw.isPostable ?? true,
    isSystem: raw.is_system ?? raw.isSystem ?? false,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
  };
}

function adaptLedgerLine(raw: RawAccountLedgerLine): AccountLedgerLine {
  return {
    journalId: raw.journal_id ?? raw.journalId ?? "",
    entryNumber: raw.entry_number ?? raw.entryNumber ?? "",
    entryDate: raw.entry_date ?? raw.entryDate ?? "",
    description: raw.description ?? null,
    debitAmount: sanitizeDecimalInput(raw.debit_amount ?? raw.debitAmount ?? 0),
    creditAmount: sanitizeDecimalInput(raw.credit_amount ?? raw.creditAmount ?? 0),
  };
}

export async function listAccounts(organizationId: string, search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const response = await apiClient<{ items: RawAccount[] }>(`/organizations/${organizationId}/accounts${query}`);
  return response.items.map(adaptAccount);
}

export async function searchAccounts(organizationId: string, query: string) {
  const response = await apiClient<{ items: RawAccount[] }>(`/organizations/${organizationId}/accounts/search?q=${encodeURIComponent(query)}`);
  return response.items.map(adaptAccount);
}

export async function getAccount(organizationId: string, accountId: string) {
  const response = await apiClient<RawAccount>(`/organizations/${organizationId}/accounts/${accountId}`);
  return adaptAccount(response);
}

export async function createAccount(organizationId: string, payload: AccountMutationPayload) {
  const { is_active, ...createPayload } = payload;
  const response = await apiClient<RawAccount>(`/organizations/${organizationId}/accounts`, {
    method: "POST",
    body: createPayload,
  });

  const created = adaptAccount(response);

  if (typeof is_active === "boolean" && is_active !== created.isActive) {
    return updateAccount(organizationId, created.id, { is_active });
  }

  return created;
}

export async function updateAccount(organizationId: string, accountId: string, payload: Partial<AccountMutationPayload>) {
  const response = await apiClient<RawAccount>(`/organizations/${organizationId}/accounts/${accountId}`, {
    method: "PATCH",
    body: payload,
  });

  return adaptAccount(response);
}

export async function archiveAccount(organizationId: string, accountId: string) {
  return apiClient<{ message: string }>(`/organizations/${organizationId}/accounts/${accountId}`, {
    method: "DELETE",
  });
}

export async function getAccountBalance(organizationId: string, accountId: string): Promise<AccountBalance> {
  const response = await apiClient<{
    account_id?: string;
    accountId?: string;
    closing_debit?: string | number;
    closingDebit?: string | number;
    closing_credit?: string | number;
    closingCredit?: string | number;
  }>(`/organizations/${organizationId}/accounts/${accountId}/balance`);

  return {
    accountId: response.account_id ?? response.accountId ?? accountId,
    closingDebit: sanitizeDecimalInput(response.closing_debit ?? response.closingDebit ?? 0),
    closingCredit: sanitizeDecimalInput(response.closing_credit ?? response.closingCredit ?? 0),
  };
}

export async function getAccountLedger(organizationId: string, accountId: string) {
  const response = await apiClient<RawAccountLedgerLine[]>(`/organizations/${organizationId}/accounts/${accountId}/ledger`);
  return response.map(adaptLedgerLine);
}
