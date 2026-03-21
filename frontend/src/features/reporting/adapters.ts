import { sanitizeDecimalInput } from "@/lib/accounting/decimal";

import type {
  BalanceSheetReport,
  ComparisonMode,
  GeneralLedgerLine,
  GeneralLedgerReport,
  ProfitLossReport,
  ReportFilterOption,
  ReportingBasis,
  ReportsLandingItem,
  ReportsMetadata,
  ReportSlug,
  StatementRow,
  StatementSection,
  StatementTotals,
  TrialBalanceReport,
  TrialBalanceRow,
} from "@/features/reporting/types";

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : fallback;
}

function normalizeDecimal(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") {
    return sanitizeDecimalInput(value);
  }

  return null;
}

function normalizeComparisonMode(value: unknown): ComparisonMode {
  return value === "previous_period" || value === "prior_year" ? value : "none";
}

function normalizeBasis(value: unknown): ReportingBasis | null {
  return value === "cash" || value === "accrual" ? value : null;
}

function toSlug(value: unknown): ReportSlug {
  const normalized = normalizeString(value);

  switch (normalized) {
    case "trial-balance":
    case "trial_balance":
      return "trial-balance";
    case "profit-loss":
    case "profit_loss":
      return "profit-loss";
    case "balance-sheet":
    case "balance_sheet":
      return "balance-sheet";
    case "general-ledger":
    case "general_ledger":
    default:
      return "general-ledger";
  }
}

function createDefaultReports(): ReportsLandingItem[] {
  return [
    {
      id: "trial-balance",
      slug: "trial-balance",
      name: "Trial Balance",
      description: "Verify debit and credit balances by account as of a selected date.",
      href: "/reports/trial-balance",
      isAvailable: true,
      allowedFormats: ["csv", "pdf"],
      requiredPermissions: ["reports.read", "reporting.read", "trial_balance.read", "reports.trial_balance.read"],
      recommended: true,
    },
    {
      id: "profit-loss",
      slug: "profit-loss",
      name: "Profit & Loss",
      description: "Review revenue, cost of sales, expenses, and net profit for a period.",
      href: "/reports/profit-loss",
      isAvailable: true,
      allowedFormats: ["csv", "pdf"],
      requiredPermissions: ["reports.read", "reporting.read", "profit_and_loss.read", "reports.profit_loss.read"],
      recommended: true,
    },
    {
      id: "balance-sheet",
      slug: "balance-sheet",
      name: "Balance Sheet",
      description: "Inspect assets, liabilities, equity, and statement balance at a point in time.",
      href: "/reports/balance-sheet",
      isAvailable: true,
      allowedFormats: ["csv", "pdf"],
      requiredPermissions: ["reports.read", "reporting.read", "balance_sheet.read", "reports.balance_sheet.read"],
      recommended: true,
    },
    {
      id: "general-ledger",
      slug: "general-ledger",
      name: "General Ledger",
      description: "Trace detailed ledger movements, references, and running balances by account.",
      href: "/reports/general-ledger",
      isAvailable: true,
      allowedFormats: ["csv", "pdf"],
      requiredPermissions: ["reports.read", "reporting.read", "general_ledger.read", "reports.general_ledger.read", "ledger.read"],
      recommended: false,
    },
  ];
}

function adaptFormats(value: unknown): Array<"csv" | "pdf"> {
  if (!Array.isArray(value)) {
    return ["csv", "pdf"];
  }

  return value.filter((item): item is "csv" | "pdf" => item === "csv" || item === "pdf");
}

function adaptFilterOption(value: unknown): ReportFilterOption | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const optionValue = normalizeString(raw.value ?? raw.id ?? raw.code);

  if (!optionValue) {
    return null;
  }

  return {
    label: normalizeString(raw.label ?? raw.name ?? raw.title, optionValue),
    value: optionValue,
  };
}

export function adaptReportsMetadata(payload: unknown): ReportsMetadata {
  const raw = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const defaultReports = createDefaultReports();
  const rawReports = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.reports)
      ? raw.reports
      : Array.isArray(raw.available_reports)
        ? raw.available_reports
        : [];

  const reports = rawReports.length > 0
    ? rawReports.map((item, index) => {
        const report = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        const slug = toSlug(report.slug ?? report.key ?? report.report_type ?? defaultReports[index]?.slug);
        const fallback = defaultReports.find((entry) => entry.slug === slug) ?? defaultReports[index] ?? defaultReports[0];

        return {
          id: normalizeString(report.id ?? report.key, fallback.id),
          slug,
          name: normalizeString(report.name ?? report.title, fallback.name),
          description: normalizeString(report.description, fallback.description),
          href: fallback.href,
          isAvailable: normalizeBoolean(report.is_available ?? report.available) ?? true,
          allowedFormats: adaptFormats(report.allowed_formats ?? report.export_formats),
          requiredPermissions: Array.isArray(report.required_permissions) ? report.required_permissions.filter((value): value is string => typeof value === "string") : fallback.requiredPermissions,
          recommended: normalizeBoolean(report.recommended) ?? fallback.recommended,
        } satisfies ReportsLandingItem;
      })
    : defaultReports;

  return {
    reports,
    generatedAt: normalizeNullableString(raw.generated_at ?? raw.generatedAt ?? raw.last_generated_at ?? raw.lastGeneratedAt),
    currentPeriodLabel: normalizeNullableString(raw.current_period_label ?? raw.currentPeriodLabel ?? raw.period_label ?? raw.periodLabel),
    supportedComparisonModes: Array.isArray(raw.supported_comparison_modes)
      ? raw.supported_comparison_modes.map(normalizeComparisonMode)
      : ["none", "previous_period", "prior_year"],
    supportedBases: Array.isArray(raw.supported_bases)
      ? raw.supported_bases.map(normalizeBasis).filter((value): value is ReportingBasis => Boolean(value))
      : ["accrual", "cash"],
  };
}

export function adaptTrialBalanceReport(payload: unknown): TrialBalanceReport {
  const raw = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const rawRows = Array.isArray(raw.rows)
    ? raw.rows
    : Array.isArray(raw.accounts)
      ? raw.accounts
      : Array.isArray(raw.items)
        ? raw.items
        : [];

  const rows: TrialBalanceRow[] = rawRows.map((entry, index) => {
    const row = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    return {
      id: normalizeString(row.id, `trial-balance-row-${index}`),
      accountId: normalizeNullableString(row.account_id ?? row.accountId),
      accountCode: normalizeString(row.account_code ?? row.accountCode ?? row.code),
      accountName: normalizeString(row.account_name ?? row.accountName ?? row.name, "Account"),
      accountType: normalizeNullableString(row.account_type ?? row.accountType ?? row.group_type ?? row.groupType),
      groupName: normalizeNullableString(row.group_name ?? row.groupName ?? row.section),
      depth: normalizeNumber(row.depth, 0),
      debit: normalizeDecimal(row.debit ?? row.debit_amount ?? row.debitAmount),
      credit: normalizeDecimal(row.credit ?? row.credit_amount ?? row.creditAmount),
      isGroup: normalizeBoolean(row.is_group ?? row.isGroup) ?? false,
      isTotal: normalizeBoolean(row.is_total ?? row.isTotal) ?? false,
    };
  });

  const totalsRaw = (raw.totals && typeof raw.totals === "object" ? raw.totals : raw.summary && typeof raw.summary === "object" ? raw.summary : {}) as Record<string, unknown>;
  const accountTypeOptions = Array.isArray(raw.available_account_types)
    ? raw.available_account_types.map(adaptFilterOption).filter((value): value is ReportFilterOption => Boolean(value))
    : [];

  return {
    title: normalizeString(raw.title, "Trial Balance"),
    currencyCode: normalizeNullableString(raw.currency_code ?? raw.currencyCode),
    asOfDate: normalizeNullableString(raw.as_of_date ?? raw.asOfDate ?? raw.report_date ?? raw.reportDate),
    periodLabel: normalizeNullableString(raw.period_label ?? raw.periodLabel),
    rows,
    totals: {
      debit: normalizeDecimal(totalsRaw.total_debit ?? totalsRaw.totalDebit ?? totalsRaw.debit),
      credit: normalizeDecimal(totalsRaw.total_credit ?? totalsRaw.totalCredit ?? totalsRaw.credit),
      isBalanced: normalizeBoolean(totalsRaw.is_balanced ?? totalsRaw.isBalanced),
      difference: normalizeDecimal(totalsRaw.difference ?? totalsRaw.balance_difference ?? totalsRaw.balanceDifference),
    },
    availableAccountTypes: accountTypeOptions,
    supportsZeroBalanceToggle: normalizeBoolean(raw.supports_zero_balance_toggle ?? raw.supportsZeroBalanceToggle) ?? true,
  };
}

function adaptStatementRow(entry: unknown, index: number): StatementRow {
  const row = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
  const comparison = (row.comparison && typeof row.comparison === "object" ? row.comparison : {}) as Record<string, unknown>;

  return {
    id: normalizeString(row.id, `statement-row-${index}`),
    label: normalizeString(row.label ?? row.name ?? row.account_name ?? row.accountName, "Line item"),
    code: normalizeNullableString(row.code ?? row.account_code ?? row.accountCode),
    depth: normalizeNumber(row.depth, 0),
    isTotal: normalizeBoolean(row.is_total ?? row.isTotal) ?? false,
    isEmphasized: normalizeBoolean(row.is_emphasized ?? row.isEmphasized ?? row.is_header ?? row.isHeader) ?? false,
    values: {
      amount: normalizeDecimal(row.amount ?? row.current_amount ?? row.currentAmount),
      comparisonAmount: normalizeDecimal(comparison.amount ?? row.comparison_amount ?? row.comparisonAmount),
      variance: normalizeDecimal(comparison.variance ?? row.variance),
      variancePercent: normalizeDecimal(comparison.variance_percent ?? comparison.variancePercent ?? row.variance_percent ?? row.variancePercent),
    },
  };
}

function adaptStatementSection(entry: unknown, index: number): StatementSection {
  const section = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
  const rows = Array.isArray(section.rows) ? section.rows : Array.isArray(section.items) ? section.items : [];
  const totals = Array.isArray(section.totals) ? section.totals : [];

  return {
    id: normalizeString(section.id, `statement-section-${index}`),
    title: normalizeString(section.title ?? section.name, `Section ${index + 1}`),
    rows: rows.map(adaptStatementRow),
    totals: totals.map(adaptStatementRow),
  };
}

function adaptStatementTotals(value: unknown): StatementTotals {
  const totals = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    primary: normalizeDecimal(totals.amount ?? totals.current_amount ?? totals.currentAmount),
    comparison: normalizeDecimal(totals.comparison_amount ?? totals.comparisonAmount),
    variance: normalizeDecimal(totals.variance),
    variancePercent: normalizeDecimal(totals.variance_percent ?? totals.variancePercent),
    isBalanced: normalizeBoolean(totals.is_balanced ?? totals.isBalanced),
  };
}

export function adaptProfitLossReport(payload: unknown): ProfitLossReport {
  const raw = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const sectionValues = Array.isArray(raw.sections) ? raw.sections : Array.isArray(raw.statement_sections) ? raw.statement_sections : [];

  return {
    title: normalizeString(raw.title, "Profit & Loss"),
    currencyCode: normalizeNullableString(raw.currency_code ?? raw.currencyCode),
    fromDate: normalizeNullableString(raw.from_date ?? raw.fromDate ?? raw.start_date ?? raw.startDate),
    toDate: normalizeNullableString(raw.to_date ?? raw.toDate ?? raw.end_date ?? raw.endDate),
    basis: normalizeBasis(raw.basis),
    comparisonMode: normalizeComparisonMode(raw.comparison_mode ?? raw.comparisonMode),
    comparisonLabel: normalizeNullableString(raw.comparison_label ?? raw.comparisonLabel),
    sections: sectionValues.map(adaptStatementSection),
    netProfit: adaptStatementTotals(raw.net_profit ?? raw.netProfit ?? raw.totals),
  };
}

export function adaptBalanceSheetReport(payload: unknown): BalanceSheetReport {
  const raw = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const sectionValues = Array.isArray(raw.sections) ? raw.sections : Array.isArray(raw.statement_sections) ? raw.statement_sections : [];
  const totals = (raw.totals && typeof raw.totals === "object" ? raw.totals : {}) as Record<string, unknown>;

  return {
    title: normalizeString(raw.title, "Balance Sheet"),
    currencyCode: normalizeNullableString(raw.currency_code ?? raw.currencyCode),
    asOfDate: normalizeNullableString(raw.as_of_date ?? raw.asOfDate ?? raw.report_date ?? raw.reportDate),
    comparisonMode: normalizeComparisonMode(raw.comparison_mode ?? raw.comparisonMode),
    comparisonLabel: normalizeNullableString(raw.comparison_label ?? raw.comparisonLabel),
    sections: sectionValues.map(adaptStatementSection),
    totals: {
      assets: adaptStatementTotals(totals.assets ?? totals.total_assets ?? totals.totalAssets),
      liabilitiesAndEquity: adaptStatementTotals(totals.liabilities_and_equity ?? totals.liabilitiesAndEquity ?? totals.total_liabilities_and_equity ?? totals.totalLiabilitiesAndEquity),
    },
  };
}

function adaptLedgerLine(entry: unknown, index: number): GeneralLedgerLine {
  const row = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
  return {
    id: normalizeString(row.id, `ledger-line-${index}`),
    transactionDate: normalizeNullableString(row.transaction_date ?? row.transactionDate ?? row.date),
    postingDate: normalizeNullableString(row.posting_date ?? row.postingDate),
    journalReference: normalizeNullableString(row.journal_reference ?? row.journalReference ?? row.entry_number ?? row.entryNumber),
    sourceLabel: normalizeNullableString(row.source_label ?? row.sourceLabel ?? row.source_module ?? row.sourceModule),
    description: normalizeNullableString(row.description ?? row.memo),
    debit: normalizeDecimal(row.debit ?? row.debit_amount ?? row.debitAmount),
    credit: normalizeDecimal(row.credit ?? row.credit_amount ?? row.creditAmount),
    runningBalance: normalizeDecimal(row.running_balance ?? row.runningBalance),
  };
}

export function adaptGeneralLedgerReport(payload: unknown): GeneralLedgerReport {
  const raw = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const linesRaw = Array.isArray(raw.lines) ? raw.lines : Array.isArray(raw.items) ? raw.items : [];
  const paginationRaw = (raw.pagination && typeof raw.pagination === "object" ? raw.pagination : {}) as Record<string, unknown>;
  const sourceOptions = Array.isArray(raw.available_sources)
    ? raw.available_sources.map(adaptFilterOption).filter((value): value is ReportFilterOption => Boolean(value))
    : [];

  return {
    title: normalizeString(raw.title, "General Ledger"),
    currencyCode: normalizeNullableString(raw.currency_code ?? raw.currencyCode),
    accountId: normalizeNullableString(raw.account_id ?? raw.accountId),
    accountName: normalizeNullableString(raw.account_name ?? raw.accountName),
    fromDate: normalizeNullableString(raw.from_date ?? raw.fromDate),
    toDate: normalizeNullableString(raw.to_date ?? raw.toDate),
    openingBalance: normalizeDecimal(raw.opening_balance ?? raw.openingBalance),
    closingBalance: normalizeDecimal(raw.closing_balance ?? raw.closingBalance),
    lines: linesRaw.map(adaptLedgerLine),
    pagination: {
      nextCursor: normalizeNullableString(paginationRaw.next_cursor ?? paginationRaw.nextCursor ?? raw.next_cursor ?? raw.nextCursor),
      hasMore: normalizeBoolean(paginationRaw.has_more ?? paginationRaw.hasMore) ?? Boolean(paginationRaw.next_cursor ?? paginationRaw.nextCursor ?? raw.next_cursor ?? raw.nextCursor),
    },
    sourceOptions,
  };
}
