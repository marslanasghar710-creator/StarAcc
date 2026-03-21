import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BalanceSheetStatement } from '@/features/reporting/components/balance-sheet-statement';
import { GeneralLedgerTable } from '@/features/reporting/components/general-ledger-table';
import { ProfitLossStatement } from '@/features/reporting/components/profit-loss-statement';
import { ReportEmptyState } from '@/features/reporting/components/report-empty-state';
import { ReportErrorState } from '@/features/reporting/components/report-error-state';
import { ReportExportActions } from '@/features/reporting/components/report-export-actions';
import { ReportsNav } from '@/features/reporting/components/reports-nav';
import { StatementComparisonToggle } from '@/features/reporting/components/statement-comparison-toggle';
import { TrialBalanceTable } from '@/features/reporting/components/trial-balance-table';
import { balanceSheetFilterSchema, generalLedgerFilterSchema, profitLossFilterSchema, trialBalanceFilterSchema } from '@/features/reporting/schemas';

describe('reporting filter validation', () => {
  it('requires an as-of date for trial balance', () => {
    expect(trialBalanceFilterSchema.safeParse({ as_of_date: '', period_id: '', account_type: '', search: '', include_zero_balances: false }).success).toBe(false);
  });

  it('rejects profit and loss date ranges when end precedes start', () => {
    expect(profitLossFilterSchema.safeParse({ from_date: '2026-03-31', to_date: '2026-03-01', period_id: '', comparison_mode: 'none', basis: 'accrual' }).success).toBe(false);
  });

  it('requires an account id for general ledger', () => {
    expect(generalLedgerFilterSchema.safeParse({ account_id: '', from_date: '', to_date: '', journal_reference: '', source_module: '', status: '', cursor: '' }).success).toBe(false);
  });

  it('requires an as-of date for balance sheet', () => {
    expect(balanceSheetFilterSchema.safeParse({ as_of_date: '', period_id: '', comparison_mode: 'none' }).success).toBe(false);
  });
});

describe('reporting UI helpers', () => {
  const navReports = [
    { id: 'trial-balance', slug: 'trial-balance', name: 'Trial Balance', description: 'TB', href: '/reports/trial-balance', isAvailable: true, allowedFormats: ['csv', 'pdf'], requiredPermissions: ['trial_balance.read'], recommended: true, isPermitted: true },
    { id: 'general-ledger', slug: 'general-ledger', name: 'General Ledger', description: 'GL', href: '/reports/general-ledger', isAvailable: true, allowedFormats: ['csv'], requiredPermissions: ['general_ledger.read'], recommended: false, isPermitted: false },
  ] as const;

  it('renders permission-aware report navigation entries', () => {
    render(<ReportsNav reports={navReports as never} />);
    expect(screen.getByText('Trial Balance')).toBeInTheDocument();
    expect(screen.getByText(/restricted for your role/i)).toBeInTheDocument();
  });

  it('renders the trial balance totals row', () => {
    render(
      <TrialBalanceTable
        report={{
          title: 'Trial Balance',
          currencyCode: 'USD',
          asOfDate: '2026-03-21',
          periodLabel: 'Mar 2026',
          rows: [{ id: '1', accountId: 'a1', accountCode: '100', accountName: 'Cash', accountType: 'asset', groupName: 'Assets', depth: 0, debit: '100', credit: null, isGroup: false, isTotal: false }],
          totals: { debit: '100', credit: '100', isBalanced: true, difference: '0' },
          availableAccountTypes: [],
          supportsZeroBalanceToggle: true,
        }}
      />,
    );

    expect(screen.getByText('Totals')).toBeInTheDocument();
    expect(screen.getByText('Balanced')).toBeInTheDocument();
  });

  it('renders profit and loss grouped sections', () => {
    render(
      <ProfitLossStatement
        report={{
          title: 'Profit & Loss',
          currencyCode: 'USD',
          fromDate: '2026-03-01',
          toDate: '2026-03-31',
          basis: 'accrual',
          comparisonMode: 'previous_period',
          comparisonLabel: 'Previous period',
          sections: [{ id: 'revenue', title: 'Revenue', rows: [{ id: 'r1', label: 'Sales', code: '400', depth: 0, isTotal: false, isEmphasized: false, values: { amount: '1000', comparisonAmount: '900', variance: '100', variancePercent: '11.1' } }], totals: [] }],
          netProfit: { primary: '1000', comparison: '900', variance: '100', variancePercent: '11.1', isBalanced: null },
        }}
      />,
    );

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Net profit')).toBeInTheDocument();
  });

  it('renders balance sheet sections', () => {
    render(
      <BalanceSheetStatement
        report={{
          title: 'Balance Sheet',
          currencyCode: 'USD',
          asOfDate: '2026-03-31',
          comparisonMode: 'none',
          comparisonLabel: null,
          sections: [{ id: 'assets', title: 'Assets', rows: [{ id: 'a1', label: 'Cash', code: '100', depth: 0, isTotal: false, isEmphasized: false, values: { amount: '1200', comparisonAmount: null, variance: null, variancePercent: null } }], totals: [] }],
          totals: { assets: { primary: '1200', comparison: null, variance: null, variancePercent: null, isBalanced: true }, liabilitiesAndEquity: { primary: '1200', comparison: null, variance: null, variancePercent: null, isBalanced: true } },
        }}
      />,
    );

    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Total liabilities & equity')).toBeInTheDocument();
  });

  it('shows helpful general ledger account context', () => {
    render(
      <GeneralLedgerTable
        report={{
          title: 'General Ledger',
          currencyCode: 'USD',
          accountId: 'a1',
          accountName: 'Cash',
          fromDate: '2026-03-01',
          toDate: '2026-03-31',
          openingBalance: '50',
          closingBalance: '75',
          lines: [{ id: 'l1', transactionDate: '2026-03-10', postingDate: '2026-03-11', journalReference: 'JRN-1', sourceLabel: 'journal', description: 'Receipt', debit: '25', credit: null, runningBalance: '75' }],
          pagination: { nextCursor: null, hasMore: false },
          sourceOptions: [],
        }}
      />,
    );

    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Opening balance')).toBeInTheDocument();
  });

  it('hides export actions when permission is missing', () => {
    const { rerender } = render(<ReportExportActions canExport={false} onExport={() => {}} />);
    expect(screen.queryByText(/export csv/i)).not.toBeInTheDocument();

    rerender(<ReportExportActions canExport onExport={() => {}} />);
    expect(screen.getByText(/export csv/i)).toBeInTheDocument();
    expect(screen.getByText(/export pdf/i)).toBeInTheDocument();
  });

  it('shows comparison enabled state', () => {
    render(<StatementComparisonToggle value="previous_period" options={['none', 'previous_period']} onChange={() => {}} />);
    expect(screen.getByText(/comparison enabled/i)).toBeInTheDocument();
  });

  it('renders report empty and error states', () => {
    render(
      <>
        <ReportEmptyState title="No data" description="Nothing returned" />
        <ReportErrorState title="Failed" description="Backend rejected request" />
      </>,
    );

    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
