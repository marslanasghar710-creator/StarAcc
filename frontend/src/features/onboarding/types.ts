export type OnboardingPath = "explore_demo" | "setup_real" | "expert_skip";
export type OnboardingPersona = "business_owner" | "accountant" | "finance_manager" | "operator_admin" | "exploring";
export type OnboardingTaskStatus = "pending" | "completed" | "skipped";

export type OnboardingTask = {
  key: string;
  title: string;
  description: string;
  stage: string;
  required: boolean;
  status: OnboardingTaskStatus;
  blocked: boolean;
  depends_on: string[];
  route?: string | null;
  persona_priority: boolean;
  permissions: string[];
};

export type OnboardingStatus = {
  organization_id: string;
  path?: OnboardingPath | null;
  persona?: OnboardingPersona | null;
  current_step?: string | null;
  progress_percent: number;
  completion_tier: number;
  readiness: Record<string, boolean | number>;
  tasks: OnboardingTask[];
  next_recommended_action?: OnboardingTask | null;
  dismissed_prompts: string[];
  is_demo_org: boolean;
};

export type OnboardingResumeResponse = {
  resume_to: string;
  status: OnboardingStatus;
};
