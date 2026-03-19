"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { Button } from "@/components/ui/button";
import { JournalFilters, type JournalFiltersValue } from "@/features/journals/components/journal-filters";
import { JournalListTable } from "@/features/journals/components/journal-list-table";
import { useJournals } from "@/features/journals/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { usePeriods } from "@/features/periods/hooks";
import { useOrganization } from "@/providers/organization-provider";

function matchesDateRange(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export default function JournalsPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("journals.read");
  const canCreate = can("journals.create");
  const [filters, setFilters] = React.useState<JournalFiltersValue>({ search: "", status: "all", dateFrom: "", dateTo: "" });
  const journalsQuery = useJournals(currentOrganizationId ?? undefined, filters.search, canRead);
  const periodsQuery = usePeriods(currentOrganizationId ?? undefined, can("periods.read"));

  const filteredJournals = React.useMemo(() => {
    return (journalsQuery.data ?? []).filter((journal) => {
      const matchesStatus = filters.status === "all" ? true : journal.status === filters.status;
      const matchesRange = matchesDateRange(journal.entryDate, filters.dateFrom, filters.dateTo);
      return matchesStatus && matchesRange;
    });
  }, [filters.dateFrom, filters.dateTo, filters.status, journalsQuery.data]);

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading journals" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening journals." />;
  }

  if (!canRead) {
    return <AccessDeniedState description="You need journals.read to view journals." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Accounting"}
        title="Journals"
        description="Review draft and posted manual journals, period state, and posting workflows for the active organization."
        actions={canCreate ? <Button asChild><Link href="/journals/new"><Plus className="size-4" />New journal</Link></Button> : null}
      />

      <PageActionBar left={<JournalFilters filters={filters} onChange={setFilters} />} />

      {journalsQuery.isLoading ? <LoadingScreen label="Loading journals" /> : null}
      {journalsQuery.isError ? <ErrorState description="We couldn't load journals for this organization." onRetry={() => void journalsQuery.refetch()} /> : null}
      {!journalsQuery.isLoading && !journalsQuery.isError && filteredJournals.length === 0 ? (
        <EmptyState
          title={filters.search || filters.status !== "all" || filters.dateFrom || filters.dateTo ? "No matching journals" : "No journals yet"}
          description={filters.search || filters.status !== "all" || filters.dateFrom || filters.dateTo ? "Adjust the search or filters to find the journal entry you need." : "Create the first draft journal to begin manual ledger postings."}
          action={canCreate ? <Button asChild><Link href="/journals/new">Create journal</Link></Button> : undefined}
        />
      ) : null}
      {!journalsQuery.isLoading && !journalsQuery.isError && filteredJournals.length > 0 ? <JournalListTable journals={filteredJournals} periods={periodsQuery.data ?? []} /> : null}
    </div>
  );
}
