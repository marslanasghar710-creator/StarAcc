import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Suppliers"
      description="Supplier master data, payables relationships, and defaults will be implemented later."
      plannedCapabilities={['Supplier list and profiles', 'Payment terms and defaults', 'AP aging drill-ins']}
    />
  );
}
