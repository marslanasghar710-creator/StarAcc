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
import { bankRuleFormSchema, type BankRuleFormValues } from "@/features/banking/schemas";
import type { BankAccount, BankRule } from "@/features/banking/types";
import type { Account } from "@/features/accounts/types";
import { ApiError } from "@/lib/api/errors";

function defaultValues(rule?: BankRule | null): BankRuleFormValues {
  return {
    name: rule?.name ?? "",
    is_active: rule?.isActive ?? true,
    priority: rule?.priority != null ? String(rule.priority) : "",
    applies_to_bank_account_id: rule?.appliesToBankAccountId ?? "",
    match_payee_contains: rule?.matchPayeeContains ?? "",
    match_description_contains: rule?.matchDescriptionContains ?? "",
    match_reference_contains: rule?.matchReferenceContains ?? "",
    match_amount_exact: rule?.matchAmountExact ?? "",
    match_amount_min: rule?.matchAmountMin ?? "",
    match_amount_max: rule?.matchAmountMax ?? "",
    direction: rule?.direction ?? "money_out",
    action_type: rule?.actionType ?? "cash_code",
    target_account_id: rule?.targetAccountId ?? "",
    auto_reconcile: rule?.autoReconcile ?? false,
    notes: rule?.notes ?? "",
  };
}

export function BankRuleFormDialog({ open, onOpenChange, rule, bankAccounts, accountOptions, onSubmit, isSubmitting }: { open: boolean; onOpenChange: (open: boolean) => void; rule?: BankRule | null; bankAccounts: BankAccount[]; accountOptions: Account[]; onSubmit: (values: BankRuleFormValues) => Promise<void>; isSubmitting?: boolean; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<BankRuleFormValues>({ resolver: zodResolver(bankRuleFormSchema), defaultValues: defaultValues(rule) });
  React.useEffect(() => { form.reset(defaultValues(rule)); setServerError(null); }, [form, open, rule]);
  async function handleSubmit(values: BankRuleFormValues) { setServerError(null); try { await onSubmit(values); onOpenChange(false); } catch (error) { setServerError(error instanceof ApiError ? error.message : "Unable to save bank rule."); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>{rule ? `Edit ${rule.name}` : "Create bank rule"}</DialogTitle><DialogDescription>Configure deterministic rule matching. Backend evaluation remains authoritative.</DialogDescription></DialogHeader><Form {...form}><form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}><InlineValidationMessage message={serverError} /><div className="grid gap-4 md:grid-cols-2"><FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="priority" render={({ field }) => (<FormItem><FormLabel>Priority</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="applies_to_bank_account_id" render={({ field }) => (<FormItem><FormLabel>Bank account scope</FormLabel><Select value={field.value || "all"} onValueChange={(value) => field.onChange(value === "all" ? "" : value)}><FormControl><SelectTrigger><SelectValue placeholder="All bank accounts" /></SelectTrigger></FormControl><SelectContent><SelectItem value="all">All bank accounts</SelectItem>{bankAccounts.map((bankAccount) => <SelectItem key={bankAccount.id} value={bankAccount.id}>{bankAccount.displayName || bankAccount.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="direction" render={({ field }) => (<FormItem><FormLabel>Direction</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="money_in">Money in</SelectItem><SelectItem value="money_out">Money out</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="action_type" render={({ field }) => (<FormItem><FormLabel>Action</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="cash_code">Cash code</SelectItem><SelectItem value="transfer">Transfer</SelectItem><SelectItem value="match_journal">Match journal</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="target_account_id" render={({ field }) => (<FormItem><FormLabel>Target account</FormLabel><Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}><FormControl><SelectTrigger><SelectValue placeholder="Optional target account" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">None</SelectItem>{accountOptions.filter((account) => account.isActive && account.isPostable).map((account) => <SelectItem key={account.id} value={account.id}>{account.code} · {account.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="match_payee_contains" render={({ field }) => (<FormItem><FormLabel>Payee contains</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="match_description_contains" render={({ field }) => (<FormItem><FormLabel>Description contains</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="match_reference_contains" render={({ field }) => (<FormItem><FormLabel>Reference contains</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="match_amount_exact" render={({ field }) => (<FormItem><FormLabel>Amount exact</FormLabel><FormControl><Input {...field} value={field.value ?? ""} inputMode="decimal" /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="match_amount_min" render={({ field }) => (<FormItem><FormLabel>Amount min</FormLabel><FormControl><Input {...field} value={field.value ?? ""} inputMode="decimal" /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="match_amount_max" render={({ field }) => (<FormItem><FormLabel>Amount max</FormLabel><FormControl><Input {...field} value={field.value ?? ""} inputMode="decimal" /></FormControl><FormMessage /></FormItem>)} /></div><FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} /><div className="grid gap-4 md:grid-cols-2"><FormField control={form.control} name="is_active" render={({ field }) => (<FormItem className="rounded-lg border border-border/70 p-3"><FormLabel className="flex items-center justify-between"><span>Active</span><input type="checkbox" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} /></FormLabel><FormMessage /></FormItem>)} /><FormField control={form.control} name="auto_reconcile" render={({ field }) => (<FormItem className="rounded-lg border border-border/70 p-3"><FormLabel className="flex items-center justify-between"><span>Auto reconcile</span><input type="checkbox" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} /></FormLabel><FormMessage /></FormItem>)} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : rule ? "Save changes" : "Create rule"}</Button></DialogFooter></form></Form></DialogContent></Dialog>;
}
