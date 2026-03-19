"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { OrganizationSwitcher } from "@/components/organizations/organization-switcher";
import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { UserMenu } from "@/components/layout/user-menu";
import { navigationItems } from "@/lib/permissions/navigation";
import { useOrganization } from "@/providers/organization-provider";

export function TopHeader() {
  const pathname = usePathname();
  const { currentOrganization } = useOrganization();
  const currentNavItem = navigationItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open navigation" className="rounded-xl">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] p-0">
              <div className="border-b border-border/60 px-5 py-5">
                <AppLogo />
              </div>
              <div className="px-4 py-4">
                <SidebarNav />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{currentOrganization?.name ?? "Workspace"}</p>
          <p className="truncate text-sm font-medium text-foreground">{currentNavItem?.title ?? "Accounting workspace"}</p>
        </div>

        <div className="hidden xl:block">
          <OrganizationSwitcher />
        </div>
        <NotificationBell />
        <UserMenu />
      </div>
      <div className="border-t border-border/50 px-4 py-2 text-xs text-muted-foreground lg:px-6 xl:hidden">
        <OrganizationSwitcher />
      </div>
    </header>
  );
}
