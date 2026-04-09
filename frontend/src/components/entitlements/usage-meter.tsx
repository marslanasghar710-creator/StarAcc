"use client";

export function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | string | null | undefined }) {
  const percent = typeof limit === "number" && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const maxLabel = typeof limit === "number" ? String(limit) : "∞";
  return (
    <div className="space-y-1.5 min-w-[140px]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{used} / {maxLabel} used</p>
      {typeof limit === "number" ? (
        <div className="h-1.5 rounded-full bg-muted">
          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
    </div>
  );
}
