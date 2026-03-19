"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { LoadingScreen } from "@/components/feedback/loading-screen";
import { useAuth } from "@/providers/auth-provider";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapping } = useAuth();

  React.useEffect(() => {
    if (!isBootstrapping) {
      router.replace(isAuthenticated ? "/dashboard" : "/login");
    }
  }, [isAuthenticated, isBootstrapping, router]);

  return <LoadingScreen label="Opening StarAcc" />;
}
