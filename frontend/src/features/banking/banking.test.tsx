import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BankSuggestionList } from '@/features/banking/components/bank-suggestion-list';
import { ReconciliationActionPanel } from '@/features/banking/components/reconciliation-action-panel';
import { UnreconcileTransactionDialog } from '@/features/banking/components/unreconcile-transaction-dialog';
import { bankAccountFormSchema, bankImportUploadSchema, bankRuleFormSchema, cashCodeSchema, transferSchema } from '@/features/banking/schemas';

describe('banking form validation', () => {
  it('validates bank account requirements', () => {
    expect(bankAccountFormSchema.safeParse({
      name: '',
      display_name: '',
      bank_name: '',
      account_number_masked: '',
      iban_masked: '',
      currency_code: '',
      account_type: '',
      gl_account_id: '',
      opening_balance: '0',
      opening_balance_date: '',
      is_active: true,
      is_default_receipts_account: false,
      is_default_payments_account: false,
    }).success).toBe(false);
  });

  it('validates import upload requirements', () => {
    expect(bankImportUploadSchema.safeParse({
      bank_account_id: '',
      source: 'csv',
      mapping_json: '',
      file: undefined,
    }).success).toBe(false);
  });

  it('validates cash code requirements', () => {
    expect(cashCodeSchema.safeParse({
      target_account_id: '',
      description: '',
      tax_code_id: '',
      notes: '',
    }).success).toBe(false);
  });

  it('prevents same-account transfers', () => {
    expect(transferSchema.safeParse({
      source_bank_account_id: '11111111-1111-1111-1111-111111111111',
      destination_bank_account_id: '11111111-1111-1111-1111-111111111111',
      notes: '',
    }).success).toBe(false);
  });

  it('validates bank rule requirements', () => {
    expect(bankRuleFormSchema.safeParse({
      name: '',
      is_active: true,
      priority: '',
      applies_to_bank_account_id: '',
      match_payee_contains: '',
      match_description_contains: '',
      match_reference_contains: '',
      match_amount_exact: '',
      match_amount_min: '',
      match_amount_max: '',
      direction: '',
      action_type: '',
      target_account_id: '',
      auto_reconcile: false,
      notes: '',
    }).success).toBe(false);
  });
});

describe('banking UI helpers', () => {
  it('renders suggestions with reasoning', () => {
    render(<BankSuggestionList suggestions={[{ id: '1', type: 'match_journal', label: 'Match journal JRN-001', reason: 'Amounts and date align', score: 95, entityId: 'j1', entityType: 'journal', amount: '100', currencyCode: 'USD' }]} onApply={() => {}} />);
    expect(screen.getByText('Match journal JRN-001')).toBeInTheDocument();
    expect(screen.getByText('Amounts and date align')).toBeInTheDocument();
  });

  it('hides unreconcile when transaction is not reconciled', () => {
    render(
      <ReconciliationActionPanel
        transaction={{ id: 't1', bankAccountId: 'b1', transactionDate: '2026-03-20', amount: '100', description: 'Deposit', status: 'unreconciled', duplicateDetected: false }}
        canReconcile
        canIgnore
        canUnreconcile
        onMatchCustomerPayment={() => {}}
        onMatchSupplierPayment={() => {}}
        onMatchJournal={() => {}}
        onCashCode={() => {}}
        onTransfer={() => {}}
        onIgnore={() => {}}
        onUnreconcile={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /unreconcile/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /match journal/i })).toBeEnabled();
  });

  it('renders unreconcile warning copy', () => {
    render(<UnreconcileTransactionDialog open onOpenChange={() => {}} onConfirm={async () => {}} />);
    expect(screen.getByText(/move this transaction back into the unreconciled queue/i)).toBeInTheDocument();
  });
});
