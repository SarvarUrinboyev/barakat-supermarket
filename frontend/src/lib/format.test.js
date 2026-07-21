import { describe, it, expect } from 'vitest';
import {
  formatDateLocalized,
  formatMoney,
  formatMoneyLocalized,
  formatNumberLocalized,
  formatTimeLocalized,
  localeForLanguage,
  money,
  usd,
} from './format.js';

describe('money', () => {
  it('space-groups thousands and shows cents only when fractional', () => {
    expect(money(899)).toBe('899');
    expect(money(1234.5)).toBe('1 234.50');
    expect(money(262570291)).toBe('262 570 291');
    expect(money(0)).toBe('0');
    expect(money(-1500)).toBe('-1 500');
  });
});

describe('formatMoney — single dispatch point', () => {
  it('UZS: space-grouped, no decimals, so’m label', () => {
    expect(formatMoney(262570291, 'UZS')).toBe("262 570 291 so'm");
    expect(formatMoney(5000, 'UZS')).toBe("5 000 so'm");
    // fractional so'm rounds to whole (som has no minor unit in this UI)
    expect(formatMoney(10.925, 'UZS')).toBe("11 so'm");
  });

  it('USD: dollar sign, decimals only when fractional', () => {
    expect(formatMoney(1350, 'USD')).toBe('$1 350');
    expect(formatMoney(1350.5, 'USD')).toBe('$1 350.50');
    expect(formatMoney(3.66, 'USD')).toBe('$3.66');
  });

  it('defaults to so’m when currency is missing or unknown (R1)', () => {
    expect(formatMoney(5000)).toBe("5 000 so'm");
    expect(formatMoney(5000, null)).toBe("5 000 so'm");
    expect(formatMoney(5000, undefined)).toBe("5 000 so'm");
    expect(formatMoney(5000, 'EUR')).toBe("5 000 so'm");
  });

  it('handles null/zero amounts', () => {
    expect(formatMoney(null, 'UZS')).toBe("0 so'm");
    expect(formatMoney(0, 'USD')).toBe('$0');
  });
});

describe('usd — dollar-only helper', () => {
  it('always prefixes a dollar sign', () => {
    expect(usd(1350)).toBe('$1 350');
  });
});

describe('selected-language formatting', () => {
  it('formats UZS without conversion or a dollar symbol', () => {
    expect(formatMoneyLocalized(1234.5, 'UZS', 'en')).toBe('1,235 UZS');
    expect(formatMoneyLocalized(1234.5, 'UZS', 'en')).not.toContain('$');
    expect(formatMoneyLocalized(1234.5, 'USD', 'en')).toBe('$1,234.5');
  });

  it('uses the documented locales and Asia/Tashkent timezone', () => {
    expect(localeForLanguage('en')).toBe('en-GB');
    expect(formatNumberLocalized(1234.5, 'en')).toBe('1,234.5');
    expect(formatDateLocalized('2026-07-22', 'en')).toBe('22/07/2026');
    expect(formatTimeLocalized('2026-07-22T10:15:00Z', 'en')).toBe('15:15');
  });
});
