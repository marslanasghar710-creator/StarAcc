"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { LoadingScreen } from "@/components/feedback/loading-screen";
import { useAuth } from "@/providers/auth-provider";

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isBootstrapping } = useAuth();

  React.useEffect(() => {
    if (!isBootstrapping && isAuthenticated) {
      router.replace(searchParams.get("redirectTo") || "/dashboard");
    }
  }, [isAuthenticated, isBootstrapping, router, searchParams]);

  if (isBootstrapping) {
    return <LoadingScreen label="Checking your session" />;
  }

  if (isAuthenticated) {
    return <LoadingScreen label="Opening your workspace" />;
  }

  return <>{children}</>;
}
