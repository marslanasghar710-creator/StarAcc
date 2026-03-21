import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BankRuleStatusBadge } from "@/features/banking/components/bank-rule-status-badge";
import type { BankRule } from "@/features/banking/types";

export function BankRuleListTable({ rules, onEdit, onTest, onArchive, canArchive = true }: { rules: BankRule[]; onEdit: (rule: BankRule) => void; onTest: (rule: BankRule) => void; onArchive: (rule: BankRule) => void; canArchive?: boolean; }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rule</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Target</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell><div className="font-medium">{rule.name}</div><div className="text-muted-foreground">{rule.matchDescriptionContains || rule.matchPayeeContains || "—"}</div></TableCell>
              <TableCell>{rule.direction || "—"}</TableCell>
              <TableCell>{rule.actionType || "—"}</TableCell>
              <TableCell>{rule.priority ?? "—"}</TableCell>
              <TableCell><BankRuleStatusBadge isActive={rule.isActive} /></TableCell>
              <TableCell>{rule.targetAccountId || rule.appliesToBankAccountId || "—"}</TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-2"><button className="text-primary" onClick={() => onEdit(rule)}>Edit</button><button className="text-primary" onClick={() => onTest(rule)}>Test</button>{canArchive ? <button className="text-destructive" onClick={() => onArchive(rule)}>Archive</button> : null}</div></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
