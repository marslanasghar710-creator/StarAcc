import { ROLE_PERMISSION_DEFAULTS, type KnownRoleName } from "@/lib/permissions/constants";
import type { PermissionRecord, RoleRecord, UserOrganizationMembership } from "@/features/auth/types";

export function normalizeRoleName(roleId: string | null | undefined, roles: RoleRecord[]) {
  return roles.find((role) => role.id === roleId)?.name as KnownRoleName | undefined;
}

export function resolveOrganizationMembership(organizationId: string | null | undefined, memberships: UserOrganizationMembership[]) {
  if (!organizationId) {
    return null;
  }

  return memberships.find((membership) => membership.organization_id === organizationId) ?? null;
}

export function getPermissionsForRole(roleName?: string | null, permissionsCatalog?: PermissionRecord[]) {
  if (!roleName || !(roleName in ROLE_PERMISSION_DEFAULTS)) {
    return [] as string[];
  }

  const permissions = [...ROLE_PERMISSION_DEFAULTS[roleName as KnownRoleName]];

  if (!permissionsCatalog?.length) {
    return permissions;
  }

  const availableCodes = new Set(permissionsCatalog.map((permission) => permission.code));
  return permissions.filter((permission) => availableCodes.has(permission));
}

export function normalizePermissions(params: {
  organizationId?: string | null;
  memberships: UserOrganizationMembership[];
  roles: RoleRecord[];
  permissionsCatalog?: PermissionRecord[];
}) {
  const membership = resolveOrganizationMembership(params.organizationId, params.memberships);
  const roleName = normalizeRoleName(membership?.role, params.roles) ?? null;
  const permissions = getPermissionsForRole(roleName, params.permissionsCatalog);

  return {
    membership,
    roleName,
    permissions,
  };
}
