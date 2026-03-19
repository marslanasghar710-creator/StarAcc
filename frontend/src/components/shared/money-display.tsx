import { DecimalDisplay } from "@/components/shared/decimal-display";
import { cn } from "@/lib/utils";

export function MoneyDisplay({ value, currencyCode, className }: { value: string | number | null | undefined; currencyCode?: string | null; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", className)}>
      {currencyCode ? <span className="text-muted-foreground">{currencyCode}</span> : null}
      <DecimalDisplay value={value} />
    </span>
  );
}
