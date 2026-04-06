export type DashboardWidgetKey =
  | "summary_strip"
  | "attention_center"
  | "trend"
  | "aging"
  | "workflows"
  | "recent_activity"
  | "recommendations";

export type DashboardWidgetDefinition = {
  key: DashboardWidgetKey;
  title: string;
  requiredPermissions: string[];
  minMaturity: "new" | "active" | "mature";
};

const MATURITY_WEIGHT: Record<string, number> = { new: 0, active: 1, mature: 2 };

export const dashboardWidgetRegistry: DashboardWidgetDefinition[] = [
  { key: "summary_strip", title: "Top summary", requiredPermissions: [], minMaturity: "new" },
  { key: "attention_center", title: "Attention center", requiredPermissions: [], minMaturity: "new" },
  { key: "trend", title: "Revenue vs expense", requiredPermissions: [], minMaturity: "active" },
  { key: "aging", title: "Aging overview", requiredPermissions: [], minMaturity: "active" },
  { key: "workflows", title: "Workflow status", requiredPermissions: [], minMaturity: "new" },
  { key: "recent_activity", title: "Recent activity", requiredPermissions: [], minMaturity: "new" },
  { key: "recommendations", title: "Recommended next actions", requiredPermissions: [], minMaturity: "new" },
];

export function resolveWidgets(
  maturity: "new" | "active" | "mature" | string,
  hasPermission: (permissionCode: string) => boolean,
): DashboardWidgetDefinition[] {
  const maturityWeight = MATURITY_WEIGHT[maturity] ?? 0;
  return dashboardWidgetRegistry.filter((widget) => {
    const allowedByMaturity = maturityWeight >= MATURITY_WEIGHT[widget.minMaturity];
    const allowedByPermissions = widget.requiredPermissions.every((permission) => hasPermission(permission));
    return allowedByMaturity && allowedByPermissions;
  });
}
