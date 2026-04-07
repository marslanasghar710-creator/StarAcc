export type ActivationChecklistItemState = {
  item_id: string;
  version: string;
  status: "pending" | "complete" | "blocked" | "hidden" | string;
  completed_at?: string | null;
  completion_source?: string | null;
  blocking_reasons?: string[];
  evidence?: Record<string, unknown>;
};

export type ActivationSnapshot = {
  org_id: string;
  workspace_id?: string | null;
  checklist_version: string;
  status: "not_started" | "in_progress" | "completed" | string;
  completion_percent: number;
  completed_item_count: number;
  total_visible_item_count: number;
  required_completed_count: number;
  required_total_count: number;
  items: ActivationChecklistItemState[];
  milestones: {
    initial_setup_complete: boolean;
    first_transaction_workflow_started: boolean;
    first_operational_record_created: boolean;
    first_financial_review_completed: boolean;
  };
  recommended_next_item_ids: string[];
  activated_at?: string | null;
  first_entered_activation_at?: string | null;
  last_evaluated_at: string;
};

export type ActivationSnapshotResponse = {
  snapshot: ActivationSnapshot;
  presentation_preferences?: {
    checklist_dismissed: boolean;
    app_banner_dismissed: boolean;
    preferred_surface: string;
  } | null;
};
