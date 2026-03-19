import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Journals"
      description="Manual journal entry workflows, posting controls, and period checks will be built here."
      requiredPermissions={['journals.read']}
      plannedCapabilities={['Backend-connected list and detail views', 'Permission-specific actions and mutations', 'Dense accounting-friendly tables, filters, and drawers']}
    />
  );
}
