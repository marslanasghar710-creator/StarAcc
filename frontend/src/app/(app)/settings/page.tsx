import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Settings"
      description="Operational preferences, branding, numbering, and system controls will be surfaced here."
      plannedCapabilities={['Org preferences sections', 'Branding/numbering forms', 'Notifications and delivery controls']}
    />
  );
}
