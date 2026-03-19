"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AccountListFilters } from "@/features/accounts/types";

export function AccountFilters({ filters, onChange }: { filters: AccountListFilters; onChange: (filters: AccountListFilters) => void }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_220px_180px]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search ?? ""}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          className="pl-9"
          placeholder="Search by account code or name"
        />
      </div>
      <Select value={filters.accountType ?? "all"} onValueChange={(value) => onChange({ ...filters, accountType: value as AccountListFilters["accountType"] })}>
        <SelectTrigger>
          <SelectValue placeholder="Account type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All account types</SelectItem>
          <SelectItem value="asset">Asset</SelectItem>
          <SelectItem value="liability">Liability</SelectItem>
          <SelectItem value="equity">Equity</SelectItem>
          <SelectItem value="revenue">Revenue</SelectItem>
          <SelectItem value="expense">Expense</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.status ?? "all"} onValueChange={(value) => onChange({ ...filters, status: value as AccountListFilters["status"] })}>
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active only</SelectItem>
          <SelectItem value="inactive">Inactive only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
