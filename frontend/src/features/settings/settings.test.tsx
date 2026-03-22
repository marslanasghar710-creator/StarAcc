import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ClosePeriodDialog } from '@/features/settings/components/close-period-dialog';
import { ReopenPeriodDialog } from '@/features/settings/components/reopen-period-dialog';
import { SettingsAvailabilityCard } from '@/features/settings/components/settings-availability-card';
import { SettingsNav } from '@/features/settings/components/settings-nav';
import { SettingsReadonlyCard } from '@/features/settings/components/settings-readonly-card';
import { TaxCodeStatusBadge } from '@/features/settings/components/tax-code-status-badge';
import { accountingSettingsSchema, documentSettingsSchema, fiscalPeriodSchema, organizationPreferencesSchema, taxCodeSchema } from '@/features/settings/schemas';
import type { SettingsSectionStatus } from '@/features/settings/types';

describe('settings form validation', () => {
  it('requires organization name and core org fields', () => {
    expect(organizationPreferencesSchema.safeParse({
      name: '',
      legal_name: '',
      registration_number: '',
      tax_number: '',
      base_currency: '',
      timezone: '',
      country: '',
      contact_email: '',
      contact_phone: '',
      website: '',
      fiscal_year_start_month: '0',
      fiscal_year_start_day: '0',
    }).success).toBe(false);
  });

  it('validates fiscal period ordering', () => {
    expect(fiscalPeriodSchema.safeParse({ name: 'Apr 2026', start_date: '2026-04-30', end_date: '2026-04-01', notes: '' }).success).toBe(false);
  });

  it('validates tax code decimals', () => {
    expect(taxCodeSchema.safeParse({ name: 'GST', code: 'GST', rate: 'abc', type: '', description: '', applies_to_sales: true, applies_to_purchases: true, is_active: true }).success).toBe(false);
  });

  it('accepts document and accounting settings payloads', () => {
    expect(documentSettingsSchema.safeParse({
      invoice_prefix: 'INV',
      bill_prefix: 'BILL',
      journal_prefix: 'JRN',
      credit_note_prefix: 'CRN',
      payment_prefix: 'PAY',
      supplier_credit_prefix: 'SCN',
      supplier_payment_prefix: 'SPY',
      quote_prefix: 'QTE',
      purchase_order_prefix: 'PO',
      next_invoice_number: '1001',
      next_bill_number: '',
      next_journal_number: '88',
      next_credit_note_number: '42',
    }).success).toBe(true);
    expect(accountingSettingsSchema.safeParse({
      default_locale: 'en-US',
      date_format: 'MM/DD/YYYY',
      number_format: '1,234.56',
      tax_enabled: true,
      multi_currency_enabled: false,
      base_currency: 'USD',
      timezone: 'UTC',
      week_start_day: '1',
      default_document_language: 'en',
    }).success).toBe(true);
  });
});

describe('settings UI helpers', () => {
  const availableSection: SettingsSectionStatus = {
    id: 'tax',
    title: 'Tax',
    description: 'Tax code maintenance',
    href: '/settings/tax',
    availability: 'available',
    requiredPermissions: ['tax_codes.read'],
    reason: 'Live tax codes.',
  };

  it('renders availability and permission restricted states', () => {
    const { rerender } = render(<SettingsAvailabilityCard section={availableSection} isPermitted />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText(/open section/i)).toBeInTheDocument();

    rerender(<SettingsAvailabilityCard section={{ ...availableSection, availability: 'unavailable', reason: 'Backend incomplete.' }} isPermitted={false} />);
    expect(screen.getByText(/restricted by permissions/i)).toBeInTheDocument();
  });

  it('renders readonly and status badges', () => {
    render(
      <>
        <SettingsReadonlyCard title="Read only" description="Backend exposes view-only settings." />
        <TaxCodeStatusBadge isActive={false} />
      </>,
    );

    expect(screen.getByText('Read only')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('renders permission-aware navigation state', () => {
    render(
      <SettingsNav
        activeHref="/settings/organization"
        sections={[
          { ...availableSection, id: 'organization', title: 'Organization', href: '/settings/organization', availability: 'available', isPermitted: true },
          { ...availableSection, id: 'preferences', title: 'Preferences', href: '/settings/preferences', availability: 'read-only', isPermitted: false },
        ]}
      />,
    );

    expect(screen.getByText('Restricted')).toBeInTheDocument();
    expect(screen.getByText(/permission restricted for your current role/i)).toBeInTheDocument();
  });

  it('renders close and reopen warnings', () => {
    render(
      <>
        <ClosePeriodDialog open onOpenChange={() => {}} period={{ id: 'p1', organizationId: 'o1', name: 'Apr 2026', startDate: '2026-04-01', endDate: '2026-04-30', status: 'open', fiscalYear: 2026, periodNumber: 4, closedAt: null, closedBy: null, notes: null }} onConfirm={async () => {}} />
        <ReopenPeriodDialog open onOpenChange={() => {}} period={{ id: 'p2', organizationId: 'o1', name: 'Mar 2026', startDate: '2026-03-01', endDate: '2026-03-31', status: 'closed', fiscalYear: 2026, periodNumber: 3, closedAt: null, closedBy: null, notes: null }} onConfirm={async () => {}} />
      </>,
    );

    expect(screen.getByText(/about to close apr 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/reopening mar 2026/i)).toBeInTheDocument();
  });
});
