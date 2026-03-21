"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cashCodeSchema, type CashCodeFormValues } from "@/features/banking/schemas";
import type { Account } from "@/features/accounts/types";
import { ApiError } from "@/lib/api/errors";

export function ReconcileCashCodeDialog({ open, onOpenChange, accountOptions, onConfirm, isSubmitting }: { open: boolean; onOpenChange: (open: boolean) => void; accountOptions: Account[]; onConfirm: (values: CashCodeFormValues) => Promise<void>; isSubmitting?: boolean; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<CashCodeFormValues>({ resolver: zodResolver(cashCodeSchema), defaultValues: { target_account_id: "", description: "", tax_code_id: "", notes: "" } });
  React.useEffect(() => { if (open) { form.reset({ target_account_id: "", description: "", tax_code_id: "", notes: "" }); setServerError(null); } }, [form, open]);
  async function handleSubmit(values: CashCodeFormValues) { setServerError(null); try { await onConfirm(values); onOpenChange(false); } catch (error) { setServerError(error instanceof ApiError ? error.message : "Unable to cash code transaction."); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Cash code transaction</DialogTitle><DialogDescription>Create a backend-managed cash coding reconciliation against the selected target account.</DialogDescription></DialogHeader><Form {...form}><form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}><InlineValidationMessage message={serverError} /><FormField control={form.control} name="target_account_id" render={({ field }) => (<FormItem><FormLabel>Target account</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger></FormControl><SelectContent>{accountOptions.filter((account) => account.isActive && account.isPostable).map((account) => <SelectItem key={account.id} value={account.id}>{account.code} · {account.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="tax_code_id" render={({ field }) => (<FormItem><FormLabel>Tax code (optional)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="Tax code ID if supported" /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} /><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Reconciling…" : "Confirm cash code"}</Button></DialogFooter></form></Form></DialogContent></Dialog>;
}
