import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Tax"
      description="Tax settings, rates, codes, and return workflows will be implemented with real backend data later."
      plannedCapabilities={['Tax master data maintenance', 'Filing period summaries', 'Audit-safe transactional drilldowns']}
    />
  );
}
