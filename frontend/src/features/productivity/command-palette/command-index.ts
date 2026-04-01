import type { CommandAction } from "@/features/productivity/shortcuts/shortcut-provider";
import { filterNavigationItems } from "@/features/permissions/utils";
import { navigationItems } from "@/lib/permissions/navigation";

export function buildDefaultCommands(permissionSet: Set<string>, router: { push: (href: string) => void }): CommandAction[] {
  const navigationCommands = filterNavigationItems(navigationItems, permissionSet).map((item) => ({
    id: `nav.${item.href}`,
    title: `Go to ${item.title}`,
    description: item.description,
    group: "Navigation",
    keywords: [item.title, item.group],
    perform: () => router.push(item.href),
  }));

  return [
    ...navigationCommands,
    {
      id: "help.shortcuts",
      title: "Open keyboard shortcuts",
      description: "Show available global and page shortcuts",
      group: "Help",
      keywords: ["shortcuts", "keyboard"],
      perform: () => {
        window.dispatchEvent(new CustomEvent("productivity:show-shortcuts"));
      },
    },
  ];
}

export function filterCommands(commands: CommandAction[], query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return commands;

  return commands.filter((command) => {
    const haystack = [command.title, command.description, ...(command.keywords ?? []), command.group].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(term);
  });
}
