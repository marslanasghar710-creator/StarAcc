import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFieldArray, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { Form } from '@/components/ui/form';
import type { Account } from '@/features/accounts/types';
import { BillLineItemsEditor } from '@/features/bills/components/bill-line-items-editor';
import { BillPaymentStatusCard } from '@/features/bills/components/bill-payment-status-card';
import { BillStatusBadge } from '@/features/bills/components/bill-status-badge';
import { billFormSchema, type BillFormValues } from '@/features/bills/schemas';

const accountOptions: Account[] = [
  { id: '11111111-1111-1111-1111-111111111111', code: '5000', name: 'Office Supplies', accountType: 'expense', normalBalance: 'debit', isActive: true, isPostable: true, isSystem: false },
];

function BillLinesHarness() {
  const form = useForm<BillFormValues>({
    defaultValues: {
      supplier_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      issue_date: '2026-03-19',
      due_date: '2026-03-20',
      currency_code: 'USD',
      reference: '',
      supplier_invoice_number: '',
      notes: '',
      terms: '',
      items: [
        { description: 'Item 1', quantity: '1', unit_price: '10', account_id: accountOptions[0].id, item_code: '', discount_percent: '', discount_amount: '', tax_code_id: '' },
      ],
    },
  });
  const fieldArray = useFieldArray({ control: form.control, name: 'items' });

  return (
    <Form {...form}>
      <BillLineItemsEditor form={form} fieldArray={fieldArray} accountOptions={accountOptions} currencyCode="USD" />
    </Form>
  );
}

describe('bill form validation', () => {
  it('requires supplier, valid dates, and at least one line', () => {
    const result = billFormSchema.safeParse({
      supplier_id: '',
      issue_date: '2026-03-20',
      due_date: '2026-03-19',
      currency_code: 'USD',
      reference: '',
      supplier_invoice_number: '',
      notes: '',
      terms: '',
      items: [],
    });

    expect(result.success).toBe(false);
  });
});

describe('bill line items editor', () => {
  it('adds and removes bill lines', async () => {
    const user = userEvent.setup();
    render(<BillLinesHarness />);

    expect(screen.getAllByRole('button', { name: /remove line/i })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /add line item/i }));
    expect(screen.getAllByRole('button', { name: /remove line/i })).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: /remove line 2/i }));
    expect(screen.getAllByRole('button', { name: /remove line/i })).toHaveLength(1);
  });
});

describe('bill status and payment rendering', () => {
  const bill = {
    id: 'b1',
    supplierId: 's1',
    supplierName: 'Northwind',
    supplierEmail: null,
    billNumber: 'BILL-001',
    status: 'posted' as const,
    issueDate: '2026-03-01',
    dueDate: '2000-01-01',
    currencyCode: 'USD',
    subtotalAmount: '100',
    taxAmount: '0',
    totalAmount: '100',
    amountPaid: '25',
    amountDue: '75',
    pricesEnteredAre: null,
    reference: null,
    supplierInvoiceNumber: null,
    notes: null,
    terms: null,
    approvedAt: null,
    postedAt: '2026-03-02T10:00:00Z',
    postedJournalId: null,
    createdAt: null,
    updatedAt: null,
    items: [],
  };

  it('renders overdue/partial payment visibility', () => {
    render(<BillPaymentStatusCard bill={bill} />);
    expect(screen.getByText('Partially paid')).toBeInTheDocument();
    expect(screen.getByText('Amount due')).toBeInTheDocument();
  });

  it('renders bill status badge', () => {
    render(<BillStatusBadge bill={bill} />);
    expect(screen.getByText('overdue')).toBeInTheDocument();
  });
});
