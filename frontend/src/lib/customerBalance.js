// Pure per-currency customer-balance helpers (Gate C Q3). No React — unit-tested
// directly. A customer's debt lives in independent currency buckets that are
// never merged; a USD-only debtor must stay visible even when balanceUzs is 0.

import { formatMoney } from './format.js';

const EPS = 0.009;

/** True when the customer owes anything in ANY currency bucket. */
export function customerOwes(c) {
  return Number(c.balanceUzs || 0) > EPS || Number(c.balanceUsd || 0) > EPS;
}

/** Renders every non-zero bucket of a signed balance, e.g. "500 000 so'm + $200". */
export function balanceDisplay(balanceUzs, balanceUsd) {
  const u = Number(balanceUzs || 0);
  const d = Number(balanceUsd || 0);
  const parts = [];
  if (Math.abs(u) > EPS) parts.push(formatMoney(Math.abs(u), 'UZS'));
  if (Math.abs(d) > EPS) parts.push(formatMoney(Math.abs(d), 'USD'));
  return parts.length ? parts.join(' + ') : formatMoney(0, 'UZS');
}

/**
 * Debtor rows synthesised from customers that owe us, in ANY currency bucket.
 * Each row carries both buckets + a split display; sorted so'm-desc then USD-desc
 * (no kurs — the two currencies are ranked independently, so'm first). A USD-only
 * debtor (balanceUzs 0, balanceUsd > 0) is included, not dropped.
 */
export function customerDebtRows(customers) {
  return (customers || [])
    .filter(customerOwes)
    .map((c) => {
      const balanceUzs = Number(c.balanceUzs || 0);
      const balanceUsd = Number(c.balanceUsd || 0);
      return {
        id: `cust-${c.id}`,
        customerId: c.id,
        source: 'CUSTOMER',
        customerName: c.name,
        productName: c.phone || null,
        note: c.address || null,
        balanceUzs,
        balanceUsd,
        remainingDisplay: balanceDisplay(balanceUzs, balanceUsd),
      };
    })
    .sort((a, b) => (b.balanceUzs - a.balanceUzs) || (b.balanceUsd - a.balanceUsd));
}
