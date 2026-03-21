import * as React from "react";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportDateRangePicker } from "@/features/reporting/components/report-date-range-picker";
import type { ReportFilterOption } from "@/features/reporting/types";
import type { Account } from "@/features/accounts/types";

export function GeneralLedgerFilters({
  accounts,
  sourceOptions,
  accountId,
  fromDate,
  toDate,
  journalReference,
  sourceModule,
  status,
  onAccountIdChange,
  onFromDateChange,
  onToDateChange,
  onJournalReferenceChange,
  onSourceModuleChange,
  onStatusChange,
  onApply,
}: {
  accounts: Account[];
  sourceOptions: ReportFilterOption[];
  accountId: string;
  fromDate: string;
  toDate: string;
  journalReference: string;
  sourceModule: string;
  status: string;
  onAccountIdChange: (value: string) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onJournalReferenceChange: (value: string) => void;
  onSourceModuleChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onApply: () => void;
}) {
  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <Select value={accountId || "none"} onValueChange={(value) => onAccountIdChange(value === "none" ? "" : value)}>
        <SelectTrigger className="min-w-[220px]">
          <SelectValue placeholder="Select account" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Select account</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>{account.code} · {account.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ReportDateRangePicker fromDate={fromDate} toDate={toDate} onFromDateChange={onFromDateChange} onToDateChange={onToDateChange} />
      <div className="relative min-w-[200px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={journalReference} onChange={(event) => onJournalReferenceChange(event.target.value)} placeholder="Journal reference" className="pl-9" />
      </div>
      <Select value={sourceModule || "all"} onValueChange={(value) => onSourceModuleChange(value === "all" ? "" : value)}>
        <SelectTrigger className="min-w-[170px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          {sourceOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={status || "all"} onValueChange={(value) => onStatusChange(value === "all" ? "" : value)}>
        <SelectTrigger className="min-w-[160px]">
          <SelectValue placeholder="Posting status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="posted">Posted</SelectItem>
          <SelectItem value="unposted">Unposted</SelectItem>
        </SelectContent>
      </Select>
      <Button type="button" onClick={onApply}>Apply</Button>
    </div>
  );
}
