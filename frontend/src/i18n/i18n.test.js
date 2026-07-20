import { describe, expect, it } from 'vitest';
import { LANGUAGES, toCyrillic, translate } from './i18n.js';

describe('global application languages', () => {
  it('exposes Uzbek Latin, Uzbek Cyrillic, Russian, and English in order', () => {
    expect(LANGUAGES).toEqual([
      { code: 'uz', label: 'O‘zbekcha', short: 'UZ' },
      { code: 'uzc', label: 'Ўзбекча', short: 'ЎЗ' },
      { code: 'ru', label: 'Русский', short: 'RU' },
      { code: 'en', label: 'English', short: 'EN' },
    ]);
  });

  it('translates every Uzbek shell string that can surround SavdoGraph into English', () => {
    const shell = {
      Platforma: 'Platform',
      Til: 'Language',
      Menyu: 'Menu',
      "Menyuni kengaytirish": 'Expand navigation',
      "Menyuni yig'ish": 'Collapse navigation',
      Kengaytirish: 'Expand',
      "Yig'ish": 'Collapse',
      "Yorug' mavzu": 'Light theme',
      "Qorong'i mavzu": 'Dark theme',
      Avtomatlashtirish: 'Automation',
      Boshqaruv: 'Dashboard',
      'Sotuvlar tarixi': 'Sales history',
      Moliya: 'Finance',
      "To'lov": 'Payments',
      Ombor: 'Inventory',
      Mijozlar: 'Customers',
      'Yetkazib beruvchilar': 'Suppliers',
      'Kassa (POS)': 'Point of Sale (POS)',
      Aksiyalar: 'Promotions',
      "Do'kon xarajatlari": 'Store expenses',
      Buyurtmalar: 'Orders',
      Qarz: 'Debt',
      Kalkulyator: 'Calculator',
      Hisobotlar: 'Reports',
      "Do'konlar": 'Stores',
      "Tarif va to'lov": 'Plan and billing',
      Buxgalteriya: 'Accounting',
      Integratsiyalar: 'Integrations',
      'IMEI baza': 'IMEI registry',
      "Bog'lanish": 'Help',
      'Super-admin': 'Super admin',
      Operator: 'Operator',
      Chiqish: 'Sign out',
      Yopish: 'Close',
      "Faol do'kon": 'Active store',
      "Hamma do'konlar": 'All stores',
      "Do'kon tanlanmagan": 'No store selected',
      ASOSIY: 'PRIMARY',
      "Do'konni tanlang": 'Select a store',
      'Jami balans va sotuvlarni jamlaydi': 'Combines balances and sales',
      "Hamma do'konlar rejimi faol": 'All-stores mode is active',
      'Bu yerda barcha': 'Data from all',
      "ta do'konning ma'lumotlari jamlangan. Yangi mahsulot/mijoz/to'lov qo'shish uchun aniq do'konni tanlang.": 'stores is consolidated here. Select one store before creating a product, customer, or payment.',
      'Obuna muddati tugagan': 'Subscription expired',
      "Tizim faqat o'qish rejimida — yangi sotuv, mahsulot yoki to'lov qo'shib bo'lmaydi.": 'The system is read-only; new sales, products, and payments cannot be created.',
      'Tarifni yangilash': 'Renew plan',
      'Obuna muddati tugashiga': 'Subscription expires in',
      'kun qoldi': 'days',
      "To'lov muddati": 'Due date',
      "To'lamasangiz akkaunt o'qish rejimiga o'tadi.": 'Without renewal, the account becomes read-only.',
      Yangilash: 'Renew',
    };

    for (const [source, expected] of Object.entries(shell)) {
      expect(translate('en', source), source).toBe(expected);
      if (source !== expected) {
        expect(translate('en', source), source).not.toBe(source);
      }
    }
  });

  it('keeps technical acronyms intact across shell translations and Uzbek Cyrillic', () => {
    expect(toCyrillic('AI API POS COGS DRAFT ID UZS')).toBe('AI API POS COGS DRAFT ID UZS');
    expect(toCyrillic('Ko‘rib, do‘kon, g‘oya')).toBe('Кўриб, дўкон, ғоя');
    expect(translate('en', 'AI CFO')).toBe('AI CFO');
    expect(translate('en', 'Kassa (POS)')).toContain('POS');
    expect(translate('en', 'IMEI baza')).toContain('IMEI');
    expect(translate('en', 'API COGS DRAFT ID')).toBe('API COGS DRAFT ID');
  });

  it('does not speculate about untranslated user data', () => {
    expect(translate('en', 'Barakat Demo — Markaziy')).toBe('Barakat Demo — Markaziy');
  });
});