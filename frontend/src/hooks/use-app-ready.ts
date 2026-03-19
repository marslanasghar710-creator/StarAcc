"use client";

import { useAuth } from "@/providers/auth-provider";

export function useAppReady() {
  const { isBootstrapping } = useAuth();

  return !isBootstrapping;
}
