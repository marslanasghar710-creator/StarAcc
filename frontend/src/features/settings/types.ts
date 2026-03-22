export type SettingsAvailabilityState = "available" | "read-only" | "unavailable";

export type SettingsSectionStatus = {
  id: string;
  title: string;
  description: string;
  href: string;
  availability: SettingsAvailabilityState;
  requiredPermissions: string[];
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
  notes?: string | null;
};

export type TaxCodeRecord = {
  id: string;
  organizationId: string | null;
  name: string;
  code: string;
  rate: string;
  type: string | null;
  description: string | null;
  appliesToSales: boolean;
  appliesToPurchases: boolean;
  isActive: boolean;
  isDefaultSales: boolean;
  isDefaultPurchases: boolean;
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

export type DocumentSettings = {
  invoicePrefix: string | null;
  billPrefix: string | null;
  journalPrefix: string | null;
  creditNotePrefix: string | null;
  readOnlyReason?: string | null;
};

export type DocumentSettingsPayload = {
  invoice_prefix?: string | null;
  bill_prefix?: string | null;
  journal_prefix?: string | null;
  credit_note_prefix?: string | null;
};

export type AccountingSettings = {
  defaultLocale: string | null;
  dateFormat: string | null;
  numberFormat: string | null;
  taxEnabled: boolean | null;
  multiCurrencyEnabled: boolean | null;
  baseCurrency: string | null;
  timezone: string | null;
  readOnlyReason?: string | null;
};

export type AccountingSettingsPayload = {
  default_locale?: string | null;
  date_format?: string | null;
  number_format?: string | null;
  tax_enabled?: boolean | null;
  multi_currency_enabled?: boolean | null;
  base_currency?: string | null;
  timezone?: string | null;
};

export type RawOrganization = Record<string, unknown>;
export type RawSettings = Record<string, unknown>;
export type RawFiscalPeriod = Record<string, unknown>;
export type RawTaxCode = Record<string, unknown>;
