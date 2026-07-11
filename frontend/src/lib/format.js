// Display formatting helpers.
//
// Currency model (Gate C): so'm (UZS) is the default display currency; a value
// is shown in USD only when its record explicitly carries USD (goods received
// in dollars). `formatMoney(amount, currency)` is the SINGLE dispatch point —
// price-render sites pass the value plus its currency and never hardcode a
// symbol. `usd()` is retained only for the few genuinely dollar-only spots.

/** 1234.5 -> "1 234.50", 899 -> "899" (space-grouped, cents shown only if present). */
export function money(value) {
  const n = Number(value || 0);
  const negative = n < 0;
  const totalCents = Math.round(Math.abs(n) * 100);
  const whole = Math.floor(totalCents / 100);
  const cents = totalCents % 100;
  let text = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (cents > 0) {
    text += '.' + String(cents).padStart(2, '0');
  }
  return (negative ? '-' : '') + text;
}

/** 1234.5 -> "$1 234.50" (explicitly-dollar spots only; prefer formatMoney). */
export function usd(value) {
  return '$' + money(value);
}

/**
 * Currency-aware money — the app's single money formatter.
 *  • USD  -> "$1 350"      (2 decimals only when fractional, via money())
 *  • UZS  -> "262 570 291 so'm" (space-grouped, no decimals)
 * Default when currency is null/undefined/unknown is UZS (so'm) — R1: so'm is
 * the default everywhere; USD must be an explicit currency on the record.
 */
export function formatMoney(amount, currency) {
  if (currency === 'USD') {
    return '$' + money(amount);
  }
  return money(Math.round(Number(amount || 0))) + " so'm";
}

/** Converts an amount between USD and UZS using the USD->UZS rate. */
export function convertMoney(amount, from, to, rate) {
  const n = Number(amount || 0);
  if (from === to || !rate) {
    return n;
  }
  if (from === 'USD' && to === 'UZS') {
    return n * rate;
  }
  if (from === 'UZS' && to === 'USD') {
    return n / rate;
  }
  return n;
}

/** Short currency label for a code: USD -> "USD", UZS -> "so'm". */
export function currencyLabel(currency) {
  return currency === 'UZS' ? "so'm" : 'USD';
}

/** "2026-05-21" -> "21.05.2026" */
export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

/** "2026-05-21T16:43:59" -> "21.05.2026 16:43" */
export function formatDateTime(iso) {
  if (!iso) return '';
  const datePart = formatDate(iso);
  const timePart = iso.slice(11, 16);
  return timePart ? `${datePart} ${timePart}` : datePart;
}

/** "2026-05-21T16:43:59" -> "16:43" */
export function formatTime(iso) {
  return iso ? iso.slice(11, 16) : '';
}

/** Today's date as an ISO string "YYYY-MM-DD" (local time). */
export function todayIso() {
  const now = new Date();
  const off = now.getTimezoneOffset();
  return new Date(now.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** ISO date N days from today (negative for past). */
export function shiftIso(days) {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const off = now.getTimezoneOffset();
  return new Date(now.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Minutes -> "N soat M daqiqa". */
export function formatDuration(minutes) {
  if (minutes == null) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} daqiqa`;
  return `${h} soat ${m} daqiqa`;
}

export const PAYMENT_LABELS = {
  NAQD: 'Naqd',
  KASSA: 'Kassa',
  KARTA: 'Karta',
  ARALASH: 'Aralash',
  QARZGA: 'Qarzga',
};
