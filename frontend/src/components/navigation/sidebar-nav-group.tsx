import type { ReactNode } from "react";

export function SidebarNavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="grid gap-1">{children}</div>
    </div>
  );
}
