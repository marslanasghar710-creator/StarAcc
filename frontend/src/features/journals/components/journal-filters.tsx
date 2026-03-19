"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type JournalFiltersValue = {
  search: string;
  status: "all" | "draft" | "posted" | "reversed" | "voided";
  dateFrom: string;
  dateTo: string;
};

export function JournalFilters({ filters, onChange }: { filters: JournalFiltersValue; onChange: (value: JournalFiltersValue) => void }) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.8fr)_180px_180px_180px]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder="Search entry number, description, or reference" />
      </div>
      <Select value={filters.status} onValueChange={(value) => onChange({ ...filters, status: value as JournalFiltersValue["status"] })}>
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="posted">Posted</SelectItem>
          <SelectItem value="reversed">Reversed</SelectItem>
          <SelectItem value="voided">Voided</SelectItem>
        </SelectContent>
      </Select>
      <Input type="date" value={filters.dateFrom} onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })} />
      <Input type="date" value={filters.dateTo} onChange={(event) => onChange({ ...filters, dateTo: event.target.value })} />
    </div>
  );
}
