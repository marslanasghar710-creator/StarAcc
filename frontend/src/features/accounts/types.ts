export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type NormalBalance = "debit" | "credit";

export type RawAccount = {
  id: string;
  organization_id?: string;
  organizationId?: string;
  code: string;
  name: string;
  description?: string | null;
  account_type?: AccountType;
  accountType?: AccountType;
  account_subtype?: string | null;
  accountSubtype?: string | null;
  normal_balance?: NormalBalance;
  normalBalance?: NormalBalance;
  parent_account_id?: string | null;
  parentAccountId?: string | null;
  currency_code?: string | null;
  currencyCode?: string | null;
  is_active?: boolean;
  isActive?: boolean;
  is_postable?: boolean;
  isPostable?: boolean;
  is_system?: boolean;
  isSystem?: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

export type Account = {
  id: string;
  organizationId?: string;
  code: string;
  name: string;
  description?: string | null;
  accountType: AccountType;
  accountSubtype?: string | null;
  normalBalance: NormalBalance;
  parentAccountId?: string | null;
  currencyCode?: string | null;
  isActive: boolean;
  isPostable: boolean;
  isSystem: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AccountListFilters = {
  search?: string;
  accountType?: AccountType | "all";
  status?: "all" | "active" | "inactive";
};

export type AccountBalance = {
  accountId: string;
  closingDebit: string;
  closingCredit: string;
};

export type RawAccountLedgerLine = {
  journal_id?: string;
  journalId?: string;
  entry_number?: string;
  entryNumber?: string;
  entry_date?: string;
  entryDate?: string;
  description?: string | null;
  debit_amount?: string | number;
  debitAmount?: string | number;
  credit_amount?: string | number;
  creditAmount?: string | number;
};

export type AccountLedgerLine = {
  journalId: string;
  entryNumber: string;
  entryDate: string;
  description?: string | null;
  debitAmount: string;
  creditAmount: string;
};

export type AccountMutationPayload = {
  code: string;
  name: string;
  description?: string | null;
  account_type: AccountType;
  account_subtype?: string | null;
  parent_account_id?: string | null;
  currency_code?: string | null;
  is_postable: boolean;
  is_active?: boolean;
};
