"use client";

import * as React from "react";

import { AuthProvider } from "@/providers/auth-provider";
import { OrganizationProvider } from "@/providers/organization-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ShortcutProvider } from "@/features/productivity/shortcuts/shortcut-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryProvider>
        <AuthProvider>
          <OrganizationProvider>
            <ShortcutProvider>{children}</ShortcutProvider>
            <Toaster />
          </OrganizationProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
