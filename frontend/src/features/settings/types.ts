export type SettingsAvailabilityState = "available" | "read-only" | "unavailable";
export type SettingsDataSource = "native" | "legacy";

export type SettingsSectionStatus = {
  id: string;
  title: string;
  description: string;
  href: string;
  availability: SettingsAvailabilityState;
  requiredPermissions: readonly string[];
  reason?: string | null;
};

export type OrganizationPreferences = {
  id: string;
  organizationId: string;
  name: string;
  legalName: string | null;
  registrationNumber: string | null;
  taxNumber: string | null;
  baseCurrency: string | null;
  timezone: string | null;
  country: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  fiscalYearStartMonth: number | null;
  fiscalYearStartDay: number | null;
  defaultLocale: string | null;
  dateFormat: string | null;
  numberFormat: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type OrganizationPreferencesPayload = {
  name: string;
  legal_name?: string | null;
  registration_number?: string | null;
  tax_number?: string | null;
  base_currency?: string | null;
  timezone?: string | null;
  country?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  fiscal_year_start_month?: number | null;
  fiscal_year_start_day?: number | null;
};

export type FiscalPeriodStatus = "open" | "closed" | "locked";

export type FiscalPeriodRecord = {
  id: string;
  organizationId: string | null;
  name: string;
  startDate: string;
  endDate: string;
  status: FiscalPeriodStatus;
  fiscalYear: number | null;
  periodNumber: number | null;
  closedAt: string | null;
  closedBy: string | null;
  notes: string | null;
};

export type FiscalPeriodPayload = {
  name: string;
  start_date: string;
  end_date: string;
  fiscal_year?: number;
  period_number?: number;
  notes?: string | null;
};

export type TaxCodeRecord = {
  id: string;
  organizationId: string | null;
  name: string;
  code: string;
  rate: string | null;
  type: string | null;
  description: string | null;
  appliesToSales: boolean;
  appliesToPurchases: boolean;
  isActive: boolean;
  isDefaultSales: boolean;
  isDefaultPurchases: boolean;
  readOnlyReason?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type TaxCodePayload = {
  name: string;
  code: string;
  rate: string;
  type?: string | null;
  description?: string | null;
  applies_to_sales?: boolean;
  applies_to_purchases?: boolean;
  is_active?: boolean;
};

export type TaxCodeCollection = {
  items: TaxCodeRecord[];
  dataSource: SettingsDataSource;
  supportsWrite: boolean;
  readOnlyReason?: string | null;
};

export type DocumentSettings = {
  invoicePrefix: string | null;
  billPrefix: string | null;
  journalPrefix: string | null;
  creditNotePrefix: string | null;
  paymentPrefix: string | null;
  supplierCreditPrefix: string | null;
  supplierPaymentPrefix: string | null;
  quotePrefix: string | null;
  purchaseOrderPrefix: string | null;
  nextInvoiceNumber: number | null;
  nextBillNumber: number | null;
  nextJournalNumber: number | null;
  nextCreditNoteNumber: number | null;
  readOnlyReason?: string | null;
  dataSource?: SettingsDataSource;
};

export type DocumentSettingsPayload = {
  invoice_prefix?: string | null;
  bill_prefix?: string | null;
  journal_prefix?: string | null;
  credit_note_prefix?: string | null;
  payment_prefix?: string | null;
  supplier_credit_prefix?: string | null;
  supplier_payment_prefix?: string | null;
  quote_prefix?: string | null;
  purchase_order_prefix?: string | null;
  next_invoice_number?: number | null;
  next_bill_number?: number | null;
  next_journal_number?: number | null;
  next_credit_note_number?: number | null;
};

export type AccountingSettings = {
  defaultLocale: string | null;
  dateFormat: string | null;
  numberFormat: string | null;
  taxEnabled: boolean | null;
  multiCurrencyEnabled: boolean | null;
  baseCurrency: string | null;
  timezone: string | null;
  weekStartDay: number | null;
  defaultDocumentLanguage: string | null;
  readOnlyReason?: string | null;
  dataSource?: SettingsDataSource;
};

export type AccountingSettingsPayload = {
  default_locale?: string | null;
  date_format?: string | null;
  number_format?: string | null;
  tax_enabled?: boolean | null;
  multi_currency_enabled?: boolean | null;
  base_currency?: string | null;
  timezone?: string | null;
  week_start_day?: number | null;
  default_document_language?: string | null;
};

export type RawOrganization = Record<string, unknown>;
export type RawSettings = Record<string, unknown>;
export type RawFiscalPeriod = Record<string, unknown>;
export type RawTaxCode = Record<string, unknown>;
