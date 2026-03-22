import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export function SupplierFilters({ search, onSearchChange }: { search: string; onSearchChange: (value: string) => void }) {
  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <div className="relative min-w-[280px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search suppliers by name or email" className="pl-9" />
      </div>
    </div>
  );
}
