export type JournalStatus = "draft" | "posted" | "reversed" | "voided";

export type RawJournalLine = {
  id?: string;
  line_number?: number;
  lineNumber?: number;
  account_id?: string;
  accountId?: string;
  account_code?: string;
  accountCode?: string;
  account_name?: string;
  accountName?: string;
  description?: string | null;
  debit_amount?: string | number;
  debitAmount?: string | number;
  credit_amount?: string | number;
  creditAmount?: string | number;
  currency_code?: string | null;
  currencyCode?: string | null;
};

export type JournalLine = {
  id?: string;
  lineNumber: number;
  accountId: string;
  accountCode?: string | null;
  accountName?: string | null;
  description?: string | null;
  debitAmount: string;
  creditAmount: string;
  currencyCode?: string | null;
};

export type RawJournal = {
  id: string;
  organization_id?: string;
  organizationId?: string;
  entry_number?: string;
  entryNumber?: string;
  entry_date?: string;
  entryDate?: string;
  description: string;
  reference?: string | null;
  source_module?: string | null;
  sourceModule?: string | null;
  source_type?: string | null;
  sourceType?: string | null;
  source_id?: string | null;
  sourceId?: string | null;
  status: JournalStatus;
  period_id?: string;
  periodId?: string;
  period_name?: string | null;
  periodName?: string | null;
  created_by?: string | null;
  createdBy?: string | null;
  posted_by?: string | null;
  postedBy?: string | null;
  posted_at?: string | null;
  postedAt?: string | null;
  reversal_journal_id?: string | null;
  reversalJournalId?: string | null;
  reversed_from_journal_id?: string | null;
  reversedFromJournalId?: string | null;
  lines?: RawJournalLine[];
};

export type Journal = {
  id: string;
  organizationId?: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  reference?: string | null;
  sourceModule?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  status: JournalStatus;
  periodId: string;
  periodName?: string | null;
  createdBy?: string | null;
  postedBy?: string | null;
  postedAt?: string | null;
  reversalJournalId?: string | null;
  reversedFromJournalId?: string | null;
  lines: JournalLine[];
};

export type JournalMutationLinePayload = {
  account_id: string;
  description?: string | null;
  debit_amount: string;
  credit_amount: string;
};

export type JournalMutationPayload = {
  entry_date?: string;
  description: string;
  reference?: string | null;
  lines: JournalMutationLinePayload[];
};

export type JournalReversePayload = {
  reversal_date: string;
  reason: string;
};
