import { apiClient } from "@/lib/api/client";
import { sanitizeDecimalInput } from "@/lib/accounting/decimal";

import type { Customer, CustomerActivityEntry, CustomerBalance, CustomerMutationPayload, RawCustomer } from "@/features/customers/types";

function adaptCustomer(raw: RawCustomer): Customer {
  return {
    id: raw.id,
    organizationId: raw.organization_id ?? raw.organizationId,
    customerNumber: raw.customer_number ?? raw.customerNumber ?? null,
    displayName: raw.display_name ?? raw.displayName ?? "Unnamed customer",
    legalName: raw.legal_name ?? raw.legalName ?? null,
    email: raw.email ?? null,
    phone: raw.phone ?? null,
    website: raw.website ?? null,
    taxNumber: raw.tax_number ?? raw.taxNumber ?? null,
    currencyCode: raw.currency_code ?? raw.currencyCode ?? null,
    paymentTermsDays: raw.payment_terms_days ?? raw.paymentTermsDays ?? null,
    notes: raw.notes ?? null,
    isActive: raw.is_active ?? raw.isActive ?? true,
    isSystem: raw.is_system ?? raw.isSystem ?? false,
    billingAddress: {
      address_line1: raw.billing_address_line1 ?? null,
      address_line2: raw.billing_address_line2 ?? null,
      city: raw.billing_city ?? null,
      state: raw.billing_state ?? null,
      postal_code: raw.billing_postal_code ?? null,
      country: raw.billing_country ?? null,
    },
    shippingAddress: {
      address_line1: raw.shipping_address_line1 ?? null,
      address_line2: raw.shipping_address_line2 ?? null,
      city: raw.shipping_city ?? null,
      state: raw.shipping_state ?? null,
      postal_code: raw.shipping_postal_code ?? null,
      country: raw.shipping_country ?? null,
    },
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
  };
}

export async function listCustomers(organizationId: string) {
  const response = await apiClient<{ items: RawCustomer[] }>(`/organizations/${organizationId}/customers`);
  return response.items.map(adaptCustomer);
}

export async function searchCustomers(organizationId: string, query: string) {
  const response = await apiClient<{ items: RawCustomer[] }>(`/organizations/${organizationId}/customers/search?q=${encodeURIComponent(query)}`);
  return response.items.map(adaptCustomer);
}

export async function getCustomer(organizationId: string, customerId: string) {
  const response = await apiClient<RawCustomer>(`/organizations/${organizationId}/customers/${customerId}`);
  return adaptCustomer(response);
}

export async function createCustomer(organizationId: string, payload: CustomerMutationPayload) {
  const response = await apiClient<RawCustomer>(`/organizations/${organizationId}/customers`, {
    method: "POST",
    body: payload,
  });

  return adaptCustomer(response);
}

export async function updateCustomer(organizationId: string, customerId: string, payload: Partial<CustomerMutationPayload>) {
  const response = await apiClient<RawCustomer>(`/organizations/${organizationId}/customers/${customerId}`, {
    method: "PATCH",
    body: payload,
  });

  return adaptCustomer(response);
}

export async function archiveCustomer(organizationId: string, customerId: string) {
  return apiClient<{ message: string }>(`/organizations/${organizationId}/customers/${customerId}`, {
    method: "DELETE",
  });
}

export async function getCustomerBalance(organizationId: string, customerId: string): Promise<CustomerBalance> {
  const response = await apiClient<{
    customer_id?: string;
    customerId?: string;
    total_invoiced?: string | number;
    totalInvoiced?: string | number;
    total_paid?: string | number;
    totalPaid?: string | number;
    total_outstanding?: string | number;
    totalOutstanding?: string | number;
  }>(`/organizations/${organizationId}/customers/${customerId}/balance`);

  return {
    customerId: response.customer_id ?? response.customerId ?? customerId,
    totalInvoiced: sanitizeDecimalInput(response.total_invoiced ?? response.totalInvoiced ?? 0),
    totalPaid: sanitizeDecimalInput(response.total_paid ?? response.totalPaid ?? 0),
    totalOutstanding: sanitizeDecimalInput(response.total_outstanding ?? response.totalOutstanding ?? 0),
  };
}

export async function getCustomerActivity(organizationId: string, customerId: string): Promise<CustomerActivityEntry[]> {
  const response = await apiClient<{ activity?: unknown[]; items?: unknown[] }>(`/organizations/${organizationId}/customers/${customerId}/activity`);
  const entries = response.activity ?? response.items ?? [];

  return entries.map((entry, index) => {
    if (typeof entry === "string") {
      return {
        id: `${customerId}-${index}`,
        type: "event",
        title: entry,
      } satisfies CustomerActivityEntry;
    }

    if (typeof entry === "object" && entry !== null) {
      const value = entry as Record<string, unknown>;
      return {
        id: String(value.id ?? `${customerId}-${index}`),
        type: String(value.type ?? value.activity_type ?? "event"),
        title: String(value.title ?? value.label ?? value.type ?? "Activity"),
        description: typeof value.description === "string" ? value.description : null,
        occurredAt: typeof value.occurred_at === "string" ? value.occurred_at : typeof value.created_at === "string" ? value.created_at : null,
      } satisfies CustomerActivityEntry;
    }

    return {
      id: `${customerId}-${index}`,
      type: "event",
      title: "Activity",
    } satisfies CustomerActivityEntry;
  });
}
