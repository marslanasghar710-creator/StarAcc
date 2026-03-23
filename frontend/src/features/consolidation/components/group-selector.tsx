"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Group } from "@/features/consolidation/types";

export function GroupSelector({ groups, value, onChange }: { groups: Group[]; value?: string; onChange: (groupId: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full md:w-[280px]">
        <SelectValue placeholder="Select consolidation group" />
      </SelectTrigger>
      <SelectContent>
        {groups.map((group) => (
          <SelectItem key={group.id} value={group.id}>
            {group.name} · {group.reporting_currency}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
