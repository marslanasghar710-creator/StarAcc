"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState as InlineEmptyState } from "@/components/feedback/empty-state";
import { useAccounts } from "@/features/accounts/hooks";
import { JournalActions } from "@/features/journals/components/journal-actions";
import { JournalDetailPanel } from "@/features/journals/components/journal-detail-panel";
import { JournalForm } from "@/features/journals/components/journal-form";
import { JournalLinesTable } from "@/features/journals/components/journal-lines-table";
import { JournalPostDialog } from "@/features/journals/components/journal-post-dialog";
import { JournalReverseDialog } from "@/features/journals/components/journal-reverse-dialog";
import { JournalTotalsCard } from "@/features/journals/components/journal-totals-card";
import { PeriodStatusBanner } from "@/features/journals/components/period-status-banner";
import { useJournal, usePostJournal, useReverseJournal, useUpdateJournal, useVoidJournal } from "@/features/journals/hooks";
import { getJournalDraftTotals, type JournalFormValues, type JournalReverseFormValues } from "@/features/journals/schemas";
import { usePermissions } from "@/features/permissions/hooks";
import { usePeriods } from "@/features/periods/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toPayload(values: JournalFormValues) {
  return {
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

export default function JournalDetailPage() {
  const params = useParams<{ journalId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const journalId = params.journalId;
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("journals.read");
  const canUpdate = can("journals.update");
  const canPost = can("journals.post");
  const canReverse = can("journals.reverse");
  const canVoid = can("journals.void");
  const canReadAccounts = can("accounts.read");
  const journalQuery = useJournal(currentOrganizationId ?? undefined, journalId, canRead);
  const periodsQuery = usePeriods(currentOrganizationId ?? undefined, can("periods.read"));
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", canReadAccounts);
  const updateMutation = useUpdateJournal(currentOrganizationId ?? undefined, journalId);
  const postMutation = usePostJournal(currentOrganizationId ?? undefined, journalId);
  const reverseMutation = useReverseJournal(currentOrganizationId ?? undefined, journalId);
  const voidMutation = useVoidJournal(currentOrganizationId ?? undefined, journalId);
  const [isPostOpen, setIsPostOpen] = React.useState(false);
  const [isReverseOpen, setIsReverseOpen] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const journal = journalQuery.data;
  const isEditMode = mode === "edit" && journal?.status === "draft" && canUpdate;
  const period = periodsQuery.data?.find((candidate) => candidate.id === journal?.periodId) ?? null;
  const totals = getJournalDraftTotals((journal?.lines ?? []).map((line) => ({ debit_amount: line.debitAmount, credit_amount: line.creditAmount })));
  const canSafelyEdit = Boolean(journal?.lines.length) && canReadAccounts;

  async function handleUpdate(values: JournalFormValues) {
    const updated = await updateMutation.mutateAsync(toPayload(values));
    toast.success(`Saved ${updated.entryNumber}`);
    router.push(`/journals/${updated.id}`);
  }

  async function handlePost() {
    setActionError(null);
    try {
      await postMutation.mutateAsync();
      toast.success("Journal posted");
      setIsPostOpen(false);
      await journalQuery.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to post journal.");
    }
  }

  async function handleReverse(values: JournalReverseFormValues) {
    setActionError(null);
    try {
      const response = await reverseMutation.mutateAsync(values);
      toast.success("Reversal journal created");
      setIsReverseOpen(false);
      const nextJournalId = response.journal_id ?? response.journalId;
      if (nextJournalId) {
        router.push(`/journals/${nextJournalId}`);
        return;
      }
      await journalQuery.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to reverse journal.");
    }
  }

  async function handleVoid() {
    setActionError(null);
    try {
      await voidMutation.mutateAsync("Voided from journal detail screen");
      toast.success("Draft journal voided");
      await journalQuery.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to void draft journal.");
    }
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading journal" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening journal details." />;
  }

  if (!canRead) {
    return <AccessDeniedState description="You need journals.read to view journal details." />;
  }

  if (journalQuery.isLoading || periodsQuery.isLoading || (isEditMode && accountsQuery.isLoading)) {
    return <LoadingScreen label="Loading journal details" />;
  }

  if (journalQuery.isError) {
    return <ErrorState title="Journal unavailable" description="We couldn't load this journal entry." onRetry={() => void journalQuery.refetch()} />;
  }

  if (!journal) {
    return <EmptyState title="Journal not found" description="The requested journal does not exist in the active organization." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Journals"
        title={`${journal.entryNumber} · ${journal.description}`}
        description={journal.status === "draft" ? "Draft journals can be edited, posted, or voided based on permissions and period state." : "Posted and reversed journals remain read-only for audit integrity."}
        actions={
          <JournalActions
            journal={journal}
            canUpdate={canUpdate}
            canPost={canPost}
            canReverse={canReverse}
            canVoid={canVoid}
            onPost={() => setIsPostOpen(true)}
            onReverse={() => setIsReverseOpen(true)}
            onVoid={() => void handleVoid()}
          />
        }
      />

      {isEditMode ? (
        canSafelyEdit ? <JournalForm
          journal={journal}
          periods={periodsQuery.data ?? []}
          accountOptions={accountsQuery.data ?? []}
          onSubmit={handleUpdate}
          isSubmitting={updateMutation.isPending}
          submitLabel="Save draft"
        /> : <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Edit unavailable</CardTitle><CardDescription>The current backend journal detail response does not include line data, so the draft cannot be edited safely in the UI yet.</CardDescription></CardHeader></Card>
      ) : (
        <div className="space-y-6">
          <PeriodStatusBanner period={period} />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
            <div className="space-y-6">
              <JournalDetailPanel journal={journal} period={period} />
              {journal.lines.length > 0 ? (
                <JournalLinesTable lines={journal.lines} />
              ) : (
                <Card className="border-border/70 shadow-sm">
                  <CardHeader>
                    <CardTitle>Journal lines</CardTitle>
                    <CardDescription>The current backend detail response did not include journal lines.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <InlineEmptyState title="Line detail unavailable" description="The frontend is ready to render backend-provided lines here. If the API begins returning `lines`, this table will populate automatically." />
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
              <JournalTotalsCard totalDebit={totals.totalDebit} totalCredit={totals.totalCredit} isBalanced={totals.isBalanced} />
            </div>
          </div>
        </div>
      )}

      <JournalPostDialog open={isPostOpen} onOpenChange={setIsPostOpen} onConfirm={handlePost} isSubmitting={postMutation.isPending} error={actionError} />
      <JournalReverseDialog open={isReverseOpen} onOpenChange={setIsReverseOpen} defaultDate={journal.entryDate} onConfirm={handleReverse} isSubmitting={reverseMutation.isPending} error={actionError} />
    </div>
  );
}
