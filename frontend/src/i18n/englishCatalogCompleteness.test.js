import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { EN, MISSING_EN_TRANSLATION, translate } from './i18n.js';

const SOURCE_ROOT = new URL('../', import.meta.url);

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(?:js|jsx)$/.test(entry.name) && !/\.test\.(?:js|jsx)$/.test(entry.name)
      ? [full]
      : [];
  });
}

function staticTranslationKeys(text) {
  const keys = [];
  const pattern = /\bt\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g;
  let match;
  while ((match = pattern.exec(text))) {
    if (match[1] === '`' && match[2].includes('${')) continue;
    keys.push(Function(`return ${match[1]}${match[2]}${match[1]}`)());
  }
  return keys;
}

const files = sourceFiles(fileURLToPath(SOURCE_ROOT))
  .filter((file) => !file.includes(`${path.sep}i18n${path.sep}`))
  // ProofTwin has its own locale-key model; its language coverage is guarded
  // by submissionLocalization.test.js and is intentionally not an Uzbek-key catalog.
  .filter((file) => !file.endsWith(`${path.sep}SavdoGraph.jsx`));

const keys = new Set(files.flatMap((file) => staticTranslationKeys(readFileSync(file, 'utf8'))));
const authenticatedUiFiles = files.filter((file) => {
  const normalized = file.split(path.sep).join('/');
  if (normalized.includes('/pages/')) {
    return !/\/(?:Login|Register|ForgotPassword|XCallback)\.jsx$/.test(normalized);
  }
  return normalized.includes('/components/');
});

describe('complete English UI catalog', () => {
  it('covers every statically discoverable global translation key', () => {
    expect(keys.size).toBeGreaterThanOrEqual(1300);
    expect([...keys].filter((key) => !Object.hasOwn(EN, key))).toEqual([]);
    expect([...keys].filter((key) => translate('en', key) === MISSING_EN_TRANSLATION)).toEqual([]);
  });

  it('uses an explicit non-Uzbek marker only for a genuinely uncatalogued UI key', () => {
    expect(translate('en', '__missing_application_key__')).toBe(MISSING_EN_TRANSLATION);
  });

  it('covers localized values supplied dynamically by the support contact configuration', () => {
    const contactCards = readFileSync(new URL('../components/ContactCards.jsx', import.meta.url), 'utf8');
    const dynamicValues = [...contactCards.matchAll(/(?:title|desc|cta|copiedNote):\s*(['"])(.*?)\1/g)]
      .map((match) => match[2]);

    expect(dynamicValues).not.toEqual([]);
    expect(dynamicValues.filter((value) => !Object.hasOwn(EN, value))).toEqual([]);
    expect(dynamicValues.map((value) => translate('en', value))).not.toContain(MISSING_EN_TRANSLATION);
  });

  it('keeps visible API failures safe across authenticated routes and shared UI', () => {
    const authenticatedSource = authenticatedUiFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
    const loader = readFileSync(new URL('../components/ui.jsx', import.meta.url), 'utf8');

    expect(authenticatedSource).not.toMatch(/(?:toast\.error|setError|window\.alert|\balert)\([^\n]*(?:err|error|e)\.message/);
    expect(loader).toContain('localizedErrorMessage(t, { message: error })');
  });

  it('keeps known UZS cards and rows free of a dollar prefix in English', () => {
    const warehouse = readFileSync(new URL('../pages/Warehouse.jsx', import.meta.url), 'utf8');
    const payments = readFileSync(new URL('../pages/Payments.jsx', import.meta.url), 'utf8');
    const treasury = readFileSync(new URL('../components/TreasurySection.jsx', import.meta.url), 'utf8');
    const debt = readFileSync(new URL('../pages/Debt.jsx', import.meta.url), 'utf8');

    expect(warehouse).toContain('currencyCode="UZS"');
    expect(warehouse).toContain("formatMoneyLocalized(p.salePrice, p.currency, lang)");
    expect(payments).toContain('formatMoneyLocalized(p.amount, p.currency, lang)');
    expect(treasury).toContain("formatMoneyLocalized(uzs, 'UZS', lang)");
    expect(debt).toContain("formatMoneyLocalized(recvUzs, 'UZS', lang)");
    expect(debt).not.toContain('usd(recv)');
    expect(translate('en', 'Ombor qiymati (kelish)')).toBe('Inventory value');
  });
});
