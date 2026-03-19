import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Banking"
      description="Bank accounts, feeds, and reconciliation experiences will mount into this workspace."
      plannedCapabilities={['Bank account overview', 'Feed import status', 'Reconciliation workbench scaffolds']}
    />
  );
}
