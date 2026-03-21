import * as React from "react";

import { ErrorState } from "@/components/feedback/error-state";

export function ReportErrorState({ title, description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return <ErrorState title={title} description={description} onRetry={onRetry} />;
}
