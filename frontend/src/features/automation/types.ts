export type AutomationRuleCondition = {
  field: string;
  operator: string;
  value: string | number | boolean | null;
};

export type AutomationRule = {
  id: string;
  organizationId?: string;
  name: string;
  ruleType: string;
  priority: number;
  isActive: boolean;
  description?: string | null;
  entityType?: string | null;
  triggerEvent?: string | null;
  actionType?: string | null;
  conditions: AutomationRuleCondition[];
  actionConfig?: Record<string, unknown> | null;
  archivedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AutomationRuleMutationPayload = {
  name: string;
  rule_type: string;
  priority: number;
  is_active: boolean;
  description?: string | null;
  entity_type?: string | null;
  trigger_event?: string | null;
  action_type?: string | null;
  conditions?: Array<Record<string, unknown>>;
  action_config?: Record<string, unknown> | null;
};

export type AutomationRuleTestResult = {
  matched: boolean;
  summary: string;
  trace: string[];
  metadata?: Record<string, unknown> | null;
};

export type Suggestion = {
  id: string;
  organizationId?: string;
  suggestionType: string;
  status: string;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  targetEntityLabel?: string | null;
  confidenceScore?: number | null;
  reasonSummary?: string | null;
  reviewRequired: boolean;
  explanationMetadata?: Record<string, unknown> | null;
  recommendation?: string | null;
  sourceJobId?: string | null;
  sourceRuleId?: string | null;
  createdAt?: string | null;
  reviewedAt?: string | null;
};

export type DocumentIntelligenceJob = {
  id: string;
  organizationId?: string;
  status: string;
  fileId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  documentType?: string | null;
  attempts: number;
  reviewRequired: boolean;
  errorMessage?: string | null;
  resultAvailable: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
};

export type DocumentExtractionResult = {
  jobId: string;
  status: string;
  reviewRequired: boolean;
  extractedFields: Record<string, unknown>;
  lineItems: Array<Record<string, unknown>>;
  warnings: string[];
  explanationMetadata?: Record<string, unknown> | null;
  rawResult?: Record<string, unknown> | null;
};

export type DocumentExtractionPayload = {
  file_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  document_type?: string | null;
};

export type AIJob = {
  id: string;
  organizationId?: string;
  jobType: string;
  status: string;
  attempts: number;
  maxAttempts?: number | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  errorMessage?: string | null;
  progressPercent?: number | null;
  reviewRequired: boolean;
  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type CodingSuggestionRequest = {
  entity_type: string;
  entity_id: string;
};
