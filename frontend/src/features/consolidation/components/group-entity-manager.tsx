"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GroupEntity } from "@/features/consolidation/types";
import type { OrganizationSummary } from "@/features/organizations/types";

export function GroupEntityManager({
  entities,
  organizations,
  onAdd,
  onRemove,
}: {
  entities: GroupEntity[];
  organizations: OrganizationSummary[];
  onAdd: (organizationId: string) => Promise<void> | void;
  onRemove: (entityId: string) => Promise<void> | void;
}) {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>();
  const existing = useMemo(() => new Set(entities.map((entity) => entity.organization_id)), [entities]);
  const candidates = organizations.filter((organization) => !existing.has(organization.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <Select value={selectedOrganizationId} onValueChange={setSelectedOrganizationId}>
          <SelectTrigger className="w-full md:w-[320px]"><SelectValue placeholder="Add organization to this group" /></SelectTrigger>
          <SelectContent>
            {candidates.map((organization) => <SelectItem key={organization.id} value={organization.id}>{organization.name} · {organization.base_currency}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button disabled={!selectedOrganizationId} onClick={() => selectedOrganizationId ? onAdd(selectedOrganizationId) : undefined}>Add entity</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entity</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Primary</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entity) => (
            <TableRow key={entity.id}>
              <TableCell>{entity.organization_name}</TableCell>
              <TableCell>{entity.organization_currency}</TableCell>
              <TableCell>{entity.is_primary ? "Yes" : "No"}</TableCell>
              <TableCell className="text-right"><Button variant="ghost" onClick={() => onRemove(entity.id)}>Remove</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
