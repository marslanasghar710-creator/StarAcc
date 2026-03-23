export type Group = {
  id: string;
  organization_id: string;
  name: string;
  reporting_currency: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
};

export type GroupEntity = {
  id: string;
  group_id: string;
  organization_id: string;
  organization_name: string;
  organization_currency: string;
  ownership_percentage?: string | null;
  is_primary: boolean;
  created_at: string;
};

export type FxRateInput = {
  organization_id: string;
  rate: string;
};

export type ReportMetadata = {
  group_id: string;
  group_name: string;
  reporting_currency: string;
  period_start: string;
  period_end: string;
  run_id?: string | null;
  generated_at: string;
  elimination_count: number;
  entity_ids: string[];
};

export type EntityBreakdown = {
  organization_id: string;
  organization_name: string;
  amount: string;
};

export type ConsolidatedLine = {
  account_code: string;
  account_name: string;
  account_type: string;
  amount?: string;
  debit_balance?: string;
  credit_balance?: string;
  entity_breakdown: EntityBreakdown[];
};

export type ConsolidatedSection = {
  title: string;
  lines: ConsolidatedLine[];
  total: string;
};

export type ConsolidatedBalanceSheet = {
  metadata: ReportMetadata;
  assets: ConsolidatedSection;
  liabilities: ConsolidatedSection;
  equity: ConsolidatedSection;
  total_assets: string;
  total_liabilities_and_equity: string;
  balances: boolean;
};

export type ConsolidatedIncomeStatement = {
  metadata: ReportMetadata;
  revenue: ConsolidatedSection;
  expenses: ConsolidatedSection;
  net_profit: string;
};

export type ConsolidatedTrialBalance = {
  metadata: ReportMetadata;
  lines: ConsolidatedLine[];
  total_debit: string;
  total_credit: string;
  balances: boolean;
};

export type EliminationLine = {
  account_code: string;
  account_name: string;
  account_type: string;
  debit_amount: string;
  credit_amount: string;
  source_organization_id?: string | null;
  source_organization_name?: string | null;
};

export type EliminationEntry = {
  id: string;
  group_id: string;
  consolidation_run_id?: string | null;
  description: string;
  period_start: string;
  period_end: string;
  source_entities: string[];
  journal_lines: EliminationLine[];
  is_manual: boolean;
  created_by_user_id?: string | null;
  created_at: string;
};

export type ConsolidationRun = {
  id: string;
  group_id: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
  selected_entity_ids: string[];
  fx_rates: Record<string, string>;
  elimination_summary?: { count?: number; auto_count?: number; manual_count?: number } | null;
  balance_sheet?: ConsolidatedBalanceSheet | null;
  income_statement?: ConsolidatedIncomeStatement | null;
  trial_balance?: ConsolidatedTrialBalance | null;
};

export type CreateGroupPayload = {
  name: string;
  reporting_currency: string;
  description?: string;
};

export type AddGroupEntityPayload = {
  organization_id: string;
  ownership_percentage?: string;
  is_primary?: boolean;
};

export type RunConsolidationPayload = {
  period_start: string;
  period_end: string;
  entity_ids?: string[];
  fx_rates?: FxRateInput[];
};

export type CreateEliminationPayload = {
  description: string;
  period_start: string;
  period_end: string;
  source_entities: string[];
  journal_lines: EliminationLine[];
};
