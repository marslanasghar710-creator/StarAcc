import * as React from "react";
import { ArrowLeftRight, Ban, BookOpenText, CircleOff, HandCoins, Landmark, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BankTransaction } from "@/features/banking/types";

export function ReconciliationActionPanel({ transaction, canReconcile, canIgnore, canUnreconcile, onMatchCustomerPayment, onMatchSupplierPayment, onMatchJournal, onCashCode, onTransfer, onIgnore, onUnreconcile }: { transaction: BankTransaction; canReconcile: boolean; canIgnore: boolean; canUnreconcile: boolean; onMatchCustomerPayment: () => void; onMatchSupplierPayment: () => void; onMatchJournal: () => void; onCashCode: () => void; onTransfer: () => void; onIgnore: () => void; onUnreconcile: () => void; }) {
  const isReconciled = transaction.status === "reconciled";
  const isIgnored = transaction.status === "ignored";
  const allowNewReconciliation = canReconcile && !isReconciled && !isIgnored;

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Reconciliation actions</CardTitle>
        <CardDescription>Choose the backend reconciliation workflow that best reflects this transaction.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <Button type="button" variant="outline" onClick={onMatchCustomerPayment} disabled={!allowNewReconciliation}><HandCoins className="size-4" />Match customer payment</Button>
        <Button type="button" variant="outline" onClick={onMatchSupplierPayment} disabled={!allowNewReconciliation}><HandCoins className="size-4" />Match supplier payment</Button>
        <Button type="button" variant="outline" onClick={onMatchJournal} disabled={!allowNewReconciliation}><BookOpenText className="size-4" />Match journal</Button>
        <Button type="button" variant="outline" onClick={onCashCode} disabled={!allowNewReconciliation}><Landmark className="size-4" />Cash code</Button>
        <Button type="button" variant="outline" onClick={onTransfer} disabled={!allowNewReconciliation}><ArrowLeftRight className="size-4" />Transfer</Button>
        <Button type="button" variant="outline" onClick={onIgnore} disabled={!canIgnore || isReconciled || isIgnored}><CircleOff className="size-4" />Ignore</Button>
        <Button type="button" variant="destructive" onClick={onUnreconcile} disabled={!canUnreconcile || !isReconciled}><Undo2 className="size-4" />Unreconcile</Button>
        {!allowNewReconciliation && !isReconciled && !isIgnored ? <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground md:col-span-2"><Ban className="mb-2 size-4" />You need reconciliation permissions to action this bank transaction.</div> : null}
      </CardContent>
    </Card>
  );
}
