import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EN, translate } from './i18n.js';

const source = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');

const SCOPED_FILES = [
  '../pages/Shops.jsx',
  '../pages/Dashboard.jsx',
  '../components/AnomalyBanner.jsx',
  '../components/AnomalyHistory.jsx',
  '../components/CashboxForecastCard.jsx',
  '../components/OnboardingChecklist.jsx',
  '../components/LiveSalesFeed.jsx',
  '../components/Layout.jsx',
  '../components/Sidebar.jsx',
  '../components/ShopSwitcher.jsx',
  '../components/SubscriptionBanner.jsx',
  '../components/QuickSearch.jsx',
  '../components/AiChatWidget.jsx',
  '../components/Modal.jsx',
  '../components/ui.jsx',
  '../lib/localizedError.js',
  '../lib/anomaly.js',
];

const DYNAMIC_KEYS = [
  'Kassa va chek sozlamalari',
  'Kassa va printer sozlamalari',
  "Birinchi mahsulotni qo'shing",
  'Omborga tovar kiriting — sotuv shu yerdan boshlanadi.',
  'Birinchi sotuvni rasmiylashtiring',
  "Kassada (POS) sinov sotuvini o'tkazib ko'ring.",
  "Mijozlaringizni qo'shing",
  'Doimiy mijozlar va qarz daftarini yuriting.',
  'Bugun foyda nega kamaydi?',
  'Qaysi tovar narxini oshiray?',
  'Kim qarzni kechiktiryapti?',
  'Tovar transferi',
  'Audit log',
  'P2P',
  "Bank o'tkazmasi",
  'Salom! Men AI CFO yordamchingizman. "Bugun foyda nega kamaydi?" yoki "Kim qarzni kechiktiryapti?" deb so\'rang.',
  'Qaytarish darajasi odatdagidan yuqori. Tafsilotlarni tekshiring.',
  'Tungi vaqtda savdo faolligi aniqlandi.',
  'Tungi vaqtda noodatiy savdo faolligi aniqlandi.',
  'Mahsulot savdosida noodatiy o‘sish aniqlandi.',
  'Kassa qoldig‘i manfiy. Balans va operatsiyalarni tekshiring.',
  'Tannarxdan past sotuvlar aniqlandi.',
  'Odatdagidan katta qaytarish aniqlandi.',
  'Kassir operatsiyalarida noodatiy holat aniqlandi.',
  'Noodatiy faoliyat aniqlandi. Tafsilotlarni tekshiring.',
];

const APPROVED_ENGLISH_SOURCE = new Set(['Operator', 'Audit log', 'P2P']);

function staticTranslationKeys(text) {
  const keys = [];
  const pattern = /\bt\(\s*(['"])((?:\\.|(?!\1)[^\\\r\n])*)\1\s*\)/g;
  let match;
  while ((match = pattern.exec(text))) {
    keys.push(Function(`return ${match[1]}${match[2]}${match[1]}`)());
  }
  return keys;
}

describe('submission-route English catalog', () => {
  it('covers every statically discoverable key in the scoped route tree', () => {
    const keys = new Set(SCOPED_FILES.flatMap((file) => staticTranslationKeys(source(file))));
    expect(keys.size).toBeGreaterThanOrEqual(180);
    expect([...keys].filter((key) => EN[key] === undefined)).toEqual([]);
    expect([...keys].filter((key) => translate('en', key) === key
      && !APPROVED_ENGLISH_SOURCE.has(key)
      && !/^[A-Z0-9 .:/-]+$/.test(key)))
      .toEqual([]);
  });

  it('covers dynamic keys used by route data structures and code mappings', () => {
    expect(DYNAMIC_KEYS.filter((key) => EN[key] === undefined)).toEqual([]);
    for (const key of DYNAMIC_KEYS) {
      if (!APPROVED_ENGLISH_SOURCE.has(key)) expect(translate('en', key), key).not.toBe(key);
    }
  });

  it('uses the requested natural Stores terminology', () => {
    expect(translate('en', "Do'konlar")).toBe('Stores');
    expect(translate('en', "Akkauntingizdagi do'konlarni boshqarish"))
      .toBe('Manage stores in your account');
    expect(translate('en', "Yangi do'kon")).toBe('Add store');
    expect(translate('en', 'Asosiy qil')).toBe('Set as primary');
    expect(translate('en', "Do'konni tahrirlash")).toBe('Edit store');
    expect(translate('en', "Do'konni o'chirish")).toBe('Delete store');
  });
});

describe('Shops submission gate', () => {
  it('localizes placeholders, API failures, tooltips, and accessible action names', () => {
    const shops = source('../pages/Shops.jsx');
    expect(shops).not.toContain('placeholder="Chilonzor filiali"');
    expect(shops).not.toContain('@savdo_pro · qaytarish 14 kun ichida');
    expect(shops).not.toMatch(/\b(?:err|error)\.message\b/);
    expect(shops).toContain('placeholder={t("Do\'kon nomini kiriting")}');
    expect(shops).toContain("placeholder={t('Xaridingiz uchun rahmat!')}");
    expect(shops).toContain('aria-label={`${t("Do\'konni tahrirlash")}: ${s.name}`}');
  });
});

describe('Dashboard submission gate', () => {
  it('uses UZS-aware selected-language formatting and no dollar-only helper', () => {
    const dashboard = source('../pages/Dashboard.jsx');
    const forecast = source('../components/CashboxForecastCard.jsx');
    const liveSales = source('../components/LiveSalesFeed.jsx');
    expect(dashboard).not.toMatch(/\busd\s*\(/);
    expect(dashboard).not.toContain('Ertalabgi balans (USD)');
    expect(dashboard).not.toMatch(/>\$0</);
    expect(dashboard.match(/formatMoneyLocalized\([^\n]+, 'UZS', lang\)/g)?.length)
      .toBeGreaterThanOrEqual(8);
    expect(forecast).not.toContain("} so'm");
    expect(liveSales).not.toContain("} so'm");
  });
});

describe('ProofTwin submission gate', () => {
  it('keeps the redesign and derives workspace and Ask language from the global selector', () => {
    const page = source('../pages/SavdoGraph.jsx');
    const layout = source('../components/Layout.jsx');
    const sidebar = source('../components/Sidebar.jsx');
    const experience = source('../features/savdograph/experience.jsx');
    const model = source('../features/savdograph/model.js');
    expect(page).toContain('const { lang } = useSettings()');
    expect(page).toContain('savdoGraphLocaleFromLanguage(lang)');
    expect(page).toContain('askLocaleFromLanguage(lang)');
    expect(page).not.toMatch(/useState\([^)]*(?:UZ|RU|EN)[^)]*\).*locale/i);
    expect(layout).toContain("app-shell-savdograph");
    expect(layout).toContain("content-savdograph");
    expect(layout).toContain('`${PROOFTWIN_BRAND} · SavdoPRO`');
    expect([page, layout, sidebar, experience].join('\n')).not.toContain(['Savdo', 'Graph AI'].join(''));
    expect(model).toContain("export const PROOFTWIN_BRAND = 'ProofTwin AI'");
    expect(model).toContain("export const PROOFTWIN_SCENARIO_ENGINE = 'ProofTwin Scenario Engine'");
  });
});

describe('global selector behavior', () => {
  it('persists one language source and updates the document language', () => {
    const settings = source('../context/Settings.jsx');
    expect(settings).toContain("const LANG_KEY = 'barakat.lang'");
    expect(settings).toContain('localStorage.setItem(LANG_KEY, lang)');
    expect(settings).toContain('document.documentElement.lang');
    expect(settings).toContain("uzc: 'uz-Cyrl'");
  });
});
