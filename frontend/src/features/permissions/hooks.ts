"use client";

import * as React from "react";

import { useAuth } from "@/providers/auth-provider";
import { useOrganization } from "@/providers/organization-provider";
import { normalizePermissions } from "@/lib/permissions/normalize";
import { canPermission, hasAllPermissions, hasAnyPermission } from "@/features/permissions/utils";

export function usePermissions() {
  const { memberships, roles, permissionsCatalog } = useAuth();
  const { currentOrganizationId } = useOrganization();

  const resolved = React.useMemo(
    () => normalizePermissions({ organizationId: currentOrganizationId, memberships, roles, permissionsCatalog }),
    [currentOrganizationId, memberships, permissionsCatalog, roles],
  );

  const permissionSet = React.useMemo(() => new Set(resolved.permissions), [resolved.permissions]);

  return {
    permissionSet,
    permissions: resolved.permissions,
    roleName: resolved.roleName,
    membership: resolved.membership,
    can: (permission: string) => canPermission(permissionSet, permission),
    hasAnyPermission: (permissions: string[]) => hasAnyPermission(permissionSet, permissions),
    hasAllPermissions: (permissions: string[]) => hasAllPermissions(permissionSet, permissions),
  };
}
