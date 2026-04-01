"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { ShortcutRegistry } from "@/features/productivity/shortcuts/shortcut-registry";
import { eventToCombo, isEditableTarget, type ShortcutDefinition } from "@/features/productivity/shortcuts/shortcut-schemas";
import { CommandPalette } from "@/features/productivity/command-palette/command-palette";

export type CommandAction = {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
  group?: string;
  perform: () => void;
};

type ShortcutContextValue = {
  registerShortcuts: (definitions: ShortcutDefinition[]) => () => void;
  setContextActions: (actions: CommandAction[]) => void;
  openPalette: () => void;
  openShortcutHelp: () => void;
};

const ShortcutContext = React.createContext<ShortcutContextValue | null>(null);

export function ShortcutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const registry = React.useMemo(() => new ShortcutRegistry(), []);
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const [contextActions, setContextActions] = React.useState<CommandAction[]>([]);

  const registerShortcuts = React.useCallback((definitions: ShortcutDefinition[]) => {
    const cleanups = definitions.map((definition) => registry.register(definition));
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [registry]);

  React.useEffect(() => {
    setContextActions([]);
  }, [pathname]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const combo = eventToCombo(event);
      const active = registry.getActive(pathname);

      const binding = active.find((candidate) => candidate.normalizedCombo === combo);
      if (!binding) return;
      if (!binding.allowInInput && isEditableTarget(event.target)) return;

      if (binding.preventDefault ?? true) {
        event.preventDefault();
      }
      binding.handler();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, registry]);

  React.useEffect(() => {
    const unregister = registerShortcuts([
      { id: "global.palette", combo: "meta+k", description: "Open command palette", scope: "global", handler: () => setIsPaletteOpen(true) },
      { id: "global.palette.ctrl", combo: "ctrl+k", description: "Open command palette", scope: "global", handler: () => setIsPaletteOpen(true) },
      { id: "global.shortcuts", combo: "shift+?", description: "Open keyboard shortcuts", scope: "global", handler: () => setIsHelpOpen(true) },
    ]);

    return unregister;
  }, [registerShortcuts]);

  const value = React.useMemo<ShortcutContextValue>(() => ({
    registerShortcuts,
    setContextActions,
    openPalette: () => setIsPaletteOpen(true),
    openShortcutHelp: () => setIsHelpOpen(true),
  }), [registerShortcuts]);

  return (
    <ShortcutContext.Provider value={value}>
      {children}
      <CommandPalette
        open={isPaletteOpen}
        onOpenChange={setIsPaletteOpen}
        contextActions={contextActions}
        onShowShortcuts={() => setIsHelpOpen(true)}
      />
      <CommandPalette
        open={isHelpOpen}
        onOpenChange={setIsHelpOpen}
        contextActions={registry.getActive(pathname).map((shortcut) => ({
          id: `help.${shortcut.id}`,
          title: shortcut.combo,
          description: shortcut.description,
          group: "Keyboard shortcuts",
          perform: () => undefined,
        }))}
        helpOnly
      />
    </ShortcutContext.Provider>
  );
}

export function useShortcutContext() {
  const context = React.useContext(ShortcutContext);
  if (!context) {
    throw new Error("useShortcutContext must be used inside ShortcutProvider");
  }

  return context;
}
