import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { sanitizeDecimalInput } from "@/lib/accounting/decimal";

import type {
  BankAccount,
  BankAccountMutationPayload,
  BankAccountSummary,
  BankImport,
  BankImportMutationPayload,
  BankRegisterLine,
  BankRule,
  BankRuleMutationPayload,
  BankSuggestion,
  BankTransaction,
  CashbookSummary,
  RawBankAccount,
  RawBankImport,
  RawBankTransaction,
  ReconciliationRecord,
  ReconciliationSummary,
} from "@/features/banking/types";

async function optionalRequest<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
      return fallback;
    }
    throw error;
  }
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : null;
}

function normalizeDecimal(value: unknown, fallback = 0): string {
  return sanitizeDecimalInput(typeof value === "string" || typeof value === "number" ? value : fallback);
}

function adaptBankAccount(raw: RawBankAccount): BankAccount {
  return {
    id: raw.id,
    organizationId: raw.organization_id ?? raw.organizationId,
    glAccountId: raw.gl_account_id ?? raw.glAccountId ?? raw.account_id ?? raw.accountId ?? "",
    glAccountCode: raw.gl_account_code ?? raw.glAccountCode ?? null,
    glAccountName: raw.gl_account_name ?? raw.glAccountName ?? null,
    name: raw.name ?? "Unnamed bank account",
    displayName: raw.display_name ?? raw.displayName ?? null,
    bankName: raw.bank_name ?? raw.bankName ?? null,
    accountNumberMasked: raw.account_number_masked ?? raw.accountNumberMasked ?? raw.account_number_mask ?? raw.accountNumberMask ?? null,
    ibanMasked: raw.iban_masked ?? raw.ibanMasked ?? null,
    currencyCode: raw.currency_code ?? raw.currencyCode ?? "USD",
    accountType: raw.account_type ?? raw.accountType ?? null,
    openingBalance: sanitizeDecimalInput(raw.opening_balance ?? raw.openingBalance ?? 0),
    openingBalanceDate: raw.opening_balance_date ?? raw.openingBalanceDate ?? null,
    isActive: raw.is_active ?? raw.isActive ?? true,
    isDefaultReceiptsAccount: raw.is_default_receipts_account ?? raw.isDefaultReceiptsAccount ?? false,
    isDefaultPaymentsAccount: raw.is_default_payments_account ?? raw.isDefaultPaymentsAccount ?? false,
    feedStatus: raw.feed_status ?? raw.feedStatus ?? null,
    lastImportedAt: raw.last_imported_at ?? raw.lastImportedAt ?? null,
    lastReconciledAt: raw.last_reconciled_at ?? raw.lastReconciledAt ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
  };
}

function adaptBankImport(raw: RawBankImport): BankImport {
  return {
    id: raw.id,
    organizationId: raw.organization_id ?? raw.organizationId,
    bankAccountId: raw.bank_account_id ?? raw.bankAccountId ?? null,
    bankAccountName: raw.bank_account_name ?? raw.bankAccountName ?? null,
    source: raw.source ?? null,
    fileName: raw.file_name ?? raw.fileName ?? null,
    importedAt: raw.imported_at ?? raw.importedAt ?? null,
    status: raw.status ?? "processing",
    totalLines: raw.total_lines ?? raw.totalLines ?? null,
    importedLines: raw.imported_lines ?? raw.importedLines ?? null,
    duplicateLines: raw.duplicate_lines ?? raw.duplicateLines ?? null,
    failedLines: raw.failed_lines ?? raw.failedLines ?? null,
    notes: raw.notes ?? null,
  };
}

function adaptBankTransaction(raw: RawBankTransaction): BankTransaction {
  return {
    id: raw.id,
    organizationId: raw.organization_id ?? raw.organizationId,
    bankAccountId: raw.bank_account_id ?? raw.bankAccountId ?? "",
    bankAccountName: raw.bank_account_name ?? raw.bankAccountName ?? null,
    transactionDate: raw.transaction_date ?? raw.transactionDate ?? "",
    postedDate: raw.posted_date ?? raw.postedDate ?? null,
    transactionType: raw.transaction_type ?? raw.transactionType ?? null,
    amount: sanitizeDecimalInput(raw.amount ?? 0),
    description: raw.description ?? "Bank transaction",
    payee: raw.payee ?? null,
    reference: raw.reference ?? null,
    memo: raw.memo ?? null,
    notes: raw.notes ?? null,
    status: raw.status ?? "unreconciled",
    matchedJournalId: raw.matched_journal_id ?? raw.matchedJournalId ?? null,
    matchedEntityType: raw.matched_entity_type ?? raw.matchedEntityType ?? raw.source_type ?? raw.sourceType ?? null,
    matchedEntityId: raw.matched_entity_id ?? raw.matchedEntityId ?? raw.source_id ?? raw.sourceId ?? null,
    sourceModule: raw.source_module ?? raw.sourceModule ?? null,
    sourceType: raw.source_type ?? raw.sourceType ?? null,
    sourceId: raw.source_id ?? raw.sourceId ?? null,
    targetAccountId: raw.target_account_id ?? raw.targetAccountId ?? null,
    targetAccountCode: raw.target_account_code ?? raw.targetAccountCode ?? null,
    targetAccountName: raw.target_account_name ?? raw.targetAccountName ?? null,
    taxCodeId: raw.tax_code_id ?? raw.taxCodeId ?? null,
    currencyCode: raw.currency_code ?? raw.currencyCode ?? null,
    taxableAmount: raw.taxable_amount != null || raw.taxableAmount != null ? sanitizeDecimalInput(raw.taxable_amount ?? raw.taxableAmount ?? 0) : null,
    taxAmount: raw.tax_amount != null || raw.taxAmount != null ? sanitizeDecimalInput(raw.tax_amount ?? raw.taxAmount ?? 0) : null,
    grossAmount: raw.gross_amount != null || raw.grossAmount != null ? sanitizeDecimalInput(raw.gross_amount ?? raw.grossAmount ?? 0) : null,
    runningBalance: raw.running_balance != null || raw.runningBalance != null ? sanitizeDecimalInput(raw.running_balance ?? raw.runningBalance ?? 0) : null,
    duplicateDetected: raw.duplicate_detected ?? raw.duplicateDetected ?? false,
    suggestionCount: raw.suggestion_count ?? raw.suggestionCount ?? null,
    reconciledAt: raw.reconciled_at ?? raw.reconciledAt ?? null,
    reconciledBy: raw.reconciled_by ?? raw.reconciledBy ?? raw.reconciled_by_user_id ?? raw.reconciledByUserId ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
  };
}

function adaptBankAccountSummary(raw: Record<string, unknown>, bankAccountId: string): BankAccountSummary {
  return {
    bankAccountId: normalizeString(raw.bank_account_id ?? raw.bankAccountId, bankAccountId),
    openingBalance: normalizeDecimal(raw.opening_balance ?? raw.openingBalance),
    ledgerBalance: normalizeDecimal(raw.ledger_balance ?? raw.ledgerBalance ?? raw.closing_balance ?? raw.closingBalance),
    unreconciledDelta: normalizeDecimal(raw.unreconciled_delta ?? raw.unreconciledDelta),
    availableBalance: raw.available_balance != null || raw.availableBalance != null ? normalizeDecimal(raw.available_balance ?? raw.availableBalance) : null,
    unreconciledCount: normalizeNumber(raw.unreconciled_count ?? raw.unreconciledCount),
    reconciledCount: normalizeNumber(raw.reconciled_count ?? raw.reconciledCount),
    ignoredCount: normalizeNumber(raw.ignored_count ?? raw.ignoredCount),
  };
}

function adaptRegisterLine(raw: Record<string, unknown>, index: number): BankRegisterLine {
  return {
    id: normalizeString(raw.id, `register-${index}`),
    transactionDate: normalizeString(raw.transaction_date ?? raw.transactionDate ?? raw.date),
    postedDate: normalizeNullableString(raw.posted_date ?? raw.postedDate),
    description: normalizeString(raw.description ?? raw.memo, "Register line"),
    reference: normalizeNullableString(raw.reference),
    amount: normalizeDecimal(raw.amount),
    runningBalance: raw.running_balance != null || raw.runningBalance != null ? normalizeDecimal(raw.running_balance ?? raw.runningBalance) : null,
    status: normalizeNullableString(raw.status),
  };
}

function adaptSuggestion(raw: Record<string, unknown>, index: number): BankSuggestion {
  return {
    id: normalizeString(raw.id, `suggestion-${index}`),
    type: normalizeString(raw.type ?? raw.suggestion_type, "suggestion"),
    label: normalizeString(raw.label ?? raw.title ?? raw.type, "Suggestion"),
    reason: normalizeNullableString(raw.reason ?? raw.explanation),
    score: normalizeNumber(raw.score),
    entityId: normalizeNullableString(raw.entity_id ?? raw.entityId ?? raw.source_id ?? raw.sourceId),
    entityType: normalizeNullableString(raw.entity_type ?? raw.entityType ?? raw.source_type ?? raw.sourceType),
    amount: raw.amount != null ? sanitizeDecimalInput(raw.amount as string | number) : null,
    currencyCode: normalizeNullableString(raw.currency_code ?? raw.currencyCode),
  };
}

function adaptReconciliation(raw: Record<string, unknown>): ReconciliationRecord {
  return {
    id: normalizeString(raw.id),
    organizationId: normalizeNullableString(raw.organization_id ?? raw.organizationId) ?? undefined,
    bankTransactionId: normalizeString(raw.bank_transaction_id ?? raw.bankTransactionId),
    bankTransactionDescription: normalizeNullableString(raw.bank_transaction_description ?? raw.bankTransactionDescription),
    actionType: normalizeNullableString(raw.action_type ?? raw.actionType),
    matchedEntityType: normalizeNullableString(raw.matched_entity_type ?? raw.matchedEntityType),
    matchedEntityId: normalizeNullableString(raw.matched_entity_id ?? raw.matchedEntityId),
    createdJournalId: normalizeNullableString(raw.created_journal_id ?? raw.createdJournalId),
    createdAt: normalizeNullableString(raw.created_at ?? raw.createdAt),
    createdBy: normalizeNullableString(raw.created_by ?? raw.createdBy),
    status: normalizeNullableString(raw.status),
  };
}

function adaptBankRule(raw: Record<string, unknown>): BankRule {
  return {
    id: normalizeString(raw.id),
    organizationId: normalizeNullableString(raw.organization_id ?? raw.organizationId) ?? undefined,
    name: normalizeString(raw.name, "Bank rule"),
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
    priority: normalizeNumber(raw.priority),
    appliesToBankAccountId: normalizeNullableString(raw.applies_to_bank_account_id ?? raw.appliesToBankAccountId),
    matchPayeeContains: normalizeNullableString(raw.match_payee_contains ?? raw.matchPayeeContains),
    matchDescriptionContains: normalizeNullableString(raw.match_description_contains ?? raw.matchDescriptionContains),
    matchReferenceContains: normalizeNullableString(raw.match_reference_contains ?? raw.matchReferenceContains),
    matchAmountExact: raw.match_amount_exact != null || raw.matchAmountExact != null ? normalizeDecimal(raw.match_amount_exact ?? raw.matchAmountExact) : null,
    matchAmountMin: raw.match_amount_min != null || raw.matchAmountMin != null ? normalizeDecimal(raw.match_amount_min ?? raw.matchAmountMin) : null,
    matchAmountMax: raw.match_amount_max != null || raw.matchAmountMax != null ? normalizeDecimal(raw.match_amount_max ?? raw.matchAmountMax) : null,
    direction: normalizeNullableString(raw.direction),
    actionType: normalizeNullableString(raw.action_type ?? raw.actionType),
    targetAccountId: normalizeNullableString(raw.target_account_id ?? raw.targetAccountId),
    autoReconcile: Boolean(raw.auto_reconcile ?? raw.autoReconcile ?? false),
    notes: normalizeNullableString(raw.notes),
  };
}

function adaptCashbookSummary(raw: Record<string, unknown>): CashbookSummary {
  return {
    bankAccountId: normalizeNullableString(raw.bank_account_id ?? raw.bankAccountId),
    bankAccountName: normalizeNullableString(raw.bank_account_name ?? raw.bankAccountName),
    glAccountId: normalizeNullableString(raw.gl_account_id ?? raw.glAccountId),
    openingBalance: raw.opening_balance != null || raw.openingBalance != null ? normalizeDecimal(raw.opening_balance ?? raw.openingBalance) : null,
    ledgerBalance: raw.ledger_balance != null || raw.ledgerBalance != null ? normalizeDecimal(raw.ledger_balance ?? raw.ledgerBalance) : null,
    unreconciledDelta: raw.unreconciled_delta != null || raw.unreconciledDelta != null ? normalizeDecimal(raw.unreconciled_delta ?? raw.unreconciledDelta) : null,
  };
}

function adaptReconciliationSummary(raw: Record<string, unknown>): ReconciliationSummary {
  return {
    unreconciledCount: normalizeNumber(raw.unreconciled_count ?? raw.unreconciledCount),
    reconciledCount: normalizeNumber(raw.reconciled_count ?? raw.reconciledCount),
    ignoredCount: normalizeNumber(raw.ignored_count ?? raw.ignoredCount),
    latestImportedAt: normalizeNullableString(raw.latest_imported_at ?? raw.latestImportedAt),
  };
}

export async function listBankAccounts(organizationId: string, search?: string) {
  if (search) {
    try {
      const response = await apiClient<{ items: RawBankAccount[] }>(`/organizations/${organizationId}/bank-accounts/search?q=${encodeURIComponent(search)}`);
      return response.items.map(adaptBankAccount);
    } catch (error) {
      if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
        throw error;
      }
      const fallback = await apiClient<{ items: RawBankAccount[] }>(`/organizations/${organizationId}/bank-accounts?q=${encodeURIComponent(search)}`);
      return fallback.items.map(adaptBankAccount);
    }
  }

  const response = await apiClient<{ items: RawBankAccount[] }>(`/organizations/${organizationId}/bank-accounts`);
  return response.items.map(adaptBankAccount);
}

export async function getBankAccount(organizationId: string, bankAccountId: string) {
  const response = await apiClient<RawBankAccount>(`/organizations/${organizationId}/bank-accounts/${bankAccountId}`);
  return adaptBankAccount(response);
}

export async function createBankAccount(organizationId: string, payload: BankAccountMutationPayload) {
  const response = await apiClient<RawBankAccount>(`/organizations/${organizationId}/bank-accounts`, { method: "POST", body: { account_id: payload.gl_account_id, name: payload.name, bank_name: payload.bank_name, account_number_mask: payload.account_number_masked, currency_code: payload.currency_code, opening_balance: payload.opening_balance || "0" } });
  const created = adaptBankAccount(response);
  if (payload.is_active === false || payload.display_name || payload.iban_masked || payload.account_type || payload.opening_balance_date || payload.is_default_receipts_account || payload.is_default_payments_account) {
    return updateBankAccount(organizationId, created.id, payload);
  }
  return created;
}

export async function updateBankAccount(organizationId: string, bankAccountId: string, payload: Partial<BankAccountMutationPayload>) {
  const response = await apiClient<RawBankAccount>(`/organizations/${organizationId}/bank-accounts/${bankAccountId}`, {
    method: "PATCH",
    body: {
      name: payload.name,
      bank_name: payload.bank_name,
      account_number_mask: payload.account_number_masked,
      currency_code: payload.currency_code,
      opening_balance: payload.opening_balance,
      is_active: payload.is_active,
      display_name: payload.display_name,
      iban_masked: payload.iban_masked,
      account_type: payload.account_type,
      opening_balance_date: payload.opening_balance_date,
      is_default_receipts_account: payload.is_default_receipts_account,
      is_default_payments_account: payload.is_default_payments_account,
      gl_account_id: payload.gl_account_id,
    },
  });
  return adaptBankAccount(response);
}

export async function archiveBankAccount(organizationId: string, bankAccountId: string) {
  return apiClient<{ message: string }>(`/organizations/${organizationId}/bank-accounts/${bankAccountId}`, { method: "DELETE" });
}

export async function getBankAccountSummary(organizationId: string, bankAccountId: string) {
  return optionalRequest(
    async () => {
      const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/bank-accounts/${bankAccountId}/summary`);
      return adaptBankAccountSummary(response, bankAccountId);
    },
    adaptBankAccountSummary({ bank_account_id: bankAccountId }, bankAccountId),
  );
}

export async function getBankAccountRegister(organizationId: string, bankAccountId: string) {
  return optionalRequest(
    async () => {
      const response = await apiClient<{ items?: Record<string, unknown>[] } | Record<string, unknown>[]>(`/organizations/${organizationId}/bank-accounts/${bankAccountId}/register`);
      const items = Array.isArray(response) ? response : response.items ?? [];
      return items.map(adaptRegisterLine);
    },
    [],
  );
}

export async function listBankImports(organizationId: string) {
  return optionalRequest(
    async () => {
      const response = await apiClient<{ items: RawBankImport[] }>(`/organizations/${organizationId}/bank-imports`);
      return response.items.map(adaptBankImport);
    },
    [],
  );
}

export async function getBankImport(organizationId: string, importId: string) {
  return optionalRequest(
    async () => adaptBankImport(await apiClient<RawBankImport>(`/organizations/${organizationId}/bank-imports/${importId}`)),
    null,
  );
}

export async function createBankImport(organizationId: string, payload: BankImportMutationPayload) {
  const formData = new FormData();
  formData.append("bank_account_id", payload.bank_account_id);
  formData.append("file", payload.file);
  if (payload.source) formData.append("source", payload.source);
  if (payload.mapping_json) formData.append("mapping_json", payload.mapping_json);
  const response = await apiClient<RawBankImport>(`/organizations/${organizationId}/bank-imports`, { method: "POST", body: formData });
  return adaptBankImport(response);
}

export async function listBankImportTransactions(organizationId: string, importId: string) {
  return optionalRequest(
    async () => {
      const response = await apiClient<{ items: RawBankTransaction[] }>(`/organizations/${organizationId}/bank-imports/${importId}/transactions`);
      return response.items.map(adaptBankTransaction);
    },
    [],
  );
}

export async function listBankTransactions(organizationId: string) {
  const response = await apiClient<{ items: RawBankTransaction[] }>(`/organizations/${organizationId}/bank-transactions`);
  return response.items.map(adaptBankTransaction);
}

export async function listUnreconciledBankTransactions(organizationId: string) {
  const response = await apiClient<{ items: RawBankTransaction[] }>(`/organizations/${organizationId}/bank-transactions/unreconciled`);
  return response.items.map(adaptBankTransaction);
}

export async function listReconciledBankTransactions(organizationId: string) {
  return optionalRequest(
    async () => {
      const response = await apiClient<{ items: RawBankTransaction[] }>(`/organizations/${organizationId}/bank-transactions/reconciled`);
      return response.items.map(adaptBankTransaction);
    },
    [],
  );
}

export async function getBankTransaction(organizationId: string, transactionId: string) {
  const response = await apiClient<RawBankTransaction>(`/organizations/${organizationId}/bank-transactions/${transactionId}`);
  return adaptBankTransaction(response);
}

export async function getBankTransactionSuggestions(organizationId: string, transactionId: string) {
  return optionalRequest(
    async () => {
      const response = await apiClient<{ items?: Record<string, unknown>[]; suggestions?: Record<string, unknown>[] }>(`/organizations/${organizationId}/bank-transactions/${transactionId}/suggestions`);
      const items = response.items ?? response.suggestions ?? [];
      return items.map(adaptSuggestion);
    },
    [],
  );
}

export async function ignoreBankTransaction(organizationId: string, transactionId: string, reason?: string) {
  const response = await apiClient<RawBankTransaction>(`/organizations/${organizationId}/bank-transactions/${transactionId}/ignore`, { method: "POST", body: reason ? { reason } : undefined });
  return adaptBankTransaction(response);
}

export async function unreconcileBankTransaction(organizationId: string, transactionId: string, reason?: string) {
  const response = await apiClient<RawBankTransaction>(`/organizations/${organizationId}/bank-transactions/${transactionId}/unreconcile`, { method: "POST", body: reason ? { reason } : undefined });
  return adaptBankTransaction(response);
}

async function reconcileRequest(organizationId: string, transactionId: string, path: string, payload?: Record<string, unknown>) {
  const response = await apiClient<RawBankTransaction>(`/organizations/${organizationId}/bank-transactions/${transactionId}${path}`, { method: "POST", body: payload });
  return adaptBankTransaction(response);
}

export function reconcileMatchCustomerPayment(organizationId: string, transactionId: string, customerPaymentId: string) {
  return reconcileRequest(organizationId, transactionId, "/reconcile/match-customer-payment", { customer_payment_id: customerPaymentId });
}

export function reconcileMatchSupplierPayment(organizationId: string, transactionId: string, supplierPaymentId: string) {
  return reconcileRequest(organizationId, transactionId, "/reconcile/match-supplier-payment", { supplier_payment_id: supplierPaymentId });
}

export async function reconcileMatchJournal(organizationId: string, transactionId: string, journalId: string) {
  try {
    return await reconcileRequest(organizationId, transactionId, "/reconcile/match-journal", { journal_id: journalId });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
      return reconcileRequest(organizationId, transactionId, "/reconcile-journal", { journal_id: journalId });
    }
    throw error;
  }
}

export function reconcileCashCode(organizationId: string, transactionId: string, payload: Record<string, unknown>) {
  return reconcileRequest(organizationId, transactionId, "/reconcile/cash-code", payload);
}

export function reconcileTransfer(organizationId: string, transactionId: string, payload: Record<string, unknown>) {
  return reconcileRequest(organizationId, transactionId, "/reconcile/transfer", payload);
}

export async function listReconciliations(organizationId: string) {
  return optionalRequest(
    async () => {
      const response = await apiClient<{ items: Record<string, unknown>[] }>(`/organizations/${organizationId}/reconciliations`);
      return response.items.map(adaptReconciliation);
    },
    [],
  );
}

export async function getReconciliation(organizationId: string, reconciliationId: string) {
  return optionalRequest(
    async () => adaptReconciliation(await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/reconciliations/${reconciliationId}`)),
    null,
  );
}

export async function listBankRules(organizationId: string) {
  return optionalRequest(
    async () => {
      const response = await apiClient<{ items: Record<string, unknown>[] }>(`/organizations/${organizationId}/bank-rules`);
      return response.items.map(adaptBankRule);
    },
    [],
  );
}

export async function getBankRule(organizationId: string, ruleId: string) {
  return optionalRequest(
    async () => adaptBankRule(await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/bank-rules/${ruleId}`)),
    null,
  );
}

export async function createBankRule(organizationId: string, payload: BankRuleMutationPayload) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/bank-rules`, { method: "POST", body: payload });
  return adaptBankRule(response);
}

export async function updateBankRule(organizationId: string, ruleId: string, payload: Partial<BankRuleMutationPayload>) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/bank-rules/${ruleId}`, { method: "PATCH", body: payload });
  return adaptBankRule(response);
}

export async function archiveBankRule(organizationId: string, ruleId: string) {
  return apiClient<{ message: string }>(`/organizations/${organizationId}/bank-rules/${ruleId}`, { method: "DELETE" });
}

export async function testBankRule(organizationId: string, ruleId: string, payload: Record<string, unknown>) {
  return optionalRequest(
    async () => apiClient<Record<string, unknown>>(`/organizations/${organizationId}/bank-rules/${ruleId}/test`, { method: "POST", body: payload }),
    { matched: false },
  );
}

export async function getCashbook(organizationId: string) {
  let response: { items?: Record<string, unknown>[] } | Record<string, unknown>[];
  try {
    response = await apiClient<{ items?: Record<string, unknown>[] } | Record<string, unknown>[]>(`/organizations/${organizationId}/cashbook`);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
      response = await apiClient<{ items: Record<string, unknown>[] }>(`/organizations/${organizationId}/banking/cash-position`);
    } else {
      throw error;
    }
  }
  const items = Array.isArray(response) ? response : response.items ?? [];
  return items.map(adaptCashbookSummary);
}

export async function getReconciliationSummary(organizationId: string) {
  return optionalRequest(
    async () => adaptReconciliationSummary(await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/reconciliation-summary`)),
    { unreconciledCount: null, reconciledCount: null, ignoredCount: null, latestImportedAt: null },
  );
}

export async function listCustomerPaymentsForBanking(organizationId: string) {
  return optionalRequest(
    async () => apiClient<{ items: Record<string, unknown>[] }>(`/organizations/${organizationId}/customer-payments`),
    { items: [] },
  );
}

export async function listSupplierPaymentsForBanking(organizationId: string) {
  return optionalRequest(
    async () => apiClient<{ items: Record<string, unknown>[] }>(`/organizations/${organizationId}/supplier-payments`),
    { items: [] },
  );
}
