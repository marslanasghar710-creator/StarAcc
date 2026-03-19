"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { JournalForm } from "@/features/journals/components/journal-form";
import { useCreateJournal } from "@/features/journals/hooks";
import type { JournalFormValues } from "@/features/journals/schemas";
import { useAccounts } from "@/features/accounts/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { usePeriods } from "@/features/periods/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toPayload(values: JournalFormValues) {
  return {
    entry_date: values.entry_date,
    description: values.description.trim(),
    reference: values.reference?.trim() || null,
    lines: values.lines.map((line) => ({
      account_id: line.account_id,
      description: line.description?.trim() || null,
      debit_amount: line.debit_amount,
      credit_amount: line.credit_amount,
    })),
  };
}

export default function NewJournalPage() {
  const router = useRouter();
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canCreate = can("journals.create");
  const canReadAccounts = can("accounts.read");
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", canReadAccounts);
  const periodsQuery = usePeriods(currentOrganizationId ?? undefined, can("periods.read"));
  const createMutation = useCreateJournal(currentOrganizationId ?? undefined);

  async function handleSubmit(values: JournalFormValues) {
    const journal = await createMutation.mutateAsync(toPayload(values));
    toast.success(`Saved draft ${journal.entryNumber}`);
    router.push(`/journals/${journal.id}`);
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Preparing journal form" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before creating a journal." />;
  }

  if (!canCreate) {
    return <AccessDeniedState description="You need journals.create to create draft journals." />;
  }

  if (!canReadAccounts) {
    return <AccessDeniedState description="You also need accounts.read to select posting accounts for a new journal." />;
  }

  if (accountsQuery.isLoading || periodsQuery.isLoading) {
    return <LoadingScreen label="Loading journal dependencies" />;
  }

  if (accountsQuery.isError || periodsQuery.isError) {
    return <ErrorState description="We could not load the account list or period visibility needed for this journal." onRetry={() => { void accountsQuery.refetch(); void periodsQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Journals" title="New journal" description="Create a draft journal entry. Posting remains a separate backend-driven workflow." />
      <JournalForm
        periods={periodsQuery.data ?? []}
        accountOptions={accountsQuery.data ?? []}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        submitLabel="Save draft"
      />
    </div>
  );
}
