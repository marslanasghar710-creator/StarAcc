import Link from "next/link";
import type { ReactNode } from "react";

import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { navigationLinks } from "@/marketing/content/site-content";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <AppLogo href="/" />
          <nav className="hidden items-center gap-4 md:flex">
            {navigationLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-muted-foreground transition hover:text-foreground">{link.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex"><Link href="/demo">Explore Demo</Link></Button>
            <Button variant="ghost" asChild><Link href="/login">Sign in</Link></Button>
            <Button asChild><Link href="/register?intent=start_workspace">Start Workspace</Link></Button>
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
