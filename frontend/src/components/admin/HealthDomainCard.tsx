import type { PlatformHealthSummary } from "@/features/observability/types";

export function HealthDomainCard({ summary }: { summary: PlatformHealthSummary }) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {summary.domains.map((domain) => (
        <div key={domain.domain} className="rounded border p-3 text-sm">
          <p className="font-medium">{domain.domain}</p>
          <p className="text-muted-foreground">{domain.status}</p>
          <p className="text-muted-foreground">issues: {domain.issue_count}</p>
        </div>
      ))}
    </div>
  );
}
