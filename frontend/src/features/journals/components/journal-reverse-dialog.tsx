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
import { journalReverseSchema, type JournalReverseFormValues } from "@/features/journals/schemas";

export function JournalReverseDialog({
  open,
  onOpenChange,
  defaultDate,
  onConfirm,
  isSubmitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: string;
  onConfirm: (values: JournalReverseFormValues) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}) {
  const form = useForm<JournalReverseFormValues>({
    resolver: zodResolver(journalReverseSchema),
    defaultValues: { reversal_date: defaultDate, reason: "" },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ reversal_date: defaultDate, reason: "" });
    }
  }, [defaultDate, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse journal</DialogTitle>
          <DialogDescription>Reversal creates a new journal with inverted lines. The backend determines whether the selected period allows it.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(async (values) => onConfirm(values))}>
            <InlineValidationMessage message={error} />
            <FormField
              control={form.control}
              name="reversal_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reversal date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Explain why this journal is being reversed" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Reversing…" : "Create reversal"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
