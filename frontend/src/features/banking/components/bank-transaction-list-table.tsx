import Link from "next/link";

import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BankTransactionStatusBadge } from "@/features/banking/components/bank-transaction-status-badge";
import type { BankTransaction } from "@/features/banking/types";

export function BankTransactionListTable({ transactions }: { transactions: BankTransaction[] }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Payee</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Bank account</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell><DateDisplay value={transaction.transactionDate} /></TableCell>
              <TableCell><Link href={`/banking/transactions/${transaction.id}`} className="block hover:text-primary"><div className="font-medium">{transaction.description}</div><div className="text-muted-foreground">{transaction.memo || transaction.id}</div></Link></TableCell>
              <TableCell>{transaction.payee || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell>{transaction.reference || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell>{transaction.bankAccountName || transaction.bankAccountId}</TableCell>
              <TableCell><div className="flex items-center gap-2"><BankTransactionStatusBadge status={transaction.status} />{transaction.suggestionCount ? <span className="text-xs text-muted-foreground">{transaction.suggestionCount} suggestions</span> : null}</div></TableCell>
              <TableCell className="text-right"><MoneyDisplay value={transaction.amount} currencyCode={transaction.currencyCode} className="justify-end" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
