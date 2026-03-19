import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Dashboard"
      description="Executive overview, shortcuts, alerts, and high-level financial signals will land here in later prompts."
      plannedCapabilities={['Org switcher and default landing widgets', 'Backend-driven task summaries', 'Permission-aware KPI cards']}
    />
  );
}
