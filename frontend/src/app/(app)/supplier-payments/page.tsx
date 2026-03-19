import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Supplier Payments"
      description="Outgoing payments, remittance flows, and allocations will arrive in later prompts."
      plannedCapabilities={['Disbursement workflows', 'Allocation and remittance states', 'Banking-linked payment history']}
    />
  );
}
