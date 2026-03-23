import { BarChart3 } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";

export function ReportBuilderEmptyState({ title, description }: { title: string; description: string }) {
  return <EmptyState icon={BarChart3} title={title} description={description} />;
}
