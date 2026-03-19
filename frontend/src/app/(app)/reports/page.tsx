import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Reports"
      description="Financial report launchers and exports will reuse this route foundation."
      requiredPermissions={['reports.profit_loss.read', 'reports.balance_sheet.read', 'reports.trial_balance.read']}
      plannedCapabilities={['Backend-connected list and detail views', 'Permission-specific actions and mutations', 'Dense accounting-friendly tables, filters, and drawers']}
    />
  );
}
