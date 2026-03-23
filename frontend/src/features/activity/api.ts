import { apiClient } from "@/lib/api/client";

import type { ActivityCenterFilters, ActivityCenterResponse, AuditFacetCount, AuditLogEntry } from "@/features/activity/types";

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableStringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : typeof value === "string" && value !== "" && !Number.isNaN(Number(value)) ? Number(value) : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function adaptFacet(raw: Record<string, unknown>): AuditFacetCount {
  return {
    value: nullableStringValue(raw.value),
    count: numberValue(raw.count),
  };
}

function adaptAuditLogEntry(raw: Record<string, unknown>): AuditLogEntry {
  return {
    id: stringValue(raw.id),
    organizationId: nullableStringValue(raw.organization_id ?? raw.organizationId) ?? undefined,
    actorUserId: nullableStringValue(raw.actor_user_id ?? raw.actorUserId),
    actorEmail: nullableStringValue(raw.actor_email ?? raw.actorEmail),
    action: stringValue(raw.action, "event"),
    entityType: stringValue(raw.entity_type ?? raw.entityType, "entity"),
    entityId: nullableStringValue(raw.entity_id ?? raw.entityId),
    metadataJson: objectValue(raw.metadata_json ?? raw.metadataJson),
    ipAddress: nullableStringValue(raw.ip_address ?? raw.ipAddress),
    createdAt: stringValue(raw.created_at ?? raw.createdAt),
  };
}

function buildQuery(filters: ActivityCenterFilters) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.action?.trim()) params.set("action", filters.action.trim());
  if (filters.entityType?.trim()) params.set("entity_type", filters.entityType.trim());
  if (filters.actorEmail?.trim()) params.set("actor_email", filters.actorEmail.trim());
  if (filters.entityId?.trim()) params.set("entity_id", filters.entityId.trim());
  if (filters.createdFrom?.trim()) params.set("created_from", filters.createdFrom.trim());
  if (filters.createdTo?.trim()) params.set("created_to", filters.createdTo.trim());
  if (filters.limit) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getActivityCenter(organizationId: string, filters: ActivityCenterFilters = {}): Promise<ActivityCenterResponse> {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/activity-center${buildQuery(filters)}`);
  const payload = asRecord(response);

  return {
    items: asArray<Record<string, unknown>>(payload.items).map(adaptAuditLogEntry),
    totalCount: numberValue(payload.total_count ?? payload.totalCount),
    actorCount: numberValue(payload.actor_count ?? payload.actorCount),
    actionCount: numberValue(payload.action_count ?? payload.actionCount),
    entityTypeCount: numberValue(payload.entity_type_count ?? payload.entityTypeCount),
    topActions: asArray<Record<string, unknown>>(payload.top_actions ?? payload.topActions).map(adaptFacet),
    topEntityTypes: asArray<Record<string, unknown>>(payload.top_entity_types ?? payload.topEntityTypes).map(adaptFacet),
    hasMore: booleanValue(payload.has_more ?? payload.hasMore),
    appliedLimit: numberValue(payload.applied_limit ?? payload.appliedLimit, filters.limit ?? 100),
  };
}
