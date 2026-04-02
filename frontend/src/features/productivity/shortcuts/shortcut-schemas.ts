export type ShortcutScope = "global" | "route" | "context";

export type ShortcutDefinition = {
  id: string;
  combo: string;
  description: string;
  handler: () => void;
  scope?: ShortcutScope;
  route?: string;
  allowInInput?: boolean;
  preventDefault?: boolean;
};

export type ShortcutBinding = ShortcutDefinition & {
  scope: ShortcutScope;
  normalizedCombo: string;
};

function normalizeAlias(token: string) {
  const lower = token.toLowerCase().trim();
  if (lower === "cmd") return "meta";
  if (lower === "control") return "ctrl";
  if (lower === "option") return "alt";
  if (lower === "escape") return "esc";
  if (lower === "return") return "enter";
  return lower;
}

export function normalizeCombo(combo: string) {
  const tokens = combo
    .split("+")
    .map((part) => normalizeAlias(part))
    .filter(Boolean);

  const modifiers = ["meta", "ctrl", "alt", "shift"].filter((modifier) => tokens.includes(modifier));
  const keys = tokens.filter((token) => !modifiers.includes(token));
  return [...modifiers, ...keys].join("+");
}

export function eventToCombo(event: KeyboardEvent) {
  const modifiers: string[] = [];
  if (event.metaKey) modifiers.push("meta");
  if (event.ctrlKey) modifiers.push("ctrl");
  if (event.altKey) modifiers.push("alt");
  if (event.shiftKey) modifiers.push("shift");

  const key = normalizeAlias(event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase());
  return [...modifiers, key].join("+");
}

export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") return true;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}
