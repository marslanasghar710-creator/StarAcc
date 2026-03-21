import Link from "next/link";

import { MoneyDisplay } from "@/components/shared/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BankAccountStatusBadge } from "@/features/banking/components/bank-account-status-badge";
import type { BankAccount, BankAccountSummary } from "@/features/banking/types";

export function BankAccountListTable({ bankAccounts, summaryMap }: { bankAccounts: BankAccount[]; summaryMap?: Map<string, BankAccountSummary> }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bank account</TableHead>
            <TableHead>Bank</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>GL mapping</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ledger balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bankAccounts.map((bankAccount) => {
            const summary = summaryMap?.get(bankAccount.id);
            return (
              <TableRow key={bankAccount.id}>
                <TableCell>
                  <Link href={`/banking/accounts/${bankAccount.id}`} className="block hover:text-primary">
                    <div className="font-medium">{bankAccount.displayName || bankAccount.name}</div>
                    <div className="text-muted-foreground">{bankAccount.accountNumberMasked || bankAccount.ibanMasked || bankAccount.name}</div>
                  </Link>
                </TableCell>
                <TableCell>{bankAccount.bankName || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{bankAccount.accountType || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{bankAccount.currencyCode}</TableCell>
                <TableCell>{bankAccount.glAccountCode || bankAccount.glAccountName || bankAccount.glAccountId}</TableCell>
                <TableCell><BankAccountStatusBadge isActive={bankAccount.isActive} /></TableCell>
                <TableCell className="text-right">{summary ? <MoneyDisplay value={summary.ledgerBalance} currencyCode={bankAccount.currencyCode} className="justify-end" /> : <span className="text-muted-foreground">—</span>}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
