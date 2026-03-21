"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { transferSchema, type TransferFormValues } from "@/features/banking/schemas";
import type { BankAccount } from "@/features/banking/types";
import { ApiError } from "@/lib/api/errors";

export function ReconcileTransferDialog({ open, onOpenChange, sourceBankAccountId, bankAccounts, onConfirm, isSubmitting }: { open: boolean; onOpenChange: (open: boolean) => void; sourceBankAccountId: string; bankAccounts: BankAccount[]; onConfirm: (values: TransferFormValues) => Promise<void>; isSubmitting?: boolean; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<TransferFormValues>({ resolver: zodResolver(transferSchema), defaultValues: { destination_bank_account_id: "", notes: "", source_bank_account_id: sourceBankAccountId } });
  React.useEffect(() => { if (open) { form.reset({ destination_bank_account_id: "", notes: "", source_bank_account_id: sourceBankAccountId }); setServerError(null); } }, [form, open, sourceBankAccountId]);
  async function handleSubmit(values: TransferFormValues) { setServerError(null); try { await onConfirm(values); onOpenChange(false); } catch (error) { setServerError(error instanceof ApiError ? error.message : "Unable to reconcile transfer."); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Transfer between bank accounts</DialogTitle><DialogDescription>Use this only for internal transfers between your own cash accounts.</DialogDescription></DialogHeader><Form {...form}><form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}><InlineValidationMessage message={serverError} /><FormField control={form.control} name="destination_bank_account_id" render={({ field }) => (<FormItem><FormLabel>Destination bank account</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Select destination account" /></SelectTrigger></FormControl><SelectContent>{bankAccounts.filter((bankAccount) => bankAccount.id !== sourceBankAccountId).map((bankAccount) => <SelectItem key={bankAccount.id} value={bankAccount.id}>{bankAccount.displayName || bankAccount.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} /><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Reconciling…" : "Confirm transfer"}</Button></DialogFooter></form></Form></DialogContent></Dialog>;
}
