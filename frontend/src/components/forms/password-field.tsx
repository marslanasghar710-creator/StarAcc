"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function PasswordField<TFieldValues extends FieldValues>({ form, name, label, description, placeholder }: { form: UseFormReturn<TFieldValues>; name: Path<TFieldValues>; label: string; description?: string; placeholder?: string; }) {
  const [visible, setVisible] = React.useState(false);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="relative">
              <Input {...field} value={field.value ?? ""} placeholder={placeholder} type={visible ? "text" : "password"} />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => setVisible((current) => !current)}>
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                <span className="sr-only">Toggle password visibility</span>
              </Button>
            </div>
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
