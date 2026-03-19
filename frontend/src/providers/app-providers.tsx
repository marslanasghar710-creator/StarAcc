"use client";

import * as React from "react";

import { AuthProvider } from "@/providers/auth-provider";
import { OrganizationProvider } from "@/providers/organization-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryProvider>
        <AuthProvider>
          <OrganizationProvider>
            {children}
            <Toaster />
          </OrganizationProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
