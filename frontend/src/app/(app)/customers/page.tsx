import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Customers"
      description="Customer directories, credit controls, and contact details will be added in feature prompts."
      plannedCapabilities={['Customer list and profile pages', 'Statements and receivables context', 'Contact and credit controls']}
    />
  );
}
