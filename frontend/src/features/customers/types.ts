export type CustomerAddressFields = {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

export type RawCustomer = {
  id: string;
  organization_id?: string;
  organizationId?: string;
  customer_number?: string | null;
  customerNumber?: string | null;
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
  is_system?: boolean;
  isSystem?: boolean;
  billing_address_line1?: string | null;
  billing_address_line2?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_postal_code?: string | null;
  billing_country?: string | null;
  shipping_address_line1?: string | null;
  shipping_address_line2?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

export type Customer = {
  id: string;
  organizationId?: string;
  customerNumber?: string | null;
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
  isSystem: boolean;
  billingAddress: CustomerAddressFields;
  shippingAddress: CustomerAddressFields;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CustomerBalance = {
  customerId: string;
  totalInvoiced: string;
  totalPaid: string;
  totalOutstanding: string;
};

export type CustomerActivityEntry = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  occurredAt?: string | null;
};

export type CustomerMutationPayload = {
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
  shipping_address_line1?: string | null;
  shipping_address_line2?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;
  is_active?: boolean;
};
