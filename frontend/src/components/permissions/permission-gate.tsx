"use client";

import type { ReactNode } from "react";

import { usePermissions } from "@/features/permissions/hooks";

export function PermissionGate({ children, fallback = null, permission, anyPermissions, allPermissions }: { children: ReactNode; fallback?: ReactNode; permission?: string; anyPermissions?: string[]; allPermissions?: string[]; }) {
  const { can, hasAllPermissions, hasAnyPermission } = usePermissions();

  const allowed = permission ? can(permission) : anyPermissions?.length ? hasAnyPermission(anyPermissions) : allPermissions?.length ? hasAllPermissions(allPermissions) : true;

  return allowed ? <>{children}</> : <>{fallback}</>;
}
