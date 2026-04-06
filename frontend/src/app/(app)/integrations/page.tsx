"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCreateIntegrationConnection, useIntegrationConnections, useIntegrationProviders, useIntegrationSyncRuns, useTriggerIntegrationSync } from "@/features/integrations/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function IntegrationsPage() {
  const { currentOrganizationId } = useOrganization();
  const providersQuery = useIntegrationProviders(currentOrganizationId ?? undefined);
  const connectionsQuery = useIntegrationConnections(currentOrganizationId ?? undefined);
  const createConnection = useCreateIntegrationConnection(currentOrganizationId ?? undefined);
  const triggerSync = useTriggerIntegrationSync(currentOrganizationId ?? undefined);
  const [selectedProvider, setSelectedProvider] = useState("bank_feed_sandbox");
  const [displayName, setDisplayName] = useState("My integration");
  const selectedConnectionId = connectionsQuery.data?.[0]?.id;
  const syncRunsQuery = useIntegrationSyncRuns(currentOrganizationId ?? undefined, selectedConnectionId);

  const availableProviders = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);

  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Select an organization before managing integrations." />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Ecosystem" title="Integrations" description="Connect providers, trigger sync runs, inspect health, and monitor integration lifecycle state." />
      <Card>
        <CardHeader><CardTitle>Provider catalog</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {availableProviders.map((provider) => (
            <div key={provider.key} className="rounded-lg border border-border/70 p-3 text-sm">
              <p className="font-semibold">{provider.name}</p>
              <p className="text-muted-foreground">{provider.category} · auth: {provider.auth_type}</p>
              <p className="text-muted-foreground">Status: {provider.status} · {provider.is_entitled ? "Entitled" : "Not entitled"}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Create connection</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value)}>
            {availableProviders.map((provider) => <option key={provider.key} value={provider.key}>{provider.name}</option>)}
          </select>
          <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Connection display name" />
          <Button onClick={() => createConnection.mutate({ provider_key: selectedProvider, display_name: displayName, connection_mode: "manual", secret_ref: `${selectedProvider}-secret` })} disabled={createConnection.isPending}>Connect provider</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Connections</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(connectionsQuery.data ?? []).map((connection) => (
            <div key={connection.id} className="rounded-lg border border-border/70 p-3 text-sm">
              <p className="font-semibold">{connection.display_name}</p>
              <p className="text-muted-foreground">{connection.provider_key} · status: {connection.status}</p>
              <div className="pt-2">
                <Button size="sm" onClick={() => triggerSync.mutate({ connectionId: connection.id, direction: "pull" })} disabled={triggerSync.isPending}>Run sync</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sync history</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(syncRunsQuery.data ?? []).map((run) => (
            <div key={run.id} className="rounded border border-border/60 p-2">
              <p className="font-medium">{run.provider_key} · {run.status}</p>
              <p className="text-muted-foreground">seen {run.records_seen}, created {run.records_created}, updated {run.records_updated}, skipped {run.records_skipped}, failed {run.records_failed}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
