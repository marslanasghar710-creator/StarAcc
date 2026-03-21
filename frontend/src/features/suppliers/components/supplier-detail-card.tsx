import { DateDisplay } from "@/components/shared/date-display";
import { EntitySummaryCard } from "@/components/shared/entity-summary-card";
import { SupplierStatusBadge } from "@/features/suppliers/components/supplier-status-badge";
import type { Supplier } from "@/features/suppliers/types";

function addressLines(address: Supplier["billingAddress"]) {
  return [address.address_line1, address.address_line2, address.city, address.state, address.postal_code, address.country].filter(Boolean).join(", ") || "—";
}

export function SupplierDetailCard({ supplier }: { supplier: Supplier }) {
  return (
    <EntitySummaryCard
      title="Supplier details"
      description="Contact, remittance, and procurement metadata returned by the backend."
      rows={[
        { label: "Display name", value: supplier.displayName },
        { label: "Legal name", value: supplier.legalName || "—" },
        { label: "Supplier number", value: supplier.supplierNumber || "—" },
        { label: "Email", value: supplier.email || "—" },
        { label: "Phone", value: supplier.phone || "—" },
        { label: "Website", value: supplier.website || "—" },
        { label: "Tax number", value: supplier.taxNumber || "—" },
        { label: "Currency", value: supplier.currencyCode || "Base currency" },
        { label: "Payment terms", value: supplier.paymentTermsDays ? `${supplier.paymentTermsDays} days` : "—" },
        { label: "Billing address", value: addressLines(supplier.billingAddress) },
        { label: "Remittance address", value: addressLines(supplier.remittanceAddress) },
        { label: "Status", value: <SupplierStatusBadge isActive={supplier.isActive} /> },
        { label: "Created", value: <DateDisplay value={supplier.createdAt} includeTime /> },
        { label: "Updated", value: <DateDisplay value={supplier.updatedAt} includeTime /> },
        { label: "Notes", value: supplier.notes || "—" },
      ]}
    />
  );
}
