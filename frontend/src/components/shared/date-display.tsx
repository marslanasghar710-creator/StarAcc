export function DateDisplay({ value, includeTime = false }: { value?: string | null; includeTime?: boolean }) {
  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }

  const date = new Date(value);

  return (
    <span className="tabular-nums">
      {new Intl.DateTimeFormat(undefined, includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date)}
    </span>
  );
}
