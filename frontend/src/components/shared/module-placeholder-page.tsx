import { ArrowRight, Clock3, LayoutTemplate, ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { StatusBadge } from "@/components/feedback/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { TablePlaceholder } from "@/components/shared/table-placeholder";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ModulePlaceholderPage({ title, description, plannedCapabilities }: { title: string; description: string; plannedCapabilities: string[] }) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Frontend foundation"
        title={title}
        description={description}
        actions={
          <>
            <StatusBadge status="draft" />
            <Button variant="outline" className="gap-2">
              Planning note
              <ArrowRight className="size-4" />
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard title="Ready for implementation" description="The route, shell, spacing, and common UI primitives are in place.">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <LayoutTemplate className="mb-3 size-5 text-primary" />
              <p className="text-sm font-medium">Consistent shell</p>
              <p className="mt-1 text-sm text-muted-foreground">Pages inherit navigation, header, density, and tokens from the shared layout.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <ShieldCheck className="mb-3 size-5 text-primary" />
              <p className="text-sm font-medium">Permission-ready</p>
              <p className="mt-1 text-sm text-muted-foreground">Navigation and API layers are prepared for membership and RBAC wiring in later prompts.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <Clock3 className="mb-3 size-5 text-primary" />
              <p className="text-sm font-medium">Future-safe structure</p>
              <p className="mt-1 text-sm text-muted-foreground">Feature folders, typed client helpers, and reusable form patterns keep future modules focused.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Planned capabilities" description="These are the next frontend slices expected to plug into this module.">
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
          <TabsTrigger value="placeholder">Placeholder data grid</TabsTrigger>
        </TabsList>
        <TabsContent value="queue">
          <EmptyState title={`${title} UI is scaffolded`} description="Real workflows, mutations, filters, and detail pages will be implemented in dedicated feature prompts." actionLabel="Continue planning" />
        </TabsContent>
        <TabsContent value="placeholder">
          <SectionCard title="Future list view scaffold" description="Placeholder table spacing and hierarchy for dense accounting workflows.">
            <TablePlaceholder columns={["Column A", "Column B", "Column C", "Column D"]} />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
