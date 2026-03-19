"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type InvoiceFiltersValue = {
  search: string;
  status: "all" | "draft" | "approved" | "sent" | "partially_paid" | "paid" | "voided";
  scope: "all" | "open" | "overdue";
  dateFrom: string;
  dateTo: string;
};

export function InvoiceFilters({ filters, onChange }: { filters: InvoiceFiltersValue; onChange: (value: InvoiceFiltersValue) => void }) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.8fr)_180px_180px_180px_180px]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder="Search invoice number, customer, or reference" />
      </div>
      <Select value={filters.status} onValueChange={(value) => onChange({ ...filters, status: value as InvoiceFiltersValue["status"] })}>
        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="sent">Sent</SelectItem>
          <SelectItem value="partially_paid">Partially paid</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="voided">Voided</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.scope} onValueChange={(value) => onChange({ ...filters, scope: value as InvoiceFiltersValue["scope"] })}>
        <SelectTrigger><SelectValue placeholder="Scope" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All invoices</SelectItem>
          <SelectItem value="open">Open only</SelectItem>
          <SelectItem value="overdue">Overdue only</SelectItem>
        </SelectContent>
      </Select>
      <Input type="date" value={filters.dateFrom} onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })} />
      <Input type="date" value={filters.dateTo} onChange={(event) => onChange({ ...filters, dateTo: event.target.value })} />
    </div>
  );
}
