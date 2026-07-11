/**
 * Builds a customer-facing "nakladnoy" (delivery note) as a plain-text
 * receipt. Use {@link buildNakladnoyText} to get just the text for an
 * on-screen preview, or {@link printNakladnoy} to render it into a hidden
 * iframe and trigger the browser print dialog. Goods sold for cash are
 * listed normally; goods on credit show a minus sign on the line total
 * so the customer can see at a glance which items they owe for.
 */
import { formatDate, formatTime, formatMoney } from './format.js';

/** @typedef {{ description?: string, amount: number, type?: string }} Goods */

/**
 * Builds the receipt text only — no printing. Use this to render the chek
 * inside an on-screen preview before sending it to a printer.
 */
export function buildNakladnoyText({ customer, date, items, paid = 0, note }) {
  // Totals are summed PER CURRENCY and never merged (Gate C AM-11) — a printed
  // note mixing so'm goods with a USD phone must read "X so'm + $Y", never a
  // single number under an assumed currency.
  const totalBy = sumByCurrency(items);
  // `paid` is a single figure. Allocate it so'm-first then USD (a defined
  // convention for the rare mixed-currency + partial-payment note; for the
  // common all-credit note paid is 0, so both buckets stay untouched).
  const paidUzs = Math.min(paid, totalBy.UZS);
  const paidBy = { UZS: paidUzs, USD: Math.min(paid - paidUzs, totalBy.USD) };
  const debtBy = { UZS: totalBy.UZS - paidBy.UZS, USD: totalBy.USD - paidBy.USD };
  const isCredit = debtBy.UZS > 0.009 || debtBy.USD > 0.009;

  const lines = items.map((it) => {
    const name = it.description || it.note || '—';
    const amt = Number(it.amount || 0);
    const sign = isCredit ? '−' : '';   // credit items show minus
    return `${pad(name, 28)} ${sign}${formatMoney(amt, it.currency)}`;
  }).join('\n');

  const stamp = isCredit
    ? `\n*** QARZGA OLINGAN ***\n` +
      `To'langan:    ${splitMoney(paidBy)}\n` +
      `Qoldiq qarz:  −${splitMoney(debtBy)}\n`
    : `\n*** TO'LANDI ***\n` +
      `To'langan:    ${splitMoney(paid > 0 ? paidBy : totalBy)}\n`;

  return (
`===============================
       SAVDOPRO · NAKLADNOY
===============================
Sana:    ${formatDate(date)}  ${formatTime(new Date().toISOString())}
Mijoz:   ${customer.name}
Tel:     ${customer.phone || '—'}
Manzil:  ${customer.address || '—'}
===============================
TOVARLAR:

${lines}

-------------------------------
JAMI:                ${splitMoney(totalBy)}
${stamp}===============================
${note ? `Izoh: ${note}\n===============================\n` : ''}Imzo: __________________

Rahmat! SavdoPRO.
`);
}

/** Prints already-built receipt text via the hidden iframe. */
export function printNakladnoyText(text) {
  openPrintWindow(text);
}

/**
 * Convenience: build the text and print straight away (legacy callers).
 * @param {object} args — same shape as buildNakladnoyText
 */
export function printNakladnoy(args) {
  openPrintWindow(buildNakladnoyText(args));
}

/**
 * Render the receipt text into a hidden same-document iframe and print it.
 * Using an iframe (instead of window.open) is required for Electron: the
 * desktop shell otherwise treats the blank URL as an external link and
 * Windows pops the "You'll need a new app to open this about link" dialog.
 */
function openPrintWindow(text) {
  // Reuse a single hidden iframe so repeated prints don't litter the DOM.
  let iframe = document.getElementById('savdopro-print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'savdopro-print-frame';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);
  }
  const html = `<!doctype html>
<html><head><title>Nakladnoy</title>
<style>
  @page { size: 80mm auto; margin: 3mm 2mm; }
  body { font-family: 'Consolas','Courier New',monospace; font-size: 12px;
         line-height: 1.45; color:#000; background:#fff; margin: 0; padding: 6mm 4mm; }
  pre { margin: 0; white-space: pre-wrap; word-wrap: break-word; }
</style>
</head><body><pre>${escapeHtml(text)}</pre></body></html>`;
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  // Give the iframe a tick to lay out, then call print on its window.
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      // Some webviews disallow programmatic print; fall back to opening a
      // data: URL in a new tab (won't trigger Windows file association).
      const data = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      const w = window.open(data, '_blank');
      if (w) {
        setTimeout(() => { try { w.print(); } catch (_) { /* noop */ } }, 250);
      }
    }
  }, 80);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Sums nakladnoy items into { UZS, USD } buckets by each item's currency. */
function sumByCurrency(items) {
  return (items || []).reduce((a, it) => {
    if (it.currency === 'USD') a.USD += Number(it.amount || 0);
    else a.UZS += Number(it.amount || 0);
    return a;
  }, { UZS: 0, USD: 0 });
}

/** Renders a per-currency bucket as "X so'm + $Y" (only non-zero buckets). */
function splitMoney(by) {
  const parts = [];
  if (Math.abs(by.UZS) > 0.009) parts.push(formatMoney(by.UZS, 'UZS'));
  if (Math.abs(by.USD) > 0.009) parts.push(formatMoney(by.USD, 'USD'));
  return parts.length ? parts.join(' + ') : formatMoney(0, 'UZS');
}

function pad(text, len) {
  let s = String(text || '');
  if (s.length > len) {
    s = s.slice(0, len - 1) + '…';
  }
  while (s.length < len) {
    s += ' ';
  }
  return s;
}
