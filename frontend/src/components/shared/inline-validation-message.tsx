import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function InlineValidationMessage({ message, className }: { message?: string | null; className?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className={cn("flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive", className)}>
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
