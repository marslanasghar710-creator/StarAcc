import type { ReactNode } from "react";

import { AppLogo } from "@/components/shared/app-logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden bg-[radial-gradient(circle_at_top_left,_rgba(42,92,191,0.14),_transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.6),rgba(255,255,255,0.25))] px-10 py-10 lg:flex lg:flex-col lg:justify-between dark:bg-[radial-gradient(circle_at_top_left,_rgba(109,155,255,0.14),_transparent_40%),linear-gradient(180deg,rgba(12,18,30,0.5),rgba(12,18,30,0.3))]">
          <AppLogo />
          <div className="max-w-lg space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Frontend foundation</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">A serious accounting workspace, ready for feature delivery.</h1>
            <p className="text-base text-muted-foreground">
              This scaffold establishes the layout system, UI tokens, typed API boundaries, and form infrastructure needed for future accounting workflows.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center px-6 py-12">{children}</div>
      </div>
    </div>
  );
}
