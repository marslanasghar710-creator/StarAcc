export type NavigationPermission = {
  code: string;
  enabled: boolean;
};

export function canAccess(_permissionCode: string) {
  // TODO(F01/F02): wire this into backend permissions and current org membership.
  return true;
}
