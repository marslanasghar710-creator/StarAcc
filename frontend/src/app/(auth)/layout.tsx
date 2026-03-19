import type { ReactNode } from "react";

import { PublicOnlyRoute } from "@/components/auth/public-only-route";
import { AppLogo } from "@/components/shared/app-logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <PublicOnlyRoute>
      <div className="min-h-screen bg-muted/30">
        <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden bg-[radial-gradient(circle_at_top_left,_rgba(42,92,191,0.14),_transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.6),rgba(255,255,255,0.25))] px-10 py-10 lg:flex lg:flex-col lg:justify-between dark:bg-[radial-gradient(circle_at_top_left,_rgba(109,155,255,0.14),_transparent_40%),linear-gradient(180deg,rgba(12,18,30,0.5),rgba(12,18,30,0.3))]">
            <AppLogo />
            <div className="max-w-lg space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Workspace foundation</p>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">Serious accounting software starts with identity, context, and control.</h1>
              <p className="text-base text-muted-foreground">
                This layer restores sessions, selects the active organization, normalizes permissions, and anchors every later workflow to backend truth.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center px-6 py-12">{children}</div>
        </div>
      </div>
    </PublicOnlyRoute>
  );
}
