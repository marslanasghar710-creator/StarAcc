import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Tax"
      description="Tax settings, rates, codes, and filing support will expand this screen in later prompts."
      requiredPermissions={['tax.settings.read', 'tax_reports.read']}
      plannedCapabilities={['Backend-connected list and detail views', 'Permission-specific actions and mutations', 'Dense accounting-friendly tables, filters, and drawers']}
    />
  );
}
