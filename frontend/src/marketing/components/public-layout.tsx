import Link from "next/link";
import type { ReactNode } from "react";

import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { navigationLinks } from "@/marketing/content/site-content";
import { trackPublicEvent } from "@/marketing/lib/analytics";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <AppLogo href="/" />
          <nav className="hidden items-center gap-4 md:flex">
            {navigationLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => void trackPublicEvent("nav_clicked", { nav_item_id: link.label.toLowerCase() === "features" ? "features" : link.label.toLowerCase() === "demo" ? "demo" : link.label.toLowerCase() === "pricing" ? "pricing" : "other", nav_area: "header", destination_type: link.href.startsWith("/#") ? "anchor" : "route" })} className="text-sm text-muted-foreground transition hover:text-foreground">{link.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex"><Link href="/demo" onClick={() => void trackPublicEvent("nav_clicked", { nav_item_id: "header_explore_demo", nav_area: "header", destination_type: "route" })}>Explore Demo</Link></Button>
            <Button variant="ghost" asChild><Link href="/login" onClick={() => void trackPublicEvent("nav_clicked", { nav_item_id: "sign_in", nav_area: "header", destination_type: "route" })}>Sign in</Link></Button>
            <Button asChild><Link href="/signup?intent=start_workspace" onClick={() => void trackPublicEvent("nav_clicked", { nav_item_id: "start_workspace", nav_area: "header", destination_type: "route" })}>Start Workspace</Link></Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border/70 py-10">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 text-sm text-muted-foreground md:grid-cols-2 md:px-6">
          <div className="space-y-2">
            <p>StarAcc · Built for reliable financial operations.</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <Link href="/features/accounting-core">Features</Link>
              <Link href="/demo">Demo</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/login">Sign in</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>
          <p className="md:text-right">© {new Date().getFullYear()} StarAcc · Privacy · Terms</p>
        </div>
      </footer>
    </div>
  );
}
