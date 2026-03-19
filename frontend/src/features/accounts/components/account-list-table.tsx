import Link from "next/link";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccountStatusBadge } from "@/features/accounts/components/account-status-badge";
import type { Account } from "@/features/accounts/types";

function buildDepthMap(accounts: Account[]) {
  const map = new Map(accounts.map((account) => [account.id, account]));

  return new Map(
    accounts.map((account) => {
      let depth = 0;
      let parentId = account.parentAccountId;
      const visited = new Set<string>();
      while (parentId && map.has(parentId) && !visited.has(parentId)) {
        visited.add(parentId);
        depth += 1;
        parentId = map.get(parentId)?.parentAccountId ?? null;
      }
      return [account.id, depth] as const;
    }),
  );
}

export function AccountListTable({ accounts }: { accounts: Account[] }) {
  const depthMap = buildDepthMap(accounts);
  const accountMap = new Map(accounts.map((account) => [account.id, account]));

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Normal balance</TableHead>
            <TableHead>Parent account</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Posting</TableHead>
            <TableHead>Origin</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id} className="cursor-pointer">
              <TableCell className="font-medium">
                <Link href={`/accounts/${account.id}`} className="hover:text-primary">{account.code}</Link>
              </TableCell>
              <TableCell>
                <Link href={`/accounts/${account.id}`} className="flex items-center gap-2 hover:text-primary">
                  <span style={{ paddingLeft: `${(depthMap.get(account.id) ?? 0) * 16}px` }}>{account.name}</span>
                </Link>
              </TableCell>
              <TableCell><AccountStatusBadge kind="type" value={account.accountType} /></TableCell>
              <TableCell className="capitalize">{account.normalBalance}</TableCell>
              <TableCell>{account.parentAccountId ? accountMap.get(account.parentAccountId)?.name ?? account.parentAccountId : <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell><AccountStatusBadge kind="active" value={account.isActive} /></TableCell>
              <TableCell><AccountStatusBadge kind="postable" value={account.isPostable} /></TableCell>
              <TableCell><AccountStatusBadge kind="system" value={account.isSystem} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
