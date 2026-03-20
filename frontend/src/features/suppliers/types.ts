export type SupplierAddressFields = {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

export type RawSupplier = {
  id: string;
  organization_id?: string;
  organizationId?: string;
  supplier_number?: string | null;
  supplierNumber?: string | null;
  display_name?: string;
  displayName?: string;
  legal_name?: string | null;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  tax_number?: string | null;
  taxNumber?: string | null;
  currency_code?: string | null;
  currencyCode?: string | null;
  payment_terms_days?: number | null;
  paymentTermsDays?: number | null;
  notes?: string | null;
  is_active?: boolean;
  isActive?: boolean;
  billing_address_line1?: string | null;
  billing_address_line2?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_postal_code?: string | null;
  billing_country?: string | null;
  remittance_address_line1?: string | null;
  remittance_address_line2?: string | null;
  remittance_city?: string | null;
  remittance_state?: string | null;
  remittance_postal_code?: string | null;
  remittance_country?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

export type Supplier = {
  id: string;
  organizationId?: string;
  supplierNumber?: string | null;
  displayName: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  taxNumber?: string | null;
  currencyCode?: string | null;
  paymentTermsDays?: number | null;
  notes?: string | null;
  isActive: boolean;
  billingAddress: SupplierAddressFields;
  remittanceAddress: SupplierAddressFields;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type SupplierBalance = {
  supplierId: string;
  totalBilled: string;
  totalPaid: string;
  totalOutstanding: string;
};

export type SupplierActivityEntry = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  occurredAt?: string | null;
};

export type SupplierMutationPayload = {
  display_name: string;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  tax_number?: string | null;
  currency_code?: string | null;
  payment_terms_days?: number | null;
  notes?: string | null;
  billing_address_line1?: string | null;
  billing_address_line2?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_postal_code?: string | null;
  billing_country?: string | null;
  remittance_address_line1?: string | null;
  remittance_address_line2?: string | null;
  remittance_city?: string | null;
  remittance_state?: string | null;
  remittance_postal_code?: string | null;
  remittance_country?: string | null;
  is_active?: boolean;
};
