import type { ReactNode } from "react";

import { TopHeader } from "@/components/layout/top-header";
import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { AppLogo } from "@/components/shared/app-logo";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(83,97,132,0.24),_transparent_48%),linear-gradient(180deg,rgba(11,14,23,1)_0%,rgba(9,12,20,1)_50%,rgba(8,11,17,1)_100%)] text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[296px_1fr]">
        <aside className="hidden border-r border-slate-700/40 bg-slate-950/70 shadow-[inset_-1px_0_0_rgba(148,163,184,0.12)] backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <div className="border-b border-slate-700/40 px-6 py-5">
            <AppLogo />
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
            <SidebarNav />
          </div>
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto">
          <TopHeader />
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
