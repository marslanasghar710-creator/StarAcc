"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ignoreTransactionSchema, type IgnoreTransactionFormValues } from "@/features/banking/schemas";
import { ApiError } from "@/lib/api/errors";

export function IgnoreTransactionDialog({ open, onOpenChange, onConfirm, isSubmitting }: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: (values: IgnoreTransactionFormValues) => Promise<void>; isSubmitting?: boolean; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<IgnoreTransactionFormValues>({ resolver: zodResolver(ignoreTransactionSchema), defaultValues: { reason: "" } });
  React.useEffect(() => { if (open) { form.reset({ reason: "" }); setServerError(null); } }, [form, open]);
  async function handleSubmit(values: IgnoreTransactionFormValues) { setServerError(null); try { await onConfirm(values); onOpenChange(false); } catch (error) { setServerError(error instanceof ApiError ? error.message : "Unable to ignore transaction."); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Ignore transaction</DialogTitle><DialogDescription>Ignoring keeps the imported bank line visible but excludes it from active reconciliation work.</DialogDescription></DialogHeader><Form {...form}><form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}><InlineValidationMessage message={serverError} /><FormField control={form.control} name="reason" render={({ field }) => (<FormItem><FormLabel>Reason (optional)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} /><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Ignoring…" : "Ignore transaction"}</Button></DialogFooter></form></Form></DialogContent></Dialog>;
}
