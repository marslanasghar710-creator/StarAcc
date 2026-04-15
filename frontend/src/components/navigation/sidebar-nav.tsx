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
                      ? "border-orange-500/35 bg-[linear-gradient(90deg,rgba(251,146,60,0.18)_0%,rgba(30,41,59,0.24)_90%)] text-slate-50 shadow-[0_0_0_1px_rgba(251,146,60,0.12),0_8px_24px_rgba(15,23,42,0.5)]"
                      : "bg-primary text-primary-foreground shadow-sm"
                    : isDashboard
                      ? "border-slate-700/45 bg-slate-900/30 text-slate-300 hover:border-slate-500/70 hover:bg-slate-800/45 hover:text-slate-100"
                      : "text-muted-foreground/85 hover:bg-accent/70 hover:text-accent-foreground",
                )}
              >
                {isDashboard && active ? <span className="pointer-events-none absolute inset-y-1 left-0 w-0.5 rounded-full bg-orange-400/90" /> : null}
                <Icon className={cn("mt-0.5 size-4 shrink-0", active ? (isDashboard ? "text-orange-200" : "text-primary-foreground") : (isDashboard ? "text-slate-400 group-hover:text-slate-100" : "text-muted-foreground/80 group-hover:text-accent-foreground"))} />
                <span className="space-y-0.5">
                  <span className="block font-medium">{item.title}</span>
                  <span className={cn("block text-xs", active ? (isDashboard ? "text-orange-100/85" : "text-primary-foreground/80") : (isDashboard ? "text-slate-400/85" : "text-muted-foreground/80"))}>{item.description}</span>
                </span>
              </Link>
            );
          })}
        </SidebarNavGroup>
      ))}
    </nav>
  );
}
