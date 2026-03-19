"use client";

import { Toaster as Sonner } from "sonner";

import { useTheme } from "next-themes";

export function Toaster() {
  const { theme = "system" } = useTheme();

  return <Sonner position="top-right" richColors theme={theme as "light" | "dark" | "system"} />;
}
