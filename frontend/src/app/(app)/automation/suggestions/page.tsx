"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EntitySuggestionGeneratorCard } from "@/features/automation/components/entity-suggestion-generator-card";
import { SuggestionDetailPanel } from "@/features/automation/components/suggestion-detail-panel";
import { SuggestionsTable } from "@/features/automation/components/suggestions-table";
import {
  useAcceptSuggestion,
  useBankTransactionSuggestions,
  useCodingSuggestions,
  useGenerateBankTransactionSuggestions,
  useGenerateCodingSuggestions,
  useRejectSuggestion,
  useSuggestion,
  useSuggestions,
  useSuggestionsForEntity,
} from "@/features/automation/hooks";
import { type BankTransactionSuggestionFormValues, type EntitySuggestionFormValues } from "@/features/automation/schemas";
import type { Suggestion } from "@/features/automation/types";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function AutomationSuggestionsPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("suggestions.read");
  const canReview = can("suggestions.review");
  const [search, setSearch] = React.useState("");
  const [selectedSuggestionId, setSelectedSuggestionId] = React.useState<string | null>(null);
  const [entityLookup, setEntityLookup] = React.useState<{ entityType: string; entityId: string } | null>(null);
  const [bankTransactionId, setBankTransactionId] = React.useState<string | null>(null);
  const [codingLookup, setCodingLookup] = React.useState<{ entityType: string; entityId: string } | null>(null);

  const suggestionsQuery = useSuggestions(currentOrganizationId ?? undefined, canRead);
  const suggestionDetailQuery = useSuggestion(currentOrganizationId ?? undefined, selectedSuggestionId ?? undefined, canRead && Boolean(selectedSuggestionId));
  const acceptMutation = useAcceptSuggestion(currentOrganizationId ?? undefined, selectedSuggestionId ?? undefined);
  const rejectMutation = useRejectSuggestion(currentOrganizationId ?? undefined, selectedSuggestionId ?? undefined);
  const entitySuggestionsQuery = useSuggestionsForEntity(currentOrganizationId ?? undefined, entityLookup?.entityType, entityLookup?.entityId, canRead && Boolean(entityLookup));
  const bankSuggestionsQuery = useBankTransactionSuggestions(currentOrganizationId ?? undefined, bankTransactionId ?? undefined, canRead && Boolean(bankTransactionId));
  const generateBankSuggestionsMutation = useGenerateBankTransactionSuggestions(currentOrganizationId ?? undefined);
  const codingSuggestionsQuery = useCodingSuggestions(currentOrganizationId ?? undefined, codingLookup ? { entity_type: codingLookup.entityType, entity_id: codingLookup.entityId } : undefined, canRead && Boolean(codingLookup));
  const generateCodingSuggestionsMutation = useGenerateCodingSuggestions(currentOrganizationId ?? undefined);

  React.useEffect(() => {
    if (!selectedSuggestionId && (suggestionsQuery.data?.length ?? 0) > 0) {
      setSelectedSuggestionId(suggestionsQuery.data?.[0]?.id ?? null);
    }
  }, [selectedSuggestionId, suggestionsQuery.data]);

  const filteredSuggestions = React.useMemo(() => {
    const rows = suggestionsQuery.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((suggestion) => [suggestion.suggestionType, suggestion.status, suggestion.targetEntityType, suggestion.targetEntityId, suggestion.reasonSummary].some((value) => value?.toLowerCase().includes(term)));
  }, [search, suggestionsQuery.data]);

  async function handleAccept() {
    const suggestion = await acceptMutation.mutateAsync();
    toast.success(`Accepted suggestion ${suggestion.id}`);
  }

  async function handleReject() {
    const suggestion = await rejectMutation.mutateAsync();
    toast.success(`Rejected suggestion ${suggestion.id}`);
  }

  async function handleGenerateBankSuggestions(values: BankTransactionSuggestionFormValues) {
    setBankTransactionId(values.bank_transaction_id);
    const suggestions = await generateBankSuggestionsMutation.mutateAsync(values.bank_transaction_id);
    toast.success(`Generated ${suggestions.length} bank transaction suggestion(s)`);
  }

  async function handleGenerateCodingSuggestions(values: EntitySuggestionFormValues) {
    setCodingLookup({ entityType: values.entity_type, entityId: values.entity_id });
    const suggestions = await generateCodingSuggestionsMutation.mutateAsync({ entity_type: values.entity_type, entity_id: values.entity_id });
    toast.success(`Generated ${suggestions.length} coding suggestion(s)`);
  }

  function handleSelectSuggestion(suggestion: Suggestion) {
    setSelectedSuggestionId(suggestion.id);
    if (suggestion.targetEntityType && suggestion.targetEntityId) {
      setEntityLookup({ entityType: suggestion.targetEntityType, entityId: suggestion.targetEntityId });
    }
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading suggestions inbox" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening automation suggestions." />;
  }

  if (!canRead) {
    return <AccessDeniedState description="You need suggestions.read to inspect the automation suggestions inbox." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Automation"}
        title="Suggestions inbox"
        description="Review assistive suggestions, explanation metadata, and confidence before explicitly accepting or rejecting anything."
        actions={<div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/automation"><ArrowLeft className="size-4" />Back to automation</Link></Button></div>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Total suggestions</CardTitle><CardDescription>Inbox size from backend suggestion services.</CardDescription></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{suggestionsQuery.data?.length ?? 0}</p></CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Pending review</CardTitle><CardDescription>Suggestions still requiring human judgment.</CardDescription></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{(suggestionsQuery.data ?? []).filter((item) => item.status === "pending").length}</p></CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Review permission</CardTitle><CardDescription>Acceptance and rejection are explicitly permission-gated.</CardDescription></CardHeader><CardContent className="text-sm">{canReview ? "Your role can accept or reject suggestions." : "Your role is read-only for suggestion review."}</CardContent></Card>
      </div>

      <EntitySuggestionGeneratorCard
        onGenerateBankSuggestions={handleGenerateBankSuggestions}
        onGenerateCodingSuggestions={handleGenerateCodingSuggestions}
        isGeneratingBankSuggestions={generateBankSuggestionsMutation.isPending}
        isGeneratingCodingSuggestions={generateCodingSuggestionsMutation.isPending}
      />

      <PageActionBar left={<Input className="max-w-md" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search suggestions by target, type, status, or reason" />} right={<p className="text-sm text-muted-foreground">Explainability is first-class: open any suggestion to inspect its confidence and metadata.</p>} />

      {suggestionsQuery.isLoading ? <LoadingScreen label="Loading suggestions" /> : null}
      {suggestionsQuery.isError ? <ErrorState description="We couldn't load automation suggestions." onRetry={() => void suggestionsQuery.refetch()} /> : null}
      {!suggestionsQuery.isLoading && !suggestionsQuery.isError && filteredSuggestions.length === 0 ? <EmptyState title={search ? "No matching suggestions" : "No suggestions yet"} description={search ? "Try a broader search term." : "Suggestions will appear here when backend automation services create reviewable recommendations."} action={<Button variant="outline" onClick={() => void suggestionsQuery.refetch()}><Sparkles className="size-4" />Refresh inbox</Button>} /> : null}
      {!suggestionsQuery.isLoading && !suggestionsQuery.isError && filteredSuggestions.length > 0 ? <SuggestionsTable suggestions={filteredSuggestions} selectedSuggestionId={selectedSuggestionId} onSelect={handleSelectSuggestion} /> : null}

      {suggestionDetailQuery.isLoading ? <LoadingScreen label="Loading suggestion detail" /> : null}
      {suggestionDetailQuery.isError ? <ErrorState description="We couldn't load the selected suggestion detail." onRetry={() => void suggestionDetailQuery.refetch()} /> : null}
      {suggestionDetailQuery.data ? <SuggestionDetailPanel suggestion={suggestionDetailQuery.data} onAccept={handleAccept} onReject={handleReject} canReview={canReview} isAccepting={acceptMutation.isPending} isRejecting={rejectMutation.isPending} /> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Suggestions for selected entity</CardTitle>
            <CardDescription>Cross-check the wider suggestion set for the current target entity.</CardDescription>
          </CardHeader>
          <CardContent>
            {entitySuggestionsQuery.isLoading ? <LoadingScreen label="Loading entity suggestions" /> : null}
            {entitySuggestionsQuery.isError ? <ErrorState description="We couldn't load entity suggestions." onRetry={() => void entitySuggestionsQuery.refetch()} /> : null}
            {!entitySuggestionsQuery.isLoading && !entitySuggestionsQuery.isError && (entitySuggestionsQuery.data?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">Select a suggestion with a target entity to load related suggestions.</p> : null}
            {!entitySuggestionsQuery.isLoading && !entitySuggestionsQuery.isError && (entitySuggestionsQuery.data?.length ?? 0) > 0 ? <SuggestionsTable suggestions={entitySuggestionsQuery.data ?? []} selectedSuggestionId={selectedSuggestionId} onSelect={handleSelectSuggestion} /> : null}
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Generated suggestion snapshots</CardTitle>
            <CardDescription>Inspect explicit generation results for bank transactions and coding assistance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Bank transaction suggestions</p>
              {(bankSuggestionsQuery.data?.length ?? 0) === 0 ? <p className="mt-2 text-sm text-muted-foreground">Run bank transaction generation to populate this view.</p> : <SuggestionsTable suggestions={bankSuggestionsQuery.data ?? []} selectedSuggestionId={selectedSuggestionId} onSelect={handleSelectSuggestion} />}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Coding suggestions</p>
              {(codingSuggestionsQuery.data?.length ?? 0) === 0 ? <p className="mt-2 text-sm text-muted-foreground">Run coding suggestion generation to populate this view.</p> : <SuggestionsTable suggestions={codingSuggestionsQuery.data ?? []} selectedSuggestionId={selectedSuggestionId} onSelect={handleSelectSuggestion} />}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
