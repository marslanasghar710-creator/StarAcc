"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { LoadingScreen } from "@/components/feedback/loading-screen";
import { useAuth } from "@/providers/auth-provider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isBootstrapping } = useAuth();

  React.useEffect(() => {
    if (!isBootstrapping && !isAuthenticated) {
      const params = new URLSearchParams({ redirectTo: pathname });
      router.replace(`/login?${params.toString()}`);
    }
  }, [isAuthenticated, isBootstrapping, pathname, router]);

  if (isBootstrapping) {
    return <LoadingScreen label="Restoring your workspace" />;
  }

  if (!isAuthenticated) {
    return <LoadingScreen label="Redirecting to sign in" />;
  }

  return <>{children}</>;
}
