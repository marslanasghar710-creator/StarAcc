"use client";

import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function TextField<TFieldValues extends FieldValues>({ form, name, label, description, placeholder, type = "text" }: { form: UseFormReturn<TFieldValues>; name: Path<TFieldValues>; label: string; description?: string; placeholder?: string; type?: string; }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ""} placeholder={placeholder} type={type} />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
