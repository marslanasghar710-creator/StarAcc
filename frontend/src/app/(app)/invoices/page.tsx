import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Invoices"
      description="Sales invoicing, status transitions, and allocations will connect to the backend foundation later."
      plannedCapabilities={['Invoice list and status filters', 'Invoice compose/edit workspace', 'Delivery, approval, and allocation actions']}
    />
  );
}
