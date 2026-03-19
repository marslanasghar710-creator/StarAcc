import { apiClient } from "@/lib/api/client";
import { sanitizeDecimalInput } from "@/lib/accounting/decimal";

import type { Journal, JournalMutationPayload, JournalReversePayload, JournalLine, RawJournal, RawJournalLine } from "@/features/journals/types";

function adaptJournalLine(raw: RawJournalLine, index: number): JournalLine {
  return {
    id: raw.id,
    lineNumber: raw.line_number ?? raw.lineNumber ?? index + 1,
    accountId: raw.account_id ?? raw.accountId ?? "",
    accountCode: raw.account_code ?? raw.accountCode ?? null,
    accountName: raw.account_name ?? raw.accountName ?? null,
    description: raw.description ?? null,
    debitAmount: sanitizeDecimalInput(raw.debit_amount ?? raw.debitAmount ?? 0),
    creditAmount: sanitizeDecimalInput(raw.credit_amount ?? raw.creditAmount ?? 0),
    currencyCode: raw.currency_code ?? raw.currencyCode ?? null,
  };
}

function adaptJournal(raw: RawJournal): Journal {
  return {
    id: raw.id,
    organizationId: raw.organization_id ?? raw.organizationId,
    entryNumber: raw.entry_number ?? raw.entryNumber ?? "Pending",
    entryDate: raw.entry_date ?? raw.entryDate ?? "",
    description: raw.description,
    reference: raw.reference ?? null,
    sourceModule: raw.source_module ?? raw.sourceModule ?? null,
    sourceType: raw.source_type ?? raw.sourceType ?? null,
    sourceId: raw.source_id ?? raw.sourceId ?? null,
    status: raw.status,
    periodId: raw.period_id ?? raw.periodId ?? "",
    periodName: raw.period_name ?? raw.periodName ?? null,
    createdBy: raw.created_by ?? raw.createdBy ?? null,
    postedBy: raw.posted_by ?? raw.postedBy ?? null,
    postedAt: raw.posted_at ?? raw.postedAt ?? null,
    reversalJournalId: raw.reversal_journal_id ?? raw.reversalJournalId ?? null,
    reversedFromJournalId: raw.reversed_from_journal_id ?? raw.reversedFromJournalId ?? null,
    lines: (raw.lines ?? []).map(adaptJournalLine),
  };
}

export async function listJournals(organizationId: string) {
  const response = await apiClient<{ items: RawJournal[] }>(`/organizations/${organizationId}/journals`);
  return response.items.map(adaptJournal);
}

export async function searchJournals(organizationId: string, query: string) {
  const response = await apiClient<{ items: RawJournal[] }>(`/organizations/${organizationId}/journals/search?q=${encodeURIComponent(query)}`);
  return response.items.map(adaptJournal);
}

export async function getJournal(organizationId: string, journalId: string) {
  const response = await apiClient<RawJournal>(`/organizations/${organizationId}/journals/${journalId}`);
  return adaptJournal(response);
}

export async function createJournal(organizationId: string, payload: JournalMutationPayload) {
  const response = await apiClient<RawJournal>(`/organizations/${organizationId}/journals`, {
    method: "POST",
    body: payload,
  });
  return adaptJournal(response);
}

export async function updateJournal(organizationId: string, journalId: string, payload: JournalMutationPayload) {
  const response = await apiClient<RawJournal>(`/organizations/${organizationId}/journals/${journalId}`, {
    method: "PATCH",
    body: payload,
  });
  return adaptJournal(response);
}

export async function postJournal(organizationId: string, journalId: string) {
  return apiClient<{ journal_id?: string; journalId?: string; status: string }>(`/organizations/${organizationId}/journals/${journalId}/post`, {
    method: "POST",
  });
}

export async function reverseJournal(organizationId: string, journalId: string, payload: JournalReversePayload) {
  return apiClient<{ journal_id?: string; journalId?: string; status: string }>(`/organizations/${organizationId}/journals/${journalId}/reverse`, {
    method: "POST",
    body: payload,
  });
}

export async function voidJournal(organizationId: string, journalId: string, reason: string) {
  const response = await apiClient<RawJournal>(`/organizations/${organizationId}/journals/${journalId}/void`, {
    method: "POST",
    body: { reason },
  });
  return adaptJournal(response);
}
