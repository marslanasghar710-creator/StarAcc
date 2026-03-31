"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/features/permissions/hooks";
import { buildDefaultCommands, filterCommands } from "@/features/productivity/command-palette/command-index";
import type { CommandAction } from "@/features/productivity/shortcuts/shortcut-provider";

export function CommandPalette({
  open,
  onOpenChange,
  contextActions,
  onShowShortcuts,
  helpOnly = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextActions: CommandAction[];
  onShowShortcuts?: () => void;
  helpOnly?: boolean;
}) {
  const router = useRouter();
  const { permissionSet } = usePermissions();
  const [query, setQuery] = React.useState("");

  const commands = React.useMemo(() => {
    if (helpOnly) {
      return contextActions;
    }
    return [...contextActions, ...buildDefaultCommands(permissionSet, router)];
  }, [contextActions, helpOnly, permissionSet, router]);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  React.useEffect(() => {
    if (!helpOnly && onShowShortcuts) {
      const handler = () => {
        onOpenChange(false);
        onShowShortcuts();
      };

      window.addEventListener("productivity:show-shortcuts", handler);
      return () => window.removeEventListener("productivity:show-shortcuts", handler);
    }

    return undefined;
  }, [helpOnly, onOpenChange, onShowShortcuts]);

  const filtered = filterCommands(commands, query);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="border-b border-border/60 px-4 py-3">
          <DialogTitle>{helpOnly ? "Keyboard shortcuts" : "Command palette"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 p-4">
          {!helpOnly ? <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions, routes, and reports" autoFocus /> : null}
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border/60">
            {filtered.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No matching actions.</p> : null}
            {filtered.map((command) => (
              <button
                key={command.id}
                type="button"
                className="flex w-full items-start justify-between gap-4 border-b border-border/40 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/60"
                onClick={() => {
                  command.perform();
                  onOpenChange(false);
                }}
              >
                <span>
                  <span className="font-medium text-foreground">{command.title}</span>
                  {command.description ? <span className="mt-0.5 block text-xs text-muted-foreground">{command.description}</span> : null}
                </span>
                {command.group ? <Badge variant="secondary">{command.group}</Badge> : null}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
