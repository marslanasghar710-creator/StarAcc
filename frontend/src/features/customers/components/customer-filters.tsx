"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export function CustomerFilters({ search, onSearchChange }: { search: string; onSearchChange: (value: string) => void }) {
  return (
    <div className="relative max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search customers by name or email" />
    </div>
  );
}
