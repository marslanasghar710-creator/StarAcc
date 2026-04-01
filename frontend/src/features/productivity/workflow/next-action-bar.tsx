import Link from "next/link";

import { Button } from "@/components/ui/button";

export type NextAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  disabled?: boolean;
};

export function NextActionBar({ title = "Next steps", actions }: { title?: string; actions: NextAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          action.href ? (
            <Button key={`${action.label}-${action.href}`} asChild variant={action.variant ?? "outline"} disabled={action.disabled}>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button key={action.label} type="button" variant={action.variant ?? "outline"} onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </Button>
          )
        ))}
      </div>
    </div>
  );
}
