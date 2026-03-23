export type AuditFacetCount = {
  value: string | null;
  count: number;
};

export type AuditLogEntry = {
  id: string;
  organizationId?: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadataJson?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
};

export type ActivityCenterFilters = {
  q?: string;
  action?: string;
  entityType?: string;
  actorEmail?: string;
  entityId?: string;
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
};

export type ActivityCenterResponse = {
  items: AuditLogEntry[];
  totalCount: number;
  actorCount: number;
  actionCount: number;
  entityTypeCount: number;
  topActions: AuditFacetCount[];
  topEntityTypes: AuditFacetCount[];
  hasMore: boolean;
  appliedLimit: number;
};
