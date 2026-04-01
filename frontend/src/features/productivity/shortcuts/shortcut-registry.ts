import { normalizeCombo, type ShortcutBinding, type ShortcutDefinition } from "@/features/productivity/shortcuts/shortcut-schemas";

function toBinding(definition: ShortcutDefinition): ShortcutBinding {
  return {
    ...definition,
    scope: definition.scope ?? "context",
    normalizedCombo: normalizeCombo(definition.combo),
  };
}

export class ShortcutRegistry {
  private bindings = new Map<string, ShortcutBinding>();

  register(definition: ShortcutDefinition) {
    this.bindings.set(definition.id, toBinding(definition));
    return () => this.bindings.delete(definition.id);
  }

  getActive(pathname: string) {
    return Array.from(this.bindings.values()).filter((binding) => {
      if (binding.scope === "global") return true;
      if (!binding.route) return true;
      return pathname === binding.route || pathname.startsWith(`${binding.route}/`);
    });
  }
}
