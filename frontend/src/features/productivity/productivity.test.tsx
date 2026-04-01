import { describe, expect, it, vi } from "vitest";

import { filterCommands } from "@/features/productivity/command-palette/command-index";
import { ShortcutRegistry } from "@/features/productivity/shortcuts/shortcut-registry";
import { isEditableTarget, normalizeCombo } from "@/features/productivity/shortcuts/shortcut-schemas";

describe("shortcut combo normalization", () => {
  it("normalizes aliases and modifier order", () => {
    expect(normalizeCombo("Shift+Cmd+K")).toBe("meta+shift+k");
    expect(normalizeCombo("control+/")).toBe("ctrl+/");
  });
});

describe("shortcut registry scope", () => {
  it("returns only matching route and global bindings", () => {
    const registry = new ShortcutRegistry();
    registry.register({ id: "global.one", combo: "meta+k", description: "palette", scope: "global", handler: vi.fn() });
    registry.register({ id: "invoices.one", combo: "r", description: "refresh", route: "/invoices", handler: vi.fn() });

    const invoices = registry.getActive("/invoices").map((shortcut) => shortcut.id);
    const bills = registry.getActive("/bills").map((shortcut) => shortcut.id);

    expect(invoices).toContain("global.one");
    expect(invoices).toContain("invoices.one");
    expect(bills).toContain("global.one");
    expect(bills).not.toContain("invoices.one");
  });
});

describe("command palette filtering", () => {
  it("filters by title and keywords", () => {
    const commands = [
      { id: "1", title: "Go to Invoices", keywords: ["sales"], perform: vi.fn() },
      { id: "2", title: "Go to Bills", keywords: ["ap"], perform: vi.fn() },
    ];

    expect(filterCommands(commands, "sales")).toHaveLength(1);
    expect(filterCommands(commands, "bills")).toHaveLength(1);
    expect(filterCommands(commands, "missing")).toHaveLength(0);
  });
});

describe("shortcut suppression while typing", () => {
  it("detects editable targets", () => {
    const input = document.createElement("input");
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");

    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(div)).toBe(true);
    expect(isEditableTarget(document.createElement("button"))).toBe(false);
  });
});
