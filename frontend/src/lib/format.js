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

export const LOCALE_BY_LANGUAGE = Object.freeze({
  uz: 'uz-UZ',
  uzc: 'uz-Cyrl-UZ',
  ru: 'ru-RU',
  en: 'en-GB',
});

export function localeForLanguage(language) {
  return LOCALE_BY_LANGUAGE[language] || LOCALE_BY_LANGUAGE.uz;
}

/** Locale-aware number formatting for application UI. */
export function formatNumberLocalized(value, language = 'uz', options = {}) {
  const number = Number(value || 0);
  return new Intl.NumberFormat(localeForLanguage(language), options).format(
    Number.isFinite(number) ? number : 0,
  );
}

/**
 * Locale-aware money formatting without currency conversion. UZS is labelled
 * explicitly in English/Russian and as so'm in Uzbek UI; USD remains explicit.
 */
export function formatMoneyLocalized(amount, currency = 'UZS', language = 'uz') {
  const code = currency === 'USD' ? 'USD' : 'UZS';
  const number = Number(amount || 0);
  const formatted = formatNumberLocalized(Number.isFinite(number) ? number : 0, language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: code === 'UZS' ? 0 : 2,
  });
  if (code === 'USD') return `$${formatted}`;
  return language === 'uz' || language === 'uzc'
    ? `${formatted} so'm`
    : `${formatted} UZS`;
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

/** Formats an ISO date in the selected UI locale and Asia/Tashkent timezone. */
export function formatDateLocalized(iso, language = 'uz') {
  if (!iso) return '';
  const dateOnly = String(iso).slice(0, 10);
  const date = new Date(`${dateOnly}T12:00:00+05:00`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Tashkent',
  }).format(date);
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

/** Formats an ISO instant/time in the selected locale and business timezone. */
export function formatTimeLocalized(iso, language = 'uz') {
  if (!iso) return '';
  const text = String(iso);
  const localDateTime = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)(?:\.(\d+))?$/.exec(text);
  const normalized = localDateTime
    ? `${localDateTime[1]}${localDateTime[2] ? `.${localDateTime[2].slice(0, 3).padEnd(3, '0')}` : ''}+05:00`
    : text;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  }).format(date);
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
  P2P: 'P2P',
  TRANSFER: "Bank o'tkazmasi",
};
