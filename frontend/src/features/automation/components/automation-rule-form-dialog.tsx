"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { automationRuleFormSchema, type AutomationRuleFormValues } from "@/features/automation/schemas";
import type { AutomationRule } from "@/features/automation/types";
import { ApiError } from "@/lib/api/errors";

function stringify(value: unknown) {
  return value ? JSON.stringify(value, null, 2) : "";
}

function defaultValues(rule?: AutomationRule | null): AutomationRuleFormValues {
  return {
    name: rule?.name ?? "",
    rule_type: rule?.ruleType ?? "document_coding",
    priority: String(rule?.priority ?? 100),
    is_active: rule?.isActive ?? true,
    description: rule?.description ?? "",
    entity_type: rule?.entityType ?? "",
    trigger_event: rule?.triggerEvent ?? "",
    action_type: rule?.actionType ?? "",
    conditions_json: stringify(rule?.conditions ?? []),
    action_config_json: stringify(rule?.actionConfig ?? null),
  };
}

export function AutomationRuleFormDialog({ open, onOpenChange, rule, onSubmit, isSubmitting }: { open: boolean; onOpenChange: (open: boolean) => void; rule?: AutomationRule | null; onSubmit: (values: AutomationRuleFormValues) => Promise<void>; isSubmitting?: boolean; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<AutomationRuleFormValues>({ resolver: zodResolver(automationRuleFormSchema), defaultValues: defaultValues(rule) });

  React.useEffect(() => {
    form.reset(defaultValues(rule));
    setServerError(null);
  }, [form, open, rule]);

  async function handleSubmit(values: AutomationRuleFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save automation rule.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{rule ? `Edit ${rule.name}` : "Create automation rule"}</DialogTitle>
          <DialogDescription>Rules remain assistive and explainable. They can suggest, not silently author accounting truth.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["name", "Rule name", "High-confidence utility bill coding"],
                ["rule_type", "Rule type", "document_coding"],
                ["priority", "Priority", "100"],
                ["entity_type", "Entity type", "bill"],
                ["trigger_event", "Trigger event", "document_uploaded"],
                ["action_type", "Action type", "suggest_account_code"],
              ].map(([name, label, placeholder]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name as keyof AutomationRuleFormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl><Input {...field} value={String(field.value ?? "")} placeholder={placeholder} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Explain what this automation rule is allowed to suggest and why." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid gap-4 lg:grid-cols-2">
              <FormField control={form.control} name="conditions_json" render={({ field }) => (
                <FormItem>
                  <FormLabel>Conditions JSON</FormLabel>
                  <FormControl><Textarea {...field} rows={10} value={field.value ?? ""} placeholder='[{"field":"supplier_name","operator":"contains","value":"Electric"}]' className="font-mono text-xs" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="action_config_json" render={({ field }) => (
                <FormItem>
                  <FormLabel>Action config JSON</FormLabel>
                  <FormControl><Textarea {...field} rows={10} value={field.value ?? ""} placeholder='{"account_code":"610","tax_code":"GST"}' className="font-mono text-xs" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem className="rounded-lg border border-border/70 p-3">
                <FormLabel className="flex items-center justify-between gap-3">
                  <span>Active rule</span>
                  <input type="checkbox" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                </FormLabel>
                <p className="text-sm text-muted-foreground">Inactive or archived rules remain historical and explainable but should not generate new suggestions.</p>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : rule ? "Save changes" : "Create rule"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
