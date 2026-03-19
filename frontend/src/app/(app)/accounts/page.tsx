import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Accounts"
      description="Chart of accounts management, balances, and account maintenance will plug into this scaffold."
      plannedCapabilities={['Account list and detail drawers', 'Balances and reconciliation states', 'Bulk maintenance actions']}
    />
  );
}
