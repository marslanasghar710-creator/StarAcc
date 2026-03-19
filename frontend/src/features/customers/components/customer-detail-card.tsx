import { DateDisplay } from "@/components/shared/date-display";
import { EntitySummaryCard } from "@/components/shared/entity-summary-card";
import { CustomerStatusBadge } from "@/features/customers/components/customer-status-badge";
import type { Customer } from "@/features/customers/types";

function addressLines(address: Customer["billingAddress"]) {
  return [address.address_line1, address.address_line2, address.city, address.state, address.postal_code, address.country].filter(Boolean).join(", ") || "—";
}

export function CustomerDetailCard({ customer }: { customer: Customer }) {
  return (
    <EntitySummaryCard
      title="Customer details"
      description="Contact, billing, and commercial metadata returned by the backend."
      rows={[
        { label: "Display name", value: customer.displayName },
        { label: "Legal name", value: customer.legalName || "—" },
        { label: "Customer number", value: customer.customerNumber || "—" },
        { label: "Email", value: customer.email || "—" },
        { label: "Phone", value: customer.phone || "—" },
        { label: "Website", value: customer.website || "—" },
        { label: "Tax number", value: customer.taxNumber || "—" },
        { label: "Currency", value: customer.currencyCode || "Base currency" },
        { label: "Payment terms", value: customer.paymentTermsDays ? `${customer.paymentTermsDays} days` : "—" },
        { label: "Billing address", value: addressLines(customer.billingAddress) },
        { label: "Shipping address", value: addressLines(customer.shippingAddress) },
        { label: "Status", value: <CustomerStatusBadge isActive={customer.isActive} /> },
        { label: "Created", value: <DateDisplay value={customer.createdAt} includeTime /> },
        { label: "Updated", value: <DateDisplay value={customer.updatedAt} includeTime /> },
        { label: "Notes", value: customer.notes || "—" },
      ]}
    />
  );
}
