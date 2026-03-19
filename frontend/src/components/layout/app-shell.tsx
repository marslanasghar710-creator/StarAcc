import type { ReactNode } from "react";

import { AppLogo } from "@/components/shared/app-logo";
import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { TopHeader } from "@/components/layout/top-header";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-border/60 bg-background lg:flex lg:flex-col">
          <div className="border-b border-border/60 px-6 py-5">
            <AppLogo />
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <SidebarNav />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <TopHeader />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
