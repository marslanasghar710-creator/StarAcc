import type { ReactNode } from "react";

export function SidebarNavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <div className="grid gap-1">{children}</div>
    </div>
  );
}
