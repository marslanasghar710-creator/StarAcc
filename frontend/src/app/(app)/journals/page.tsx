import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Journals"
      description="Manual journals, posting workflows, and approval mechanics will be implemented later."
      plannedCapabilities={['Journal list and filters', 'Create/edit/post flows', 'Posting validation UI']}
    />
  );
}
