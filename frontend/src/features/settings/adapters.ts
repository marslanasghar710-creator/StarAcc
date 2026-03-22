import { sanitizeDecimalInput } from "@/lib/accounting/decimal";

import type {
  AccountingSettings,
  DocumentSettings,
  FiscalPeriodRecord,
  OrganizationPreferences,
  RawFiscalPeriod,
  RawOrganization,
  RawSettings,
  RawTaxCode,
  TaxCodeRecord,
} from "@/features/settings/types";

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : null;
}

function normalizeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function normalizeDecimal(value: unknown): string {
  return sanitizeDecimalInput(typeof value === "string" || typeof value === "number" ? value : 0);
}

export function adaptOrganizationPreferences(rawOrganization: RawOrganization, rawSettings?: RawSettings | null): OrganizationPreferences {
  return {
    id: normalizeString(rawOrganization.id),
    organizationId: normalizeString(rawOrganization.id),
    name: normalizeString(rawOrganization.name, "Organization"),
    legalName: normalizeNullableString(rawOrganization.legal_name ?? rawOrganization.legalName),
    registrationNumber: normalizeNullableString(rawOrganization.registration_number ?? rawOrganization.registrationNumber),
    taxNumber: normalizeNullableString(rawOrganization.tax_number ?? rawOrganization.taxNumber),
    baseCurrency: normalizeNullableString(rawOrganization.base_currency ?? rawOrganization.baseCurrency),
    timezone: normalizeNullableString(rawOrganization.timezone),
    country: normalizeNullableString(rawOrganization.country),
    contactEmail: normalizeNullableString(rawOrganization.contact_email ?? rawOrganization.contactEmail),
    contactPhone: normalizeNullableString(rawOrganization.contact_phone ?? rawOrganization.contactPhone),
    website: normalizeNullableString(rawOrganization.website),
    fiscalYearStartMonth: normalizeNumber(rawOrganization.fiscal_year_start_month ?? rawOrganization.fiscalYearStartMonth),
    fiscalYearStartDay: normalizeNumber(rawOrganization.fiscal_year_start_day ?? rawOrganization.fiscalYearStartDay),
    status: normalizeNullableString(rawOrganization.status),
    createdAt: normalizeNullableString(rawOrganization.created_at ?? rawOrganization.createdAt),
    updatedAt: normalizeNullableString(rawOrganization.updated_at ?? rawOrganization.updatedAt ?? rawSettings?.updated_at ?? rawSettings?.updatedAt),
  };
}

export function adaptFiscalPeriod(raw: RawFiscalPeriod): FiscalPeriodRecord {
  return {
    id: normalizeString(raw.id),
    organizationId: normalizeNullableString(raw.organization_id ?? raw.organizationId),
    name: normalizeString(raw.name, "Fiscal period"),
    startDate: normalizeString(raw.start_date ?? raw.startDate),
    endDate: normalizeString(raw.end_date ?? raw.endDate),
    status: (normalizeString(raw.status, "open") as FiscalPeriodRecord["status"]),
    fiscalYear: normalizeNumber(raw.fiscal_year ?? raw.fiscalYear),
    periodNumber: normalizeNumber(raw.period_number ?? raw.periodNumber),
    closedAt: normalizeNullableString(raw.closed_at ?? raw.closedAt),
    closedBy: normalizeNullableString(raw.closed_by ?? raw.closedBy),
    notes: normalizeNullableString(raw.notes),
  };
}

export function adaptTaxCode(raw: RawTaxCode): TaxCodeRecord {
  return {
    id: normalizeString(raw.id),
    organizationId: normalizeNullableString(raw.organization_id ?? raw.organizationId),
    name: normalizeString(raw.name, "Tax code"),
    code: normalizeString(raw.code, "TAX"),
    rate: normalizeDecimal(raw.rate ?? raw.percentage),
    type: normalizeNullableString(raw.type ?? raw.tax_type ?? raw.taxType),
    description: normalizeNullableString(raw.description),
    appliesToSales: normalizeBoolean(raw.applies_to_sales ?? raw.appliesToSales ?? raw.sales_applicable ?? raw.salesApplicable) ?? true,
    appliesToPurchases: normalizeBoolean(raw.applies_to_purchases ?? raw.appliesToPurchases ?? raw.purchase_applicable ?? raw.purchaseApplicable) ?? true,
    isActive: normalizeBoolean(raw.is_active ?? raw.isActive) ?? true,
    isDefaultSales: normalizeBoolean(raw.is_default_sales ?? raw.isDefaultSales) ?? false,
    isDefaultPurchases: normalizeBoolean(raw.is_default_purchases ?? raw.isDefaultPurchases) ?? false,
    createdAt: normalizeNullableString(raw.created_at ?? raw.createdAt),
    updatedAt: normalizeNullableString(raw.updated_at ?? raw.updatedAt),
  };
}

export function adaptDocumentSettings(rawSettings: RawSettings): DocumentSettings {
  return {
    invoicePrefix: normalizeNullableString(rawSettings.invoice_prefix ?? rawSettings.invoicePrefix),
    billPrefix: normalizeNullableString(rawSettings.bill_prefix ?? rawSettings.billPrefix),
    journalPrefix: normalizeNullableString(rawSettings.journal_prefix ?? rawSettings.journalPrefix),
    creditNotePrefix: normalizeNullableString(rawSettings.credit_note_prefix ?? rawSettings.creditNotePrefix),
  };
}

export function adaptAccountingSettings(rawOrganization: RawOrganization, rawSettings: RawSettings): AccountingSettings {
  return {
    defaultLocale: normalizeNullableString(rawSettings.default_locale ?? rawSettings.defaultLocale),
    dateFormat: normalizeNullableString(rawSettings.date_format ?? rawSettings.dateFormat),
    numberFormat: normalizeNullableString(rawSettings.number_format ?? rawSettings.numberFormat),
    taxEnabled: normalizeBoolean(rawSettings.tax_enabled ?? rawSettings.taxEnabled),
    multiCurrencyEnabled: normalizeBoolean(rawSettings.multi_currency_enabled ?? rawSettings.multiCurrencyEnabled),
    baseCurrency: normalizeNullableString(rawOrganization.base_currency ?? rawOrganization.baseCurrency),
    timezone: normalizeNullableString(rawOrganization.timezone),
  };
}
