import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFieldArray, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { Form } from '@/components/ui/form';
import { JournalActions } from '@/features/journals/components/journal-actions';
import { JournalLinesEditor } from '@/features/journals/components/journal-lines-editor';
import { PeriodStatusBanner } from '@/features/journals/components/period-status-banner';
import type { Account } from '@/features/accounts/types';
import { journalFormSchema, journalLineSchema, getJournalDraftTotals } from '@/features/journals/schemas';
import type { JournalFormValues } from '@/features/journals/schemas';

const accountOptions: Account[] = [
  { id: '11111111-1111-1111-1111-111111111111', code: '1000', name: 'Cash', accountType: 'asset', normalBalance: 'debit', isActive: true, isPostable: true, isSystem: false },
  { id: '22222222-2222-2222-2222-222222222222', code: '2000', name: 'Payables', accountType: 'liability', normalBalance: 'credit', isActive: true, isPostable: true, isSystem: false },
];

function LinesEditorHarness() {
  const form = useForm<JournalFormValues>({
    defaultValues: {
      entry_date: '2026-03-19',
      description: 'Test entry',
      reference: '',
      lines: [
        { account_id: '', description: '', debit_amount: '10.00', credit_amount: '0' },
        { account_id: '', description: '', debit_amount: '0', credit_amount: '10.00' },
      ],
    },
  });
  const fieldArray = useFieldArray({ control: form.control, name: 'lines' });

  return (
    <Form {...form}>
      <JournalLinesEditor form={form} fieldArray={fieldArray} accountOptions={accountOptions} />
    </Form>
  );
}

describe('journal schemas and helpers', () => {
  it('validates line amount rules', () => {
    expect(
      journalLineSchema.safeParse({
        account_id: '11111111-1111-1111-1111-111111111111',
        description: '',
        debit_amount: '10.00',
        credit_amount: '0',
      }).success,
    ).toBe(true);

    expect(
      journalLineSchema.safeParse({
        account_id: '11111111-1111-1111-1111-111111111111',
        description: '',
        debit_amount: '10.00',
        credit_amount: '10.00',
      }).success,
    ).toBe(false);
  });

  it('validates top-level journal requirements', () => {
    expect(
      journalFormSchema.safeParse({
        entry_date: '',
        description: '',
        reference: '',
        lines: [{ account_id: '', description: '', debit_amount: '0', credit_amount: '0' }],
      }).success,
    ).toBe(false);
  });

  it('computes balanced totals without floating-point drift', () => {
    expect(
      getJournalDraftTotals([
        { debit_amount: '10.10', credit_amount: '0' },
        { debit_amount: '0', credit_amount: '10.10' },
      ]),
    ).toEqual({ totalDebit: '10.1', totalCredit: '10.1', isBalanced: true });
  });
});

describe('journal UI helpers', () => {
  it('adds and removes journal lines', async () => {
    const user = userEvent.setup();
    render(<LinesEditorHarness />);

    expect(screen.getByText('Line count').nextElementSibling).toHaveTextContent('2');

    await user.click(screen.getByRole('button', { name: /add line/i }));
    expect(screen.getByText('Line count').nextElementSibling).toHaveTextContent('3');

    await user.click(screen.getByRole('button', { name: /remove line 3/i }));
    expect(screen.getByText('Line count').nextElementSibling).toHaveTextContent('2');
  });

  it('renders permission-aware journal actions', () => {
    render(
      <JournalActions
        journal={{ id: 'j1', entryNumber: 'JRN-1', entryDate: '2026-03-19', description: 'Draft', status: 'draft', periodId: 'p1', lines: [] }}
        canUpdate
        canPost={false}
        canReverse
        canVoid
        onPost={vi.fn()}
        onReverse={vi.fn()}
        onVoid={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: /edit draft/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /post journal/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /void draft/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reverse journal/i })).not.toBeInTheDocument();
  });

  it('renders period status banner states', () => {
    render(
      <PeriodStatusBanner
        period={{
          id: 'p1',
          name: 'Mar 2026',
          startDate: '2026-03-01',
          endDate: '2026-03-31',
          status: 'locked',
        }}
      />,
    );

    expect(screen.getByText('Mar 2026')).toBeInTheDocument();
    expect(screen.getByText(/not open/i)).toBeInTheDocument();
    expect(screen.getByText('locked')).toBeInTheDocument();
  });
});
