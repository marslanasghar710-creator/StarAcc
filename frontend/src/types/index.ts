import type { ComponentType } from "react";

export type NavItem = {
  title: string;
  href: string;
  description: string;
  group: string;
  icon: ComponentType<{ className?: string }>;
  requiredPermissions?: string[];
};
