import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Supplier } from "@/features/suppliers/types";

export function SupplierSelect({ suppliers, value, onChange, disabled }: { suppliers: Supplier[]; value?: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
      <SelectContent>
        {suppliers.filter((supplier) => supplier.isActive || supplier.id === value).map((supplier) => (
          <SelectItem key={supplier.id} value={supplier.id}>{supplier.displayName}{supplier.legalName ? ` · ${supplier.legalName}` : ""}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
