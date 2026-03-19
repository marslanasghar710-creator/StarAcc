import { formatDecimal } from "@/lib/accounting/decimal";
import { cn } from "@/lib/utils";

export function DecimalDisplay({
  value,
  className,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  zeroLabel,
}: {
  value: string | number | null | undefined;
  className?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  zeroLabel?: string;
}) {
  const formatted = formatDecimal(value, { minimumFractionDigits, maximumFractionDigits });
  const isZero = formatted === formatDecimal(0, { minimumFractionDigits, maximumFractionDigits });

  return <span className={cn("tabular-nums", className)}>{isZero && zeroLabel ? zeroLabel : formatted}</span>;
}
