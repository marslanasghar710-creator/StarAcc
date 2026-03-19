"use client";

import { FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Customer } from "@/features/customers/types";

export function CustomerSelect({
  value,
  onChange,
  customers,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  customers: Customer[];
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <FormControl>
        <SelectTrigger>
          <SelectValue placeholder="Select customer" />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {customers.filter((customer) => customer.isActive).map((customer) => (
          <SelectItem key={customer.id} value={customer.id}>{customer.displayName}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
