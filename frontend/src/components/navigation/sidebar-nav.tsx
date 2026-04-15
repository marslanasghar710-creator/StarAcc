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
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  const visibleItems = filterNavigationItems(navigationItems, permissionSet);
  const groupedItems = visibleItems.reduce<Record<string, typeof visibleItems>>((accumulator, item) => {
    accumulator[item.group] ??= [];
    accumulator[item.group].push(item);
    return accumulator;
  }, {});

  return (
    <nav className={cn(isDashboard ? "space-y-7" : "space-y-6")}>
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
                  "group relative flex items-start gap-3 px-3 text-sm",
                  isDashboard ? "overflow-hidden rounded-xl border py-2.5 transition-all duration-200" : "rounded-2xl py-2.5 transition-colors",
                  active
                    ? isDashboard
                      ? "border-primary/35 bg-gradient-to-r from-primary/16 via-primary/10 to-background text-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_18%,transparent),0_10px_24px_rgba(15,23,42,0.14)] dark:shadow-[0_10px_24px_rgba(2,6,23,0.45)]"
                      : "bg-primary text-primary-foreground shadow-sm"
                    : isDashboard
                      ? "border-border/60 bg-card/55 text-muted-foreground hover:border-primary/30 hover:bg-accent/60 hover:text-foreground"
                      : "text-muted-foreground/85 hover:bg-accent/70 hover:text-accent-foreground",
                )}
              >
                {isDashboard && active ? <span className="pointer-events-none absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary/90" /> : null}
                <Icon className={cn("mt-0.5 size-4 shrink-0", active ? (isDashboard ? "text-primary" : "text-primary-foreground") : (isDashboard ? "text-muted-foreground group-hover:text-foreground" : "text-muted-foreground/80 group-hover:text-accent-foreground"))} />
                <span className="space-y-0.5">
                  <span className="block font-medium">{item.title}</span>
                  <span className={cn("block text-xs", active ? (isDashboard ? "text-foreground/80" : "text-primary-foreground/80") : (isDashboard ? "text-muted-foreground/85" : "text-muted-foreground/80"))}>{item.description}</span>
                </span>
              </Link>
            );
          })}
        </SidebarNavGroup>
      ))}
    </nav>
  );
}
