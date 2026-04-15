"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { PlanBadge } from "@/components/entitlements/plan-badge";
import { UsageMeter } from "@/components/entitlements/usage-meter";
import { UpgradeCTA } from "@/components/entitlements/upgrade-cta";
import { OrganizationSwitcher } from "@/components/organizations/organization-switcher";
import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { UserMenu } from "@/components/layout/user-menu";
import { useOnboardingStatus } from "@/features/onboarding/hooks";
import { useActivationSnapshot } from "@/features/activation/hooks";
import { useBillingState } from "@/features/billing/hooks";
import { navigationItems } from "@/lib/permissions/navigation";
import { useOrganization } from "@/providers/organization-provider";

export function TopHeader() {
  const pathname = usePathname();
  const { currentOrganization, currentOrganizationId } = useOrganization();
  const onboarding = useOnboardingStatus(currentOrganizationId ?? undefined, Boolean(currentOrganizationId && pathname !== "/setup"));
  const activation = useActivationSnapshot(currentOrganizationId ?? undefined, Boolean(currentOrganizationId && pathname !== "/setup"));
  const currentNavItem = navigationItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const billing = useBillingState(currentOrganizationId ?? undefined);
  const activationSnapshot = activation.data?.snapshot;
  const showSetupBanner = pathname !== "/setup" && Boolean(activationSnapshot && activationSnapshot.status !== "completed");

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
        <div className="hidden md:flex items-center gap-2">
          <PlanBadge planId={billing.data?.subscription.plan_code} />
        </div>
        <NotificationBell />
        <UserMenu />
      </div>
      <div className="border-t border-border/50 px-4 py-2 text-xs text-muted-foreground lg:px-6 xl:hidden">
        <OrganizationSwitcher />
      </div>
      {showSetupBanner ? (
        <div className="border-t border-border/50 bg-muted/30 px-4 py-2 text-xs lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground">
              Activation {activationSnapshot?.completion_percent ?? onboarding.data?.progress_percent ?? 0}% • {activationSnapshot?.status === "not_started" ? "start setup checklist" : "continue setup checklist"}.
            </p>
            <div className="flex items-center gap-2">
              <UsageMeter
                label="Invoices this month"
                used={billing.data?.usage?.invoices_this_period?.used ?? 0}
                limit={billing.data?.usage?.invoices_this_period?.limit ?? null}
              />
              <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                <Link href="/setup">Continue setup</Link>
              </Button>
              <UpgradeCTA />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
