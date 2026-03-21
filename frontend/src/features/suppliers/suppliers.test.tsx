import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SupplierStatusBadge } from '@/features/suppliers/components/supplier-status-badge';
import { supplierFormSchema } from '@/features/suppliers/schemas';

describe('supplier form validation', () => {
  it('requires display name and validates email', () => {
    const result = supplierFormSchema.safeParse({
      display_name: '',
      legal_name: '',
      email: 'bad-email',
      phone: '',
      website: '',
      tax_number: '',
      currency_code: '',
      payment_terms_days: '30',
      notes: '',
      billing_address_line1: '',
      billing_address_line2: '',
      billing_city: '',
      billing_state: '',
      billing_postal_code: '',
      billing_country: '',
      remittance_address_line1: '',
      remittance_address_line2: '',
      remittance_city: '',
      remittance_state: '',
      remittance_postal_code: '',
      remittance_country: '',
      is_active: true,
    });

    expect(result.success).toBe(false);
  });

  it('accepts a valid supplier payload', () => {
    const result = supplierFormSchema.safeParse({
      display_name: 'Northwind Supplies',
      legal_name: 'Northwind Supplies LLC',
      email: 'ap@northwind.test',
      phone: '+1 555 0100',
      website: 'https://northwind.test',
      tax_number: 'VAT123',
      currency_code: 'USD',
      payment_terms_days: '30',
      notes: 'Preferred supplier',
      billing_address_line1: '123 Main',
      billing_address_line2: '',
      billing_city: 'Seattle',
      billing_state: 'WA',
      billing_postal_code: '98101',
      billing_country: 'US',
      remittance_address_line1: 'PO Box 1',
      remittance_address_line2: '',
      remittance_city: 'Seattle',
      remittance_state: 'WA',
      remittance_postal_code: '98102',
      remittance_country: 'US',
      is_active: true,
    });

    expect(result.success).toBe(true);
  });
});

describe('supplier UI helpers', () => {
  it('renders inactive supplier state', () => {
    render(<SupplierStatusBadge isActive={false} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
