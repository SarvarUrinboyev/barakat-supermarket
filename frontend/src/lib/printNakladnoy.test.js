import { describe, it, expect } from 'vitest';
import { buildNakladnoyText } from './printNakladnoy.js';

const customer = { name: 'Aziz', phone: '901234567', address: 'Tashkent' };

describe('nakladnoy totals — per-currency, never merged (AM-11)', () => {
  it('a mixed-currency note splits JAMI and debt, never one assumed currency', () => {
    const text = buildNakladnoyText({
      customer,
      date: '2026-07-11',
      items: [
        { description: 'Non', amount: 5000, currency: 'UZS' },
        { description: 'Smartfon', amount: 1350, currency: 'USD' },
      ],
      paid: 0, // all on credit
    });
    // JAMI shows both buckets.
    expect(text).toMatch(/JAMI:\s+5 000 so'm \+ \$1 350/);
    // On credit, the debt is the same split — not a single number.
    expect(text).toContain("Qoldiq qarz:  −5 000 so'm + $1 350");
    // Each line renders in its own currency.
    expect(text).toContain("Non");
    expect(text).toMatch(/Smartfon[\s\S]*\$1 350/);
  });

  it('a single-currency so’m note stays a single so’m figure', () => {
    const text = buildNakladnoyText({
      customer,
      date: '2026-07-11',
      items: [{ description: 'Non', amount: 5000, currency: 'UZS' }],
      paid: 5000,
    });
    expect(text).toMatch(/JAMI:\s+5 000 so'm/);
    expect(text).not.toContain('$');       // no dollar leak on a pure-so'm note
    expect(text).toContain("*** TO'LANDI ***");
  });

  it('a single-currency USD note renders in dollars', () => {
    const text = buildNakladnoyText({
      customer,
      date: '2026-07-11',
      items: [{ description: 'Smartfon', amount: 1350, currency: 'USD' }],
      paid: 0,
    });
    expect(text).toMatch(/JAMI:\s+\$1 350/);
    expect(text).toContain("Qoldiq qarz:  −$1 350");
  });
});
