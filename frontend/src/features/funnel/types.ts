export type FunnelDomain = "acquisition" | "demo" | "signup" | "activation";
export type FunnelStage =
  | "acquired"
  | "engaged"
  | "demo_entered"
  | "signup_started"
  | "authenticated"
  | "workspace_started"
  | "workspace_created"
  | "activation_started"
  | "activated"
  | "handoff_to_app";

export type PageType = "landing" | "marketing" | "demo" | "signup" | "activation" | "app";
export type SurfaceType = "public_site" | "demo" | "signup" | "workspace_creation" | "activation" | "authenticated_app";

export type AnalyticsEventName =
  | "marketing.landing.viewed"
  | "marketing.section.viewed"
  | "marketing.cta.clicked"
  | "marketing.faq.toggled"
  | "marketing.nav.clicked"
  | "demo.entry.started"
  | "demo.workspace.entered"
  | "demo.convert_to_signup.clicked"
  | "auth.signup.started"
  | "auth.signup.completed"
  | "auth.login.completed"
  | "auth.error.shown"
  | "workspace.creation.started"
  | "workspace.creation.completed"
  | "workspace.creation.failed"
  | "activation.flow.entered"
  | "activation.checklist.viewed"
  | "activation.checklist_item.completed"
  | "activation.completed"
  | "app.handoff.completed";

export const EVENT_VERSIONS: Record<AnalyticsEventName, number> = {
  "marketing.landing.viewed": 1,
  "marketing.section.viewed": 1,
  "marketing.cta.clicked": 1,
  "marketing.faq.toggled": 1,
  "marketing.nav.clicked": 1,
  "demo.entry.started": 1,
  "demo.workspace.entered": 1,
  "demo.convert_to_signup.clicked": 1,
  "auth.signup.started": 1,
  "auth.signup.completed": 1,
  "auth.login.completed": 1,
  "auth.error.shown": 1,
  "workspace.creation.started": 1,
  "workspace.creation.completed": 1,
  "workspace.creation.failed": 1,
  "activation.flow.entered": 1,
  "activation.checklist.viewed": 1,
  "activation.checklist_item.completed": 1,
  "activation.completed": 1,
  "app.handoff.completed": 1,
};

export type AnalyticsEventEnvelope = {
  event_name: AnalyticsEventName;
  event_version: number;
  occurred_at: string;
  session_id: string;
  anonymous_id: string;
  user_id?: string | null;
  org_id?: string | null;
  workspace_id?: string | null;
  route?: string | null;
  path?: string | null;
  page_type?: PageType;
  surface?: SurfaceType;
  funnel_domain?: FunnelDomain;
  funnel_stage?: FunnelStage;
  is_demo?: boolean;
  is_authenticated?: boolean;
  environment?: "development" | "staging" | "production";
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  landing_variant?: string | null;
  experiment_assignments?: Record<string, string>;
  device_type?: "mobile" | "tablet" | "desktop";
  viewport_bucket?: "sm" | "md" | "lg" | "xl" | "2xl";
  locale?: string | null;
  timezone?: string | null;
  country?: string | null;
  payload: Record<string, unknown>;
};
