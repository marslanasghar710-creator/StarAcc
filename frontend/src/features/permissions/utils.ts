import type { NavItem } from "@/types";

export function canPermission(permissionSet: Set<string>, permission?: string) {
  if (!permission) {
    return true;
  }

  return permissionSet.has(permission);
}

export function hasAnyPermission(permissionSet: Set<string>, permissions: string[]) {
  if (permissions.length === 0) {
    return true;
  }

  return permissions.some((permission) => permissionSet.has(permission));
}

export function hasAllPermissions(permissionSet: Set<string>, permissions: string[]) {
  if (permissions.length === 0) {
    return true;
  }

  return permissions.every((permission) => permissionSet.has(permission));
}

export function filterNavigationItems(items: NavItem[], permissionSet: Set<string>) {
  return items.filter((item) => {
    if (!item.requiredPermissions?.length) {
      return true;
    }

    return hasAnyPermission(permissionSet, item.requiredPermissions);
  });
}
