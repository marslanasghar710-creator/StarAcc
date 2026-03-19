import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Notifications"
      description="User alerts, activity inboxes, and read-state interactions will be connected later."
      plannedCapabilities={['Unread and archived sections', 'Action-driven notifications', 'Backend event subscriptions']}
    />
  );
}
