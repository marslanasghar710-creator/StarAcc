export type FunnelEventName =
  | "landing_viewed"
  | "landing_cta_clicked"
  | "features_viewed"
  | "faq_interacted"
  | "demo_entered"
  | "signup_started"
  | "signup_completed"
  | "workspace_creation_started"
  | "workspace_created"
  | "activation_entered"
  | "activation_checklist_item_completed"
  | "first_business_action_completed"
  | "activation_completed";

export type FunnelEventPayload = {
  event_name: FunnelEventName;
  timestamp: string;
  anonymous_id?: string | null;
  user_id?: string | null;
  organization_id?: string | null;
  session_id?: string | null;
  route?: string | null;
  referrer?: string | null;
  source?: string | null;
  campaign?: string | null;
  medium?: string | null;
  term?: string | null;
  content?: string | null;
  experience?: "demo" | "real" | null;
  experiment_bucket?: string | null;
  metadata?: Record<string, unknown>;
};

export type AttributionContext = {
  source?: string | null;
  campaign?: string | null;
  medium?: string | null;
  term?: string | null;
  content?: string | null;
  referrer?: string | null;
};
