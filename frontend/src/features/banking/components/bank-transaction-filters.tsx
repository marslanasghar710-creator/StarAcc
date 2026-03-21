import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BankAccount } from "@/features/banking/types";

export type BankTransactionFiltersValue = {
  search: string;
  status: "all" | "unreconciled" | "reconciled" | "ignored";
  bankAccountId: string;
  dateFrom: string;
  dateTo: string;
};

export function BankTransactionFilters({ filters, onChange, bankAccounts }: { filters: BankTransactionFiltersValue; onChange: (value: BankTransactionFiltersValue) => void; bankAccounts: BankAccount[]; }) {
  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <div className="relative min-w-[280px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder="Search description, payee, or reference" className="pl-9" />
      </div>
      <Select value={filters.status} onValueChange={(value) => onChange({ ...filters, status: value as BankTransactionFiltersValue["status"] })}>
        <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="unreconciled">Unreconciled</SelectItem>
          <SelectItem value="reconciled">Reconciled</SelectItem>
          <SelectItem value="ignored">Ignored</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.bankAccountId || "all"} onValueChange={(value) => onChange({ ...filters, bankAccountId: value === "all" ? "" : value })}>
        <SelectTrigger className="w-[220px]"><SelectValue placeholder="Bank account" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All accounts</SelectItem>
          {bankAccounts.map((bankAccount) => <SelectItem key={bankAccount.id} value={bankAccount.id}>{bankAccount.displayName || bankAccount.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input type="date" value={filters.dateFrom} onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })} className="w-[160px]" />
      <Input type="date" value={filters.dateTo} onChange={(event) => onChange({ ...filters, dateTo: event.target.value })} className="w-[160px]" />
    </div>
  );
}
