"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { automationRuleTestSchema, type AutomationRuleTestValues } from "@/features/automation/schemas";
import type { AutomationRule, AutomationRuleTestResult } from "@/features/automation/types";
import { StructuredDataViewer } from "@/features/automation/components/structured-data-viewer";
import { ApiError } from "@/lib/api/errors";

export function AutomationRuleTestDialog({ open, onOpenChange, rule, onSubmit, isSubmitting, result }: { open: boolean; onOpenChange: (open: boolean) => void; rule?: AutomationRule | null; onSubmit: (values: AutomationRuleTestValues) => Promise<void>; isSubmitting?: boolean; result?: AutomationRuleTestResult | null; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<AutomationRuleTestValues>({ resolver: zodResolver(automationRuleTestSchema), defaultValues: { sample_payload_json: '{\n  "supplier_name": "Northwind Power",\n  "amount": 199.50\n}' } });

  React.useEffect(() => {
    setServerError(null);
    if (!open) {
      form.reset({ sample_payload_json: '{\n  "supplier_name": "Northwind Power",\n  "amount": 199.50\n}' });
    }
  }, [form, open]);

  async function handleSubmit(values: AutomationRuleTestValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to test automation rule.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{rule ? `Test ${rule.name}` : "Test automation rule"}</DialogTitle>
          <DialogDescription>Run the rule against a sample payload and inspect the backend explanation trace before trusting any suggestion.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <FormField control={form.control} name="sample_payload_json" render={({ field }) => (
              <FormItem>
                <FormLabel>Sample payload JSON</FormLabel>
                <FormControl><Textarea {...field} rows={12} value={field.value ?? ""} className="font-mono text-xs" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {result ? (
              <div className="space-y-3 rounded-xl border border-border/70 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Matched</p>
                  <p className="font-semibold">{result.matched ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Summary</p>
                  <p className="text-sm">{result.summary}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trace</p>
                  {result.trace.length === 0 ? <p className="text-sm text-muted-foreground">No trace returned.</p> : <ul className="list-disc space-y-1 pl-5 text-sm">{result.trace.map((item) => <li key={item}>{item}</li>)}</ul>}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Metadata</p>
                  <StructuredDataViewer data={result.metadata} />
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Testing…" : "Run test"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
