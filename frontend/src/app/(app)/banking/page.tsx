import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Banking"
      description="Bank accounts, transactions, and reconciliation UX will be layered into this module later."
      requiredPermissions={['bank_accounts.read', 'bank_transactions.read']}
      plannedCapabilities={['Backend-connected list and detail views', 'Permission-specific actions and mutations', 'Dense accounting-friendly tables, filters, and drawers']}
    />
  );
}
