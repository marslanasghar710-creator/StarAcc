export type BillingPlan = {
  code: string;
  plan_id: "starter" | "growth" | "pro";
  name: string;
  tier: string;
  is_public: boolean;
  is_enterprise: boolean;
  contact_sales_only: boolean;
  default_trial_days: number;
  intervals: Array<"monthly" | "yearly">;
  pricing: Record<string, number | string>;
  features: Record<string, boolean>;
  feature_bundle: Record<string, boolean>;
  limits: Record<string, number | string>;
};

export type BillingState = {
  account: {
    id: string;
    organization_id: string;
    status: string;
    scope_type: string;
    billing_email?: string | null;
    billing_contact_name?: string | null;
    currency: string;
    country?: string | null;
    tax_id?: string | null;
    is_billing_exempt: boolean;
  };
  subscription: {
    id: string;
    plan_code: string;
    status: string;
    billing_interval: "monthly" | "yearly";
    trial_start_at?: string | null;
    trial_end_at?: string | null;
    current_period_start?: string | null;
    current_period_end?: string | null;
    cancel_at_period_end: boolean;
    seats_purchased: number;
  };
  features: Record<string, boolean>;
  limits: Record<string, number | string>;
  usage: Record<string, { used: number; limit: number | string | null; within_limit: boolean }>;
};
