export type ReportFormat = "csv" | "pdf";
export type ComparisonMode = "none" | "previous_period" | "prior_year";
export type ReportingBasis = "accrual" | "cash";
export type ReportSlug = "trial-balance" | "profit-loss" | "balance-sheet" | "general-ledger";

export type ReportFilterOption = {
  label: string;
  value: string;
};

export type ReportDateRange = {
  fromDate: string | null;
  toDate: string | null;
};

export type ReportSummaryMetric = {
  label: string;
  value: string | number | null;
  tone?: "default" | "success" | "warning" | "danger";
};

export type ReportsLandingItem = {
  id: string;
  slug: ReportSlug;
  name: string;
  description: string;
  href: string;
  isAvailable: boolean;
  allowedFormats: ReportFormat[];
  requiredPermissions: string[];
  recommended: boolean;
};

export type ReportsMetadata = {
  reports: ReportsLandingItem[];
  generatedAt: string | null;
  currentPeriodLabel: string | null;
  supportedComparisonModes: ComparisonMode[];
  supportedBases: ReportingBasis[];
};

export type TrialBalanceRow = {
  id: string;
  accountId: string | null;
  accountCode: string;
  accountName: string;
  accountType: string | null;
  groupName: string | null;
  depth: number;
  debit: string | null;
  credit: string | null;
  isGroup: boolean;
  isTotal: boolean;
};

export type TrialBalanceTotals = {
  debit: string | null;
  credit: string | null;
  isBalanced: boolean | null;
  difference: string | null;
};

export type TrialBalanceReport = {
  title: string;
  currencyCode: string | null;
  asOfDate: string | null;
  periodLabel: string | null;
  rows: TrialBalanceRow[];
  totals: TrialBalanceTotals;
  availableAccountTypes: ReportFilterOption[];
  supportsZeroBalanceToggle: boolean;
};

export type StatementValue = {
  amount: string | null;
  comparisonAmount: string | null;
  variance: string | null;
  variancePercent: string | null;
};

export type StatementRow = {
  id: string;
  label: string;
  code: string | null;
  depth: number;
  isTotal: boolean;
  isEmphasized: boolean;
  values: StatementValue;
};

export type StatementSection = {
  id: string;
  title: string;
  rows: StatementRow[];
  totals: StatementRow[];
};

export type StatementTotals = {
  primary: string | null;
  comparison: string | null;
  variance: string | null;
  variancePercent: string | null;
  isBalanced: boolean | null;
};

export type ProfitLossReport = {
  title: string;
  currencyCode: string | null;
  fromDate: string | null;
  toDate: string | null;
  basis: ReportingBasis | null;
  comparisonMode: ComparisonMode;
  comparisonLabel: string | null;
  sections: StatementSection[];
  netProfit: StatementTotals;
};

export type BalanceSheetReport = {
  title: string;
  currencyCode: string | null;
  asOfDate: string | null;
  comparisonMode: ComparisonMode;
  comparisonLabel: string | null;
  sections: StatementSection[];
  totals: {
    assets: StatementTotals;
    liabilitiesAndEquity: StatementTotals;
  };
};

export type GeneralLedgerLine = {
  id: string;
  transactionDate: string | null;
  postingDate: string | null;
  journalReference: string | null;
  sourceLabel: string | null;
  description: string | null;
  debit: string | null;
  credit: string | null;
  runningBalance: string | null;
};

export type GeneralLedgerPagination = {
  nextCursor: string | null;
  hasMore: boolean;
};

export type GeneralLedgerReport = {
  title: string;
  currencyCode: string | null;
  accountId: string | null;
  accountName: string | null;
  fromDate: string | null;
  toDate: string | null;
  openingBalance: string | null;
  closingBalance: string | null;
  lines: GeneralLedgerLine[];
  pagination: GeneralLedgerPagination;
  sourceOptions: ReportFilterOption[];
};

export type ReportExportResult = {
  filename: string;
  format: ReportFormat;
};
