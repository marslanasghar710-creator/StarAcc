import { cn } from "@/lib/utils";

function renderValue(value: unknown, path: string) {
  if (value == null) {
    return <span className="text-muted-foreground">null</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground">[]</span>;
    }

    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={`${path}-${index}`} className="rounded-md border border-border/60 p-3">
            {renderValue(item, `${path}-${index}`)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="text-muted-foreground">{`{}`}</span>;
    }

    return (
      <div className="space-y-2">
        {entries.map(([key, nestedValue]) => (
          <div key={`${path}-${key}`} className="grid gap-2 rounded-md border border-border/60 p-3 md:grid-cols-[180px_1fr]">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{key.replaceAll("_", " ")}</div>
            <div className="min-w-0 text-sm">{renderValue(nestedValue, `${path}-${key}`)}</div>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "boolean") {
    return <span>{value ? "true" : "false"}</span>;
  }

  return <span className="break-words">{String(value)}</span>;
}

export function StructuredDataViewer({ data, emptyLabel = "No structured data available.", className }: { data?: Record<string, unknown> | null; emptyLabel?: string; className?: string; }) {
  if (!data || Object.keys(data).length === 0) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{emptyLabel}</p>;
  }

  return <div className={cn("space-y-2", className)}>{renderValue(data, "root")}</div>;
}
