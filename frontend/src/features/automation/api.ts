import { apiClient } from "@/lib/api/client";

import type {
  AIJob,
  AutomationRule,
  AutomationRuleCondition,
  AutomationRuleMutationPayload,
  AutomationRuleTestResult,
  CodingSuggestionRequest,
  DocumentExtractionPayload,
  DocumentExtractionResult,
  DocumentIntelligenceJob,
  Suggestion,
} from "@/features/automation/types";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nullableStringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : typeof value === "string" && value !== "" && !Number.isNaN(Number(value)) ? Number(value) : fallback;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function unpackItems<T>(response: T[] | { items?: T[] }): T[] {
  return Array.isArray(response) ? response : response.items ?? [];
}

function adaptCondition(raw: Record<string, unknown>): AutomationRuleCondition {
  return {
    field: stringValue(raw.field ?? raw.attribute, "field"),
    operator: stringValue(raw.operator, "equals"),
    value: (raw.value ?? null) as string | number | boolean | null,
  };
}

function adaptAutomationRule(raw: Record<string, unknown>): AutomationRule {
  return {
    id: stringValue(raw.id),
    organizationId: nullableStringValue(raw.organization_id ?? raw.organizationId) ?? undefined,
    name: stringValue(raw.name, "Automation rule"),
    ruleType: stringValue(raw.rule_type ?? raw.ruleType ?? raw.type, "rule"),
    priority: numberValue(raw.priority, 100),
    isActive: booleanValue(raw.is_active ?? raw.isActive, true),
    description: nullableStringValue(raw.description),
    entityType: nullableStringValue(raw.entity_type ?? raw.entityType),
    triggerEvent: nullableStringValue(raw.trigger_event ?? raw.triggerEvent),
    actionType: nullableStringValue(raw.action_type ?? raw.actionType),
    conditions: asArray<Record<string, unknown>>(raw.conditions).map(adaptCondition),
    actionConfig: objectValue(raw.action_config ?? raw.actionConfig),
    archivedAt: nullableStringValue(raw.archived_at ?? raw.archivedAt),
    createdAt: nullableStringValue(raw.created_at ?? raw.createdAt),
    updatedAt: nullableStringValue(raw.updated_at ?? raw.updatedAt),
  };
}

function adaptRuleTestResult(raw: Record<string, unknown>): AutomationRuleTestResult {
  return {
    matched: booleanValue(raw.matched, false),
    summary: stringValue(raw.summary ?? raw.message ?? raw.result, "No test summary returned."),
    trace: asArray<unknown>(raw.trace ?? raw.explanations ?? raw.reasons).map((item) => typeof item === "string" ? item : JSON.stringify(item)),
    metadata: objectValue(raw.metadata ?? raw.details ?? raw.preview),
  };
}

function adaptSuggestion(raw: Record<string, unknown>, index: number): Suggestion {
  return {
    id: stringValue(raw.id, `suggestion-${index}`),
    organizationId: nullableStringValue(raw.organization_id ?? raw.organizationId) ?? undefined,
    suggestionType: stringValue(raw.suggestion_type ?? raw.suggestionType ?? raw.type, "suggestion"),
    status: stringValue(raw.status, "pending"),
    targetEntityType: nullableStringValue(raw.target_entity_type ?? raw.targetEntityType ?? raw.entity_type ?? raw.entityType),
    targetEntityId: nullableStringValue(raw.target_entity_id ?? raw.targetEntityId ?? raw.entity_id ?? raw.entityId),
    targetEntityLabel: nullableStringValue(raw.target_entity_label ?? raw.targetEntityLabel ?? raw.entity_label ?? raw.entityLabel ?? raw.title),
    confidenceScore: raw.confidence_score != null || raw.confidenceScore != null || raw.score != null ? numberValue(raw.confidence_score ?? raw.confidenceScore ?? raw.score) : null,
    reasonSummary: nullableStringValue(raw.reason_summary ?? raw.reasonSummary ?? raw.reason),
    reviewRequired: booleanValue(raw.review_required ?? raw.reviewRequired, true),
    explanationMetadata: objectValue(raw.explanation_metadata ?? raw.explanationMetadata ?? raw.explanation ?? raw.metadata),
    recommendation: nullableStringValue(raw.recommendation ?? raw.action_label ?? raw.actionLabel),
    sourceJobId: nullableStringValue(raw.source_job_id ?? raw.sourceJobId ?? raw.job_id ?? raw.jobId),
    sourceRuleId: nullableStringValue(raw.source_rule_id ?? raw.sourceRuleId ?? raw.rule_id ?? raw.ruleId),
    createdAt: nullableStringValue(raw.created_at ?? raw.createdAt),
    reviewedAt: nullableStringValue(raw.reviewed_at ?? raw.reviewedAt),
  };
}

function adaptDocumentIntelligenceJob(raw: Record<string, unknown>): DocumentIntelligenceJob {
  return {
    id: stringValue(raw.id),
    organizationId: nullableStringValue(raw.organization_id ?? raw.organizationId) ?? undefined,
    status: stringValue(raw.status, "queued"),
    fileId: nullableStringValue(raw.file_id ?? raw.fileId),
    entityType: nullableStringValue(raw.entity_type ?? raw.entityType),
    entityId: nullableStringValue(raw.entity_id ?? raw.entityId),
    documentType: nullableStringValue(raw.document_type ?? raw.documentType),
    attempts: numberValue(raw.attempts, 0),
    reviewRequired: booleanValue(raw.review_required ?? raw.reviewRequired, false),
    errorMessage: nullableStringValue(raw.error_message ?? raw.errorMessage ?? raw.last_error ?? raw.lastError),
    resultAvailable: booleanValue(raw.result_available ?? raw.resultAvailable, Boolean(raw.has_result ?? raw.hasResult)),
    createdAt: nullableStringValue(raw.created_at ?? raw.createdAt),
    updatedAt: nullableStringValue(raw.updated_at ?? raw.updatedAt),
    completedAt: nullableStringValue(raw.completed_at ?? raw.completedAt),
  };
}

function adaptDocumentExtractionResult(raw: Record<string, unknown>, fallbackJobId = ""): DocumentExtractionResult {
  return {
    jobId: stringValue(raw.job_id ?? raw.jobId, fallbackJobId),
    status: stringValue(raw.status, "completed"),
    reviewRequired: booleanValue(raw.review_required ?? raw.reviewRequired, false),
    extractedFields: objectValue(raw.extracted_fields ?? raw.extractedFields ?? raw.fields) ?? {},
    lineItems: asArray<Record<string, unknown>>(raw.line_items ?? raw.lineItems),
    warnings: asArray<unknown>(raw.warnings).map((item) => typeof item === "string" ? item : JSON.stringify(item)),
    explanationMetadata: objectValue(raw.explanation_metadata ?? raw.explanationMetadata ?? raw.metadata),
    rawResult: objectValue(raw.raw_result ?? raw.rawResult ?? raw.result),
  };
}

function adaptAIJob(raw: Record<string, unknown>): AIJob {
  return {
    id: stringValue(raw.id),
    organizationId: nullableStringValue(raw.organization_id ?? raw.organizationId) ?? undefined,
    jobType: stringValue(raw.job_type ?? raw.jobType ?? raw.type, "job"),
    status: stringValue(raw.status, "queued"),
    attempts: numberValue(raw.attempts, 0),
    maxAttempts: raw.max_attempts != null || raw.maxAttempts != null ? numberValue(raw.max_attempts ?? raw.maxAttempts) : null,
    relatedEntityType: nullableStringValue(raw.related_entity_type ?? raw.relatedEntityType ?? raw.entity_type ?? raw.entityType),
    relatedEntityId: nullableStringValue(raw.related_entity_id ?? raw.relatedEntityId ?? raw.entity_id ?? raw.entityId),
    errorMessage: nullableStringValue(raw.error_message ?? raw.errorMessage ?? raw.last_error ?? raw.lastError),
    progressPercent: raw.progress_percent != null || raw.progressPercent != null ? numberValue(raw.progress_percent ?? raw.progressPercent) : null,
    reviewRequired: booleanValue(raw.review_required ?? raw.reviewRequired, false),
    createdAt: nullableStringValue(raw.created_at ?? raw.createdAt),
    startedAt: nullableStringValue(raw.started_at ?? raw.startedAt),
    completedAt: nullableStringValue(raw.completed_at ?? raw.completedAt),
    updatedAt: nullableStringValue(raw.updated_at ?? raw.updatedAt),
    metadata: objectValue(raw.metadata ?? raw.details),
  };
}

export async function listAutomationRules(organizationId: string) {
  const response = await apiClient<Record<string, unknown>[] | { items?: Record<string, unknown>[] }>(`/organizations/${organizationId}/automation-rules`);
  return unpackItems(response).map(adaptAutomationRule);
}

export async function getAutomationRule(organizationId: string, ruleId: string) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/automation-rules/${ruleId}`);
  return adaptAutomationRule(asRecord(response));
}

export async function createAutomationRule(organizationId: string, payload: AutomationRuleMutationPayload) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/automation-rules`, { method: "POST", body: payload });
  return adaptAutomationRule(asRecord(response));
}

export async function updateAutomationRule(organizationId: string, ruleId: string, payload: Partial<AutomationRuleMutationPayload>) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/automation-rules/${ruleId}`, { method: "PATCH", body: payload });
  return adaptAutomationRule(asRecord(response));
}

export async function archiveAutomationRule(organizationId: string, ruleId: string) {
  return apiClient<void>(`/organizations/${organizationId}/automation-rules/${ruleId}`, { method: "DELETE" });
}

export async function testAutomationRule(organizationId: string, ruleId: string, payload: Record<string, unknown>) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/automation-rules/${ruleId}/test`, { method: "POST", body: payload });
  return adaptRuleTestResult(asRecord(response));
}

export async function listSuggestions(organizationId: string) {
  const response = await apiClient<Record<string, unknown>[] | { items?: Record<string, unknown>[] }>(`/organizations/${organizationId}/suggestions`);
  return unpackItems(response).map(adaptSuggestion);
}

export async function getSuggestion(organizationId: string, suggestionId: string) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/suggestions/${suggestionId}`);
  return adaptSuggestion(asRecord(response), 0);
}

export async function listSuggestionsForEntity(organizationId: string, entityType: string, entityId: string) {
  const response = await apiClient<Record<string, unknown>[] | { items?: Record<string, unknown>[] }>(`/organizations/${organizationId}/suggestions/for/${entityType}/${entityId}`);
  return unpackItems(response).map(adaptSuggestion);
}

export async function acceptSuggestion(organizationId: string, suggestionId: string) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/suggestions/${suggestionId}/accept`, { method: "POST" });
  return adaptSuggestion(asRecord(response), 0);
}

export async function rejectSuggestion(organizationId: string, suggestionId: string) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/suggestions/${suggestionId}/reject`, { method: "POST" });
  return adaptSuggestion(asRecord(response), 0);
}

export async function listDocumentIntelligenceJobs(organizationId: string) {
  const response = await apiClient<Record<string, unknown>[] | { items?: Record<string, unknown>[] }>(`/organizations/${organizationId}/document-intelligence/jobs`);
  return unpackItems(response).map(adaptDocumentIntelligenceJob);
}

export async function getDocumentIntelligenceJob(organizationId: string, jobId: string) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/document-intelligence/jobs/${jobId}`);
  return adaptDocumentIntelligenceJob(asRecord(response));
}

export async function runDocumentExtraction(organizationId: string, payload: DocumentExtractionPayload) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/document-intelligence/extract`, { method: "POST", body: payload });
  return adaptDocumentIntelligenceJob(asRecord(response));
}

export async function getDocumentIntelligenceJobResult(organizationId: string, jobId: string) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/document-intelligence/jobs/${jobId}/result`);
  return adaptDocumentExtractionResult(asRecord(response), jobId);
}

export async function listBankTransactionSuggestions(organizationId: string, bankTransactionId: string) {
  const response = await apiClient<Record<string, unknown>[] | { items?: Record<string, unknown>[]; suggestions?: Record<string, unknown>[] }>(`/organizations/${organizationId}/bank-transactions/${bankTransactionId}/suggestions`);
  const items = Array.isArray(response) ? response : response.items ?? response.suggestions ?? [];
  return items.map(adaptSuggestion);
}

export async function generateBankTransactionSuggestions(organizationId: string, bankTransactionId: string) {
  const response = await apiClient<Record<string, unknown>[] | { items?: Record<string, unknown>[]; suggestions?: Record<string, unknown>[] }>(`/organizations/${organizationId}/bank-transactions/${bankTransactionId}/generate-suggestions`, { method: "POST" });
  const items = Array.isArray(response) ? response : response.items ?? response.suggestions ?? [];
  return items.map(adaptSuggestion);
}

export async function listCodingSuggestions(organizationId: string, payload: CodingSuggestionRequest) {
  const response = await apiClient<Record<string, unknown>[] | { items?: Record<string, unknown>[]; suggestions?: Record<string, unknown>[] }>(`/organizations/${organizationId}/documents/${payload.entity_type}/${payload.entity_id}/coding-suggestions`);
  const items = Array.isArray(response) ? response : response.items ?? response.suggestions ?? [];
  return items.map(adaptSuggestion);
}

export async function generateCodingSuggestions(organizationId: string, payload: CodingSuggestionRequest) {
  const response = await apiClient<Record<string, unknown>[] | { items?: Record<string, unknown>[]; suggestions?: Record<string, unknown>[] }>(`/organizations/${organizationId}/documents/${payload.entity_type}/${payload.entity_id}/generate-coding-suggestions`, { method: "POST" });
  const items = Array.isArray(response) ? response : response.items ?? response.suggestions ?? [];
  return items.map(adaptSuggestion);
}

export async function listAIJobs(organizationId: string) {
  const response = await apiClient<Record<string, unknown>[] | { items?: Record<string, unknown>[] }>(`/organizations/${organizationId}/ai-jobs`);
  return unpackItems(response).map(adaptAIJob);
}

export async function getAIJob(organizationId: string, jobId: string) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/ai-jobs/${jobId}`);
  return adaptAIJob(asRecord(response));
}
