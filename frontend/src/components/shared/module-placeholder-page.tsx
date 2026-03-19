"use client";

import { ArrowRight, Clock3, LayoutTemplate, ShieldCheck } from "lucide-react";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { StatusBadge } from "@/components/feedback/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { TablePlaceholder } from "@/components/shared/table-placeholder";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/features/permissions/hooks";

export function ModulePlaceholderPage({ title, description, plannedCapabilities, requiredPermissions }: { title: string; description: string; plannedCapabilities: string[]; requiredPermissions?: string[]; }) {
  const { hasAnyPermission } = usePermissions();
  const canAccess = requiredPermissions?.length ? hasAnyPermission(requiredPermissions) : true;

  if (!canAccess) {
    return <AccessDeniedState description={`You need one of these permissions to view ${title.toLowerCase()}: ${requiredPermissions?.join(", ")}.`} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Frontend foundation"
        title={title}
        description={description}
        actions={
          <>
            <StatusBadge status="ready" />
            <Button variant="outline" className="gap-2">
              Delivery notes
              <ArrowRight className="size-4" />
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard title="Ready for implementation" description="The route, shell, permissions, and shared UI primitives are already connected.">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <LayoutTemplate className="mb-3 size-5 text-primary" />
              <p className="text-sm font-medium">Consistent shell</p>
              <p className="mt-1 text-sm text-muted-foreground">Pages inherit navigation, organization context, responsive layout, and shared SaaS spacing.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <ShieldCheck className="mb-3 size-5 text-primary" />
              <p className="text-sm font-medium">Permission-aware</p>
              <p className="mt-1 text-sm text-muted-foreground">Visibility and access scaffolding already align with backend-driven RBAC expectations.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <Clock3 className="mb-3 size-5 text-primary" />
              <p className="text-sm font-medium">Future-safe structure</p>
              <p className="mt-1 text-sm text-muted-foreground">Feature folders, typed API helpers, and reusable form patterns keep later prompts focused.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Next frontend slices" description="These are the practical enhancements expected to land next for this module.">
          <ul className="space-y-3 text-sm text-muted-foreground">
            {plannedCapabilities.map((capability) => (
              <li key={capability} className="rounded-lg border border-border/60 px-3 py-2">
                {capability}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Implementation queue</TabsTrigger>
          <TabsTrigger value="placeholder">Layout scaffold</TabsTrigger>
        </TabsList>
        <TabsContent value="queue">
          <EmptyState title={`${title} is staged`} description="Detailed workflows, CRUD screens, filters, and posting flows will be added in dedicated feature prompts." actionLabel="Continue planning" />
        </TabsContent>
        <TabsContent value="placeholder">
          <SectionCard title="Future list view scaffold" description="Placeholder hierarchy tuned for dense accounting workflows and table-driven modules.">
            <TablePlaceholder columns={["Primary", "Secondary", "Status", "Updated"]} />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
