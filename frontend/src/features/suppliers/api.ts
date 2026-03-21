import { apiClient } from "@/lib/api/client";
import { sanitizeDecimalInput } from "@/lib/accounting/decimal";

import type { RawSupplier, Supplier, SupplierActivityEntry, SupplierBalance, SupplierMutationPayload } from "@/features/suppliers/types";

function adaptSupplier(raw: RawSupplier): Supplier {
  return {
    id: raw.id,
    organizationId: raw.organization_id ?? raw.organizationId,
    supplierNumber: raw.supplier_number ?? raw.supplierNumber ?? null,
    displayName: raw.display_name ?? raw.displayName ?? "Unnamed supplier",
    legalName: raw.legal_name ?? raw.legalName ?? null,
    email: raw.email ?? null,
    phone: raw.phone ?? null,
    website: raw.website ?? null,
    taxNumber: raw.tax_number ?? raw.taxNumber ?? null,
    currencyCode: raw.currency_code ?? raw.currencyCode ?? null,
    paymentTermsDays: raw.payment_terms_days ?? raw.paymentTermsDays ?? null,
    notes: raw.notes ?? null,
    isActive: raw.is_active ?? raw.isActive ?? true,
    billingAddress: {
      address_line1: raw.billing_address_line1 ?? null,
      address_line2: raw.billing_address_line2 ?? null,
      city: raw.billing_city ?? null,
      state: raw.billing_state ?? null,
      postal_code: raw.billing_postal_code ?? null,
      country: raw.billing_country ?? null,
    },
    remittanceAddress: {
      address_line1: raw.remittance_address_line1 ?? null,
      address_line2: raw.remittance_address_line2 ?? null,
      city: raw.remittance_city ?? null,
      state: raw.remittance_state ?? null,
      postal_code: raw.remittance_postal_code ?? null,
      country: raw.remittance_country ?? null,
    },
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
  };
}

export async function listSuppliers(organizationId: string) {
  const response = await apiClient<{ items: RawSupplier[] }>(`/organizations/${organizationId}/suppliers`);
  return response.items.map(adaptSupplier);
}

export async function searchSuppliers(organizationId: string, query: string) {
  const response = await apiClient<{ items: RawSupplier[] }>(`/organizations/${organizationId}/suppliers/search?q=${encodeURIComponent(query)}`);
  return response.items.map(adaptSupplier);
}

export async function getSupplier(organizationId: string, supplierId: string) {
  const response = await apiClient<RawSupplier>(`/organizations/${organizationId}/suppliers/${supplierId}`);
  return adaptSupplier(response);
}

export async function createSupplier(organizationId: string, payload: SupplierMutationPayload) {
  const response = await apiClient<RawSupplier>(`/organizations/${organizationId}/suppliers`, { method: "POST", body: payload });
  return adaptSupplier(response);
}

export async function updateSupplier(organizationId: string, supplierId: string, payload: Partial<SupplierMutationPayload>) {
  const response = await apiClient<RawSupplier>(`/organizations/${organizationId}/suppliers/${supplierId}`, { method: "PATCH", body: payload });
  return adaptSupplier(response);
}

export async function archiveSupplier(organizationId: string, supplierId: string) {
  return apiClient<{ message: string }>(`/organizations/${organizationId}/suppliers/${supplierId}`, { method: "DELETE" });
}

export async function getSupplierBalance(organizationId: string, supplierId: string): Promise<SupplierBalance> {
  const response = await apiClient<Record<string, string | number | undefined>>(`/organizations/${organizationId}/suppliers/${supplierId}/balance`);
  return {
    supplierId: String(response.supplier_id ?? response.supplierId ?? supplierId),
    totalBilled: sanitizeDecimalInput(response.total_billed ?? response.totalBilled ?? 0),
    totalPaid: sanitizeDecimalInput(response.total_paid ?? response.totalPaid ?? 0),
    totalOutstanding: sanitizeDecimalInput(response.total_outstanding ?? response.totalOutstanding ?? 0),
  };
}

export async function getSupplierActivity(organizationId: string, supplierId: string): Promise<SupplierActivityEntry[]> {
  const response = await apiClient<{ activity?: unknown[]; items?: unknown[] }>(`/organizations/${organizationId}/suppliers/${supplierId}/activity`);
  const entries = response.activity ?? response.items ?? [];
  return entries.map((entry, index) => {
    if (typeof entry === "string") {
      return { id: `${supplierId}-${index}`, type: "event", title: entry } satisfies SupplierActivityEntry;
    }

    if (typeof entry === "object" && entry !== null) {
      const value = entry as Record<string, unknown>;
      return {
        id: String(value.id ?? `${supplierId}-${index}`),
        type: String(value.type ?? value.activity_type ?? "event"),
        title: String(value.title ?? value.label ?? value.type ?? "Activity"),
        description: typeof value.description === "string" ? value.description : null,
        occurredAt: typeof value.occurred_at === "string" ? value.occurred_at : typeof value.created_at === "string" ? value.created_at : null,
      } satisfies SupplierActivityEntry;
    }

    return { id: `${supplierId}-${index}`, type: "event", title: "Activity" } satisfies SupplierActivityEntry;
  });
}
