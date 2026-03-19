import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Customer Payments"
      description="Receipt capture, allocations, and audit trails will be introduced in future prompts."
      plannedCapabilities={['Receipt list and search', 'Allocation workbench', 'Bank matching context']}
    />
  );
}
