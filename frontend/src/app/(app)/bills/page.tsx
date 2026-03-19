import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Bills"
      description="Purchase bills, approvals, and posting flows will build on top of this module scaffold."
      plannedCapabilities={['Bill inbox and approvals', 'Coding and tax side panels', 'Attachment and history tabs']}
    />
  );
}
