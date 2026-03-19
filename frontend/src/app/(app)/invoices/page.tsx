import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Invoices"
      description="Sales documents, approvals, and posting flows will be layered on this shell next."
      requiredPermissions={['invoices.read']}
      plannedCapabilities={['Backend-connected list and detail views', 'Permission-specific actions and mutations', 'Dense accounting-friendly tables, filters, and drawers']}
    />
  );
}
