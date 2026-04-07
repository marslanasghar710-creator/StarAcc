export type OrganizationSummary = {
  id: string;
  name: string;
  legal_name?: string | null;
  registration_number?: string | null;
  tax_number?: string | null;
  base_currency: string;
  fiscal_year_start_month: number;
  fiscal_year_start_day: number;
  timezone: string;
  status: string;
  is_demo?: boolean;
  demo_scenario_key?: string | null;
  seed_version?: string | null;
  seeded_at?: string | null;
  seeded_by_system?: boolean;
  resettable_in_non_prod?: boolean;
  demo_expires_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationSettings = {
  id: string;
  organization_id: string;
  default_locale: string;
  date_format: string;
  number_format: string;
  invoice_prefix: string;
  bill_prefix: string;
  journal_prefix: string;
  tax_enabled: boolean;
  multi_currency_enabled: boolean;
};

export type OrganizationMember = {
  id: string;
  user_id: string;
  organization_id: string;
  role_id: string;
  is_default: boolean;
  status: string;
  joined_at?: string | null;
};

export type OrganizationCreatePayload = {
  name: string;
  base_currency: string;
  timezone: string;
  legal_name?: string | null;
  fiscal_year_start_month?: number;
  fiscal_year_start_day?: number;
};
