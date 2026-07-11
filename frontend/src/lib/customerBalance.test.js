import { describe, it, expect } from 'vitest';
import { customerOwes, balanceDisplay, customerDebtRows } from './customerBalance.js';

describe('customerOwes', () => {
  it('true when either bucket is positive', () => {
    expect(customerOwes({ balanceUzs: 5000, balanceUsd: 0 })).toBe(true);
    expect(customerOwes({ balanceUzs: 0, balanceUsd: 50 })).toBe(true);   // USD-only debtor
    expect(customerOwes({ balanceUzs: 0, balanceUsd: 0 })).toBe(false);
    expect(customerOwes({ balanceUzs: -5000, balanceUsd: 0 })).toBe(false); // credit, not debt
  });
});

describe('balanceDisplay', () => {
  it('shows each non-zero bucket, so’m first', () => {
    expect(balanceDisplay(500000, 200)).toBe("500 000 so'm + $200");
    expect(balanceDisplay(500000, 0)).toBe("500 000 so'm");
    expect(balanceDisplay(0, 200)).toBe('$200');
    expect(balanceDisplay(0, 0)).toBe("0 so'm");
    expect(balanceDisplay(-63500, 0)).toBe("63 500 so'm"); // magnitude
  });
});

describe('customerDebtRows — USD debtors must not vanish', () => {
  const customers = [
    { id: 1, name: 'Som only', balanceUzs: 63500, balanceUsd: 0 },
    { id: 2, name: 'USD only', balanceUzs: 0, balanceUsd: 50 },
    { id: 3, name: 'Both', balanceUzs: 100000, balanceUsd: 20 },
    { id: 4, name: 'Paid up', balanceUzs: 0, balanceUsd: 0 },
    { id: 5, name: 'In credit', balanceUzs: -10000, balanceUsd: 0 },
  ];

  it('includes the USD-only debtor and excludes non-debtors', () => {
    const rows = customerDebtRows(customers);
    const names = rows.map((r) => r.customerName);
    expect(names).toContain('USD only');   // the regression guard
    expect(names).not.toContain('Paid up');
    expect(names).not.toContain('In credit');
    expect(rows).toHaveLength(3);
  });

  it('renders each debtor as a split and sorts so’m-desc then USD-desc', () => {
    const rows = customerDebtRows(customers);
    expect(rows.map((r) => r.customerName)).toEqual(['Both', 'Som only', 'USD only']);
    expect(rows.find((r) => r.customerName === 'Both').remainingDisplay)
      .toBe("100 000 so'm + $20");
    expect(rows.find((r) => r.customerName === 'USD only').remainingDisplay).toBe('$50');
  });
});
