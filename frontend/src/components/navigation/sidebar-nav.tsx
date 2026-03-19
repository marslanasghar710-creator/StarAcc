"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SidebarNavGroup } from "@/components/navigation/sidebar-nav-group";
import { filterNavigationItems } from "@/features/permissions/utils";
import { usePermissions } from "@/features/permissions/hooks";
import { navigationItems } from "@/lib/permissions/navigation";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  const pathname = usePathname();
  const { permissionSet } = usePermissions();

  const visibleItems = filterNavigationItems(navigationItems, permissionSet);
  const groupedItems = visibleItems.reduce<Record<string, typeof visibleItems>>((accumulator, item) => {
    accumulator[item.group] ??= [];
    accumulator[item.group].push(item);
    return accumulator;
  }, {});

  return (
    <nav className="space-y-6">
      {Object.entries(groupedItems).map(([group, items]) => (
        <SidebarNavGroup key={group} label={group}>
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-start gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground")} />
                <span className="space-y-0.5">
                  <span className="block font-medium">{item.title}</span>
                  <span className={cn("block text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{item.description}</span>
                </span>
              </Link>
            );
          })}
        </SidebarNavGroup>
      ))}
    </nav>
  );
}
