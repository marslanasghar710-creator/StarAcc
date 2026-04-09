import Link from "next/link";
import type { OrgHealthSnapshot } from "@/features/observability/types";

export function OrgHealthTable({ items }: { items: OrgHealthSnapshot[] }) {
  return (
    <div className="overflow-auto rounded border">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left"><th className="p-2">Org</th><th>Status</th><th>Activation</th><th>Billing</th><th>Errors(24h)</th><th>Integrations</th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.org_id} className="border-b">
              <td className="p-2"><Link className="underline" href={`/admin/orgs/${item.org_id}`}>{item.org_id.slice(0, 8)}</Link></td>
              <td>{item.overall_status}</td>
              <td>{item.activation_status}</td>
              <td>{item.billing_status}</td>
              <td>{item.recent_error_summary.error_count_24h}</td>
              <td>{item.integration_attention.failing_integrations_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
