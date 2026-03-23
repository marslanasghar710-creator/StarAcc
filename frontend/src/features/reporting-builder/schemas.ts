import { z } from "zod";

export const customReportFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["eq", "neq", "contains", "starts_with", "gt", "gte", "lt", "lte", "between", "in", "is_null", "not_null"]),
  value: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  valueTo: z.string().optional().nullable(),
});

export const customReportSortSchema = z.object({
  field: z.string().min(1),
  direction: z.enum(["asc", "desc"]),
});

export const customReportDefinitionSchema = z.object({
  datasetId: z.string().min(1, "Select a dataset."),
  columns: z.array(z.string().min(1)).min(1, "Pick at least one column."),
  filters: z.array(customReportFilterSchema),
  groupings: z.array(z.string().min(1)),
  sorting: z.array(customReportSortSchema),
  displayOptions: z.object({ visibility: z.enum(["private", "organization"]).optional() }).optional().nullable(),
});

export const customReportPreviewSchema = customReportDefinitionSchema.extend({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(200),
});

export type CustomReportDefinitionValues = z.infer<typeof customReportDefinitionSchema>;
export type CustomReportPreviewValues = z.infer<typeof customReportPreviewSchema>;
