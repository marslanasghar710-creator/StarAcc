import type { ReactNode } from "react";

import { TopHeader } from "@/components/layout/top-header";
import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { AppLogo } from "@/components/shared/app-logo";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-muted/30 text-foreground">
      <div className="grid h-full lg:grid-cols-[296px_1fr]">
        <aside className="hidden border-r border-border/60 bg-background lg:flex lg:flex-col">
          <div className="border-b border-border/60 px-6 py-5">
            <AppLogo />
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
            <SidebarNav />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col overflow-hidden">
          <TopHeader />
          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
