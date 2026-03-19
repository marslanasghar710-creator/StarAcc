import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Customers"
      description="Customer records, receivables context, and lifecycle actions will plug into this route."
      requiredPermissions={['customers.read']}
      plannedCapabilities={['Backend-connected list and detail views', 'Permission-specific actions and mutations', 'Dense accounting-friendly tables, filters, and drawers']}
    />
  );
}
