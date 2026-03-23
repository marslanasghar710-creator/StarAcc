export type CustomReportFieldDataType = "string" | "number" | "date" | "datetime" | "boolean" | "enum" | "uuid";
export type CustomReportFieldKind = "dimension" | "metric";
export type CustomReportFilterOperator = "eq" | "neq" | "contains" | "starts_with" | "gt" | "gte" | "lt" | "lte" | "between" | "in" | "is_null" | "not_null";
export type CustomReportSortDirection = "asc" | "desc";
export type CustomReportExportFormat = "csv" | "pdf";
export type CustomReportVisibility = "private" | "organization";

export type CustomReportFieldOption = {
  value: string;
  label: string;
};

export type CustomReportField = {
  key: string;
  label: string;
  description: string | null;
  dataType: CustomReportFieldDataType;
  kind: CustomReportFieldKind;
  filterOperators: CustomReportFilterOperator[];
  sortable: boolean;
  groupable: boolean;
  aggregations: string[];
  options: CustomReportFieldOption[];
};

export type CustomReportDatasetSummary = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  requiredPermissions: string[];
  defaultColumns: string[];
};

export type CustomReportDataset = CustomReportDatasetSummary & {
  fields: CustomReportField[];
  supportedFilters: CustomReportField[];
  supportedGroupings: CustomReportField[];
};

export type CustomReportFilter = {
  field: string;
  operator: CustomReportFilterOperator;
  value?: string | string[] | null;
  valueTo?: string | null;
};

export type CustomReportSort = {
  field: string;
  direction: CustomReportSortDirection;
};

export type CustomReportDefinitionInput = {
  datasetId: string;
  columns: string[];
  filters: CustomReportFilter[];
  groupings: string[];
  sorting: CustomReportSort[];
  displayOptions?: { visibility?: CustomReportVisibility } | null;
};

export type SavedCustomReport = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  datasetId: string;
  columns: string[];
  filters: CustomReportFilter[];
  groupings: string[];
  sorting: CustomReportSort[];
  displayOptions: { visibility?: CustomReportVisibility } | null;
  isSystemTemplate: boolean;
  createdByUserId: string | null;
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunByUserId: string | null;
  lastRunByEmail: string | null;
  visibility: CustomReportVisibility;
  validationErrors: string[];
};

export type CustomReportExecution = {
  executionId: string | null;
  status: string;
  executedAt: string;
  completedAt: string | null;
  requestedByUserId: string | null;
  requestedByEmail: string | null;
  reportDefinitionId: string | null;
};

export type CustomReportResult = {
  reportDefinitionId: string | null;
  dataset: CustomReportDatasetSummary;
  columns: CustomReportField[];
  filters: CustomReportFilter[];
  filterSummary: string[];
  groupings: CustomReportField[];
  sorting: CustomReportSort[];
  rows: Array<Record<string, unknown>>;
  totals: Record<string, unknown> | null;
  rowCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  validationErrors: string[];
  execution: CustomReportExecution;
};

export type CustomReportPreviewInput = CustomReportDefinitionInput & {
  page: number;
  pageSize: number;
};
