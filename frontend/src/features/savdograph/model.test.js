import { describe, expect, it } from 'vitest';
import {
  ASK_LOCALES,
  boundedProducts,
  buildBridgeRequest,
  buildDecisionRequest,
  canDecideSavdoGraph,
  canReadLedger,
  canReadSavdoGraph,
  canWriteSavdoGraph,
  classificationMeta,
  createDecisionKey,
  displayBackendValue,
  evidenceIdList,
  hasPermission,
  isReviewPendingStatus,
  isSimulationEligible,
  normalisePermissions,
  parseEvidenceReferences,
  safeErrorKey,
  safeStructuredInputs,
  sgText,
  statusLabel,
  validatePeriod,
  validateSimulationInput,
  WORKSPACE_LOCALES,
} from './model.js';

describe('SavdoGraph routing and access', () => {
  it('1 permitted user has read access', () => expect(canReadSavdoGraph({ permissions: ['SAVDOGRAPH:READ'] })).toBe(true));
  it('2 unauthorized user has no read access', () => expect(canReadSavdoGraph({ permissions: ['PRODUCT:READ'] })).toBe(false));
  it('3 wildcard permission allows direct read access', () => expect(canReadSavdoGraph({ permissions: new Set(['*:*']) })).toBe(true));
  it('4 decision controls require ACCOUNT_OWNER and DECIDE', () => expect(canDecideSavdoGraph({ role: 'ACCOUNT_OWNER', permissions: ['SAVDOGRAPH:DECIDE'] })).toBe(true));
  it('5 SUPER_ADMIN is not misrepresented as B1 owner decision authority', () => expect(canDecideSavdoGraph({ role: 'SUPER_ADMIN', permissions: ['*:*'] })).toBe(false));
  it('6 write permission is independent from read permission', () => expect(canWriteSavdoGraph({ permissions: ['SAVDOGRAPH:READ'] })).toBe(false));
  it('7 ledger permission uses its distinct resource', () => expect(canReadLedger({ permissions: ['SAVDOGRAPH_LEDGER:READ'] })).toBe(true));
  it('8 permissions normalize arrays, sets, and CSV safely', () => expect([...normalisePermissions('savdograph:read, product:read')]).toEqual(['SAVDOGRAPH:READ', 'PRODUCT:READ']));
  it('9 whitespace permissions are ignored', () => expect(hasPermission({ permissions: ' , ' }, 'SAVDOGRAPH:READ')).toBe(false));
});

describe('Daily Gross Profit Brief contract behavior', () => {
  it('10 accepts a one-day exclusive period', () => expect(validatePeriod('2026-07-18', '2026-07-19')).toBe(true));
  it('11 accepts the backend maximum 31-day brief', () => expect(validatePeriod('2026-06-18', '2026-07-19')).toBe(true));
  it('12 rejects a 32-day brief', () => expect(validatePeriod('2026-06-17', '2026-07-19')).toBe(false));
  it('13 rejects an inclusive or reversed end', () => expect(validatePeriod('2026-07-19', '2026-07-19')).toBe(false));
  it('14 rejects malformed dates', () => expect(validatePeriod('18-07-2026', '2026-07-19')).toBe(false));
  it('15 preserves backend zero when it is actually returned', () => expect(displayBackendValue(0, 'EN')).toBe('0'));
  it('16 never converts a missing value to zero', () => expect(displayBackendValue(null, 'EN')).toBe('Not available'));
  it('17 VERIFIED has a non-color indicator and description', () => expect(classificationMeta('VERIFIED', 'EN')).toMatchObject({ icon: '\u2713', label: 'Verified', description: 'Verified against immutable source records.' }));
  it('18 ESTIMATED explicitly describes assumptions', () => expect(classificationMeta('ESTIMATED', 'EN').description).toContain('assumptions'));
  it('19 unknown classification degrades to insufficient-data semantics', () => expect(classificationMeta('FUTURE_VALUE', 'EN').tone).toBe('insufficient'));
});

describe('Ask Your Store typed states and localization', () => {
  it('20 supports exactly AUTO, UZ, RU and EN request locales', () => expect(ASK_LOCALES).toEqual(['AUTO', 'UZ', 'RU', 'EN']));
  it('21 provides exactly three workspace display languages', () => expect(WORKSPACE_LOCALES).toEqual(['UZ', 'RU', 'EN']));
  it('22 keeps the Uzbek example exact', () => expect(sgText('UZ', 'uzExample')).toContain('yalpi foyda'));
  it('23 keeps the Russian example exact', () => expect(sgText('RU', 'ruExample')).toContain('\u0421\u043c\u043e\u0434\u0435\u043b\u0438\u0440\u0443\u0439'));
  it('24 keeps the English example exact', () => expect(sgText('EN', 'enExample')).toBe('What information do you need before recommending a reorder?'));
  it('25 labels ANSWERED safely', () => expect(statusLabel('ANSWERED', 'EN')).toBe('Answered'));
  it('26 labels NEEDS_CLARIFICATION safely', () => expect(statusLabel('NEEDS_CLARIFICATION', 'EN')).toContain('Clarification'));
  it('27 labels PROVIDER_UNAVAILABLE without a fabricated answer', () => expect(statusLabel('PROVIDER_UNAVAILABLE', 'EN')).toContain('No fallback answer'));
  it('28 labels REFUSED as a domain or safety boundary', () => expect(statusLabel('REFUSED', 'EN')).toContain('refused'));
  it('29 labels groundedness validation failure explicitly', () => expect(statusLabel('GROUNDEDNESS_VALIDATION_FAILED', 'EN')).toContain('not sufficiently grounded'));
  it('30 preserves fact evidence maps and arrays', () => expect(evidenceIdList({ revenue: 8, cogs: 9 })).toEqual([8, 9]));
});

describe('Reorder simulator contract', () => {
  const valid = {
    productId: 42,
    lookbackStart: '2026-06-19',
    lookbackEnd: '2026-07-19',
    leadTimeDays: 2,
    safetyStockDays: 3,
    forecastHorizonDays: 7,
  };

  it('31 bounds product search results to eight', () => expect(boundedProducts(Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }))).length).toBe(8));
  it('32 preserves server product order and never silently selects', () => expect(boundedProducts([{ id: 7 }, { id: 2 }])).toEqual([{ id: 7 }, { id: 2 }]));
  it('33 rejects invalid product rows from candidates', () => expect(boundedProducts([{ id: null }, { id: 3 }])).toEqual([{ id: 3 }]));
  it('34 accepts the committed scenario bounds', () => expect(validateSimulationInput(valid)).toBe(true));
  it('35 rejects lookback over 90 days', () => expect(validateSimulationInput({ ...valid, lookbackStart: '2026-04-19' })).toBe(false));
  it('36 rejects lead time over 60 days', () => expect(validateSimulationInput({ ...valid, leadTimeDays: 61 })).toBe(false));
  it('37 rejects safety stock over 90 days', () => expect(validateSimulationInput({ ...valid, safetyStockDays: 91 })).toBe(false));
  it('38 rejects forecast horizon over 180 days', () => expect(validateSimulationInput({ ...valid, forecastHorizonDays: 181 })).toBe(false));
  it('39 rejects fractional bounded inputs', () => expect(validateSimulationInput({ ...valid, leadTimeDays: 1.5 })).toBe(false));
  it('40 preserves unavailable tied-up capital as unavailable', () => expect(displayBackendValue(undefined, 'EN')).toBe('Not available'));
});

describe('B3.5 simulation-to-proposal bridge', () => {
  const eligible = { classification: 'ESTIMATED', reorderQuantity: 4, analysisRunId: 88, evidenceIds: { quantity: 901 } };

  it('41 requires an ESTIMATED result', () => expect(isSimulationEligible({ ...eligible, classification: 'VERIFIED' })).toBe(false));
  it('42 requires a positive reorder quantity', () => expect(isSimulationEligible({ ...eligible, reorderQuantity: 0 })).toBe(false));
  it('43 requires the backend analysisRunId', () => expect(isSimulationEligible({ ...eligible, analysisRunId: null })).toBe(false));
  it('44 requires immutable evidence', () => expect(isSimulationEligible({ ...eligible, evidenceIds: {} })).toBe(false));
  it('45 accepts the fully eligible backend result', () => expect(isSimulationEligible(eligible)).toBe(true));
  it('46 builds a request containing only supplierId', () => expect(buildBridgeRequest('12')).toEqual({ supplierId: 12 }));
  it('47 sends supplierId as a number', () => expect(typeof buildBridgeRequest('12').supplierId).toBe('number'));
  it('48 rejects fractional supplierId tampering', () => expect(() => buildBridgeRequest('12.5')).toThrow(TypeError));
  it('49 rejects missing supplierId', () => expect(() => buildBridgeRequest('')).toThrow(TypeError));
  it('50 never copies quantity or evidence into the bridge body', () => expect(Object.keys(buildBridgeRequest(12))).toEqual(['supplierId']));
});

describe('human decision and ledger safety', () => {
  it('51 builds only reason and retained idempotency key', () => expect(buildDecisionRequest('reviewed', 'stable-key')).toEqual({ reason: 'reviewed', idempotencyKey: 'stable-key' }));
  it('52 converts an empty optional reason to null', () => expect(buildDecisionRequest(' ', 'stable-key').reason).toBeNull());
  it('53 rejects a reason above the backend 500-character bound', () => expect(() => buildDecisionRequest('x'.repeat(501), 'stable-key')).toThrow(TypeError));
  it('54 rejects a missing idempotency key', () => expect(() => buildDecisionRequest('', '')).toThrow(TypeError));
  it('55 creates a bounded decision key tied to proposal and decision', () => { const key = createDecisionKey(77, 'approve'); expect(key).toContain('sg-77-approve-'); expect(key.length).toBeLessThanOrEqual(120); });
  it('55a treats the backend PROPOSED state as awaiting owner review', () => expect(isReviewPendingStatus('PROPOSED')).toBe(true));
  it('55b labels backend DRAFT_CREATED as approved without changing its value', () => expect(statusLabel('DRAFT_CREATED', 'EN')).toBe('Approved'));
  it('56 parses JSON evidence references', () => expect(parseEvidenceReferences('[4,5]')).toEqual([4, 5]));
  it('57 parses bounded numeric references from legacy text', () => expect(parseEvidenceReferences('evidence: 8, 9')).toEqual([8, 9]));
  it('58 ignores invalid evidence references', () => expect(parseEvidenceReferences('none')).toEqual([]));
});

describe('frontend security and degraded states', () => {
  it('59 strips tenant and account authority from structured evidence', () => expect(safeStructuredInputs({ shopId: 1, tenant_id: 2, accountId: 3, lookbackDays: 7 })).toEqual({ lookbackDays: 7 }));
  it('60 strips credentials, tokens and hidden reasoning', () => expect(safeStructuredInputs({ apiKey: 'secret', token: 'secret', hiddenReasoning: 'secret', result: 4 })).toEqual({ result: 4 }));
  it('61 safely rejects malformed structured input instead of rendering raw text', () => expect(safeStructuredInputs('<script>alert(1)</script>')).toBeNull());
  it('62 bounds long untrusted string fields', () => expect(safeStructuredInputs({ note: 'x'.repeat(900) }).note.length).toBe(500));
  it('63 maps network errors without a raw stack trace', () => expect(safeErrorKey({ status: 0 })).toBe('backendUnavailable'));
  it('64 maps permission denial safely', () => expect(safeErrorKey({ status: 403 })).toBe('permissionDenied'));
  it('65 maps proposal conflict safely', () => expect(safeErrorKey({ status: 409 })).toBe('conflict'));
  it('66 maps rate limits safely', () => expect(safeErrorKey({ status: 429 })).toBe('rateLimited'));
});
