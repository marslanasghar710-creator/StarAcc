"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { depreciationRunFormSchema, type DepreciationRunFormValues } from "@/features/assets/schemas";
import { ApiError } from "@/lib/api/errors";

function defaultValues(): DepreciationRunFormValues {
  return {
    through_date: new Date().toISOString().slice(0, 10),
  };
}

export function DepreciationRunDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: DepreciationRunFormValues) => Promise<void>;
  isSubmitting?: boolean;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<DepreciationRunFormValues>({
    resolver: zodResolver(depreciationRunFormSchema),
    defaultValues: defaultValues(),
  });

  React.useEffect(() => {
    if (open) {
      form.reset(defaultValues());
      setServerError(null);
    }
  }, [form, open]);

  async function handleSubmit(values: DepreciationRunFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to run depreciation.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Run depreciation</DialogTitle>
          <DialogDescription>Trigger a backend depreciation run for the selected organization without recreating schedule truth in the client.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <FormField control={form.control} name="through_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Through date</FormLabel>
                <FormControl><Input {...field} type="date" value={field.value ?? ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Running…" : "Run depreciation"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
