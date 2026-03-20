import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BillStatus } from "@/features/bills/types";

export type BillFiltersValue = {
  search: string;
  status: "all" | BillStatus;
  scope: "all" | "open" | "overdue";
  dateFrom: string;
  dateTo: string;
};

export function BillFilters({ filters, onChange }: { filters: BillFiltersValue; onChange: (value: BillFiltersValue) => void }) {
  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <div className="relative min-w-[280px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder="Search by bill number, supplier, or reference" className="pl-9" />
      </div>
      <Select value={filters.status} onValueChange={(value) => onChange({ ...filters, status: value as BillFiltersValue["status"] })}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          {[
            ["all", "All statuses"],
            ["draft", "Draft"],
            ["approved", "Approved"],
            ["posted", "Posted"],
            ["partially_paid", "Partially paid"],
            ["paid", "Paid"],
            ["voided", "Voided"],
          ].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.scope} onValueChange={(value) => onChange({ ...filters, scope: value as BillFiltersValue["scope"] })}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Scope" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All bills</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
        </SelectContent>
      </Select>
      <Input type="date" value={filters.dateFrom} onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })} className="w-[160px]" />
      <Input type="date" value={filters.dateTo} onChange={(event) => onChange({ ...filters, dateTo: event.target.value })} className="w-[160px]" />
    </div>
  );
}
