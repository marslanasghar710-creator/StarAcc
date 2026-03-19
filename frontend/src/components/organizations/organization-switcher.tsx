"use client";

import { Building2, Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useOrganization } from "@/providers/organization-provider";

export function OrganizationSwitcher() {
  const { organizations, currentOrganization, currentOrganizationId, setCurrentOrganizationId, isLoadingOrganizations } = useOrganization();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-10 min-w-[220px] justify-between gap-3 rounded-xl px-3">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-4" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-xs text-muted-foreground">Active organization</span>
              <span className="block truncate text-sm font-medium text-foreground">{currentOrganization?.name ?? (isLoadingOrganizations ? "Loading organizations..." : "No organizations")}</span>
            </span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <DropdownMenuLabel>Switch organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((organization) => (
          <DropdownMenuItem key={organization.id} className="items-start justify-between gap-3" onClick={() => setCurrentOrganizationId(organization.id)}>
            <span className="min-w-0">
              <span className="block truncate font-medium">{organization.name}</span>
              <span className="block text-xs text-muted-foreground">{organization.base_currency} • {organization.timezone}</span>
            </span>
            {currentOrganizationId === organization.id ? <Check className="mt-0.5 size-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
        {!organizations.length ? <DropdownMenuItem disabled>No organizations available</DropdownMenuItem> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
