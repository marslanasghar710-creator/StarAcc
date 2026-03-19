import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Reports"
      description="Financial reports, exports, and saved report views will be layered onto this structure."
      plannedCapabilities={['Saved reports index', 'Filter forms and exports', 'Future print/email layouts']}
    />
  );
}
