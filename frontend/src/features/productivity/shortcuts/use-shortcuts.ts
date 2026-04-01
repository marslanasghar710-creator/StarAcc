"use client";

import * as React from "react";

import type { CommandAction } from "@/features/productivity/shortcuts/shortcut-provider";
import { useShortcutContext } from "@/features/productivity/shortcuts/shortcut-provider";
import type { ShortcutDefinition } from "@/features/productivity/shortcuts/shortcut-schemas";

export function useShortcuts(definitions: ShortcutDefinition[]) {
  const { registerShortcuts } = useShortcutContext();

  React.useEffect(() => registerShortcuts(definitions), [definitions, registerShortcuts]);
}

export function useCommandActions(actions: CommandAction[]) {
  const { setContextActions } = useShortcutContext();

  React.useEffect(() => {
    setContextActions(actions);
    return () => setContextActions([]);
  }, [actions, setContextActions]);
}

export function useProductivitySurface() {
  const context = useShortcutContext();
  return context;
}
