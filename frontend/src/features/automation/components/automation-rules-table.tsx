import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AutomationStatusBadge } from "@/features/automation/components/automation-status-badge";
import type { AutomationRule } from "@/features/automation/types";

export function AutomationRulesTable({ rules, onEdit, onTest, onArchive }: { rules: AutomationRule[]; onEdit?: (rule: AutomationRule) => void; onTest?: (rule: AutomationRule) => void; onArchive?: (rule: AutomationRule) => void; }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rule name</TableHead>
            <TableHead>Rule type</TableHead>
            <TableHead className="text-right">Priority</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{rule.name}</span>
                  <span className="text-xs text-muted-foreground">{rule.actionType || "No action type"}</span>
                </div>
              </TableCell>
              <TableCell className="capitalize">{rule.ruleType.replaceAll("_", " ")}</TableCell>
              <TableCell className="text-right tabular-nums">{rule.priority}</TableCell>
              <TableCell>{rule.entityType || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell><AutomationStatusBadge value={rule.isActive ? "active" : "inactive"} /></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {onTest ? <Button size="sm" variant="outline" onClick={() => onTest(rule)}>Test</Button> : null}
                  {onEdit ? <Button size="sm" variant="outline" onClick={() => onEdit(rule)}>Edit</Button> : null}
                  {onArchive ? <Button size="sm" variant="destructive" onClick={() => onArchive(rule)}>Archive</Button> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
