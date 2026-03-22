import * as React from "react";

import { EmptyState } from "@/components/feedback/empty-state";

export function ReportEmptyState({ title, description }: { title: string; description: string }) {
  return <EmptyState title={title} description={description} />;
}
