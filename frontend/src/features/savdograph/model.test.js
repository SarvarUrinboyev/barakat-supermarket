import { describe, expect, it } from 'vitest';
import {
  ASK_LOCALES,
  askLocaleFromLanguage,
  boundedProducts,
  briefNarrativeText,
  buildDecisionTrace,
  buildDecisionTwinRequests,
  buildPolicyShield,
  buildProofGraph,
  buildBridgeRequest,
  buildDecisionRequest,
  canDecideSavdoGraph,
  canReadLedger,
  canReadSavdoGraph,
  canWriteSavdoGraph,
  classificationMeta,
  createDecisionKey,
  decisionEvidenceIds,
  displayBackendValue,
  evidenceIdList,
  formatSavdoGraphDateTime,
  hasPermission,
  isReviewPendingStatus,
  isSimulationEligible,
  localizeAskResponseForPresentation,
  normaliseAskResponse,
  normalisePermissions,
  parseEvidenceReferences,
  presentLedgerEvent,
  safeErrorKey,
  safeStructuredInputs,
  savdoGraphLocaleFromLanguage,
  savdoGraphTextKeys,
  sgText,
  simulationNarrativeText,
  simulationRiskLabel,
  statusLabel,
  validatePeriod,
  validateSimulationInput,
  validateDecisionTwin,
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
  it('21 provides exactly four workspace display languages', () => expect(WORKSPACE_LOCALES).toEqual(['UZ', 'UZC', 'RU', 'EN']));
  it('22 keeps the Uzbek example exact', () => expect(sgText('UZ', 'uzExample')).toContain('yalpi foyda'));
  it('23 keeps the Russian example exact', () => expect(sgText('RU', 'ruExample')).toContain('\u0421\u043c\u043e\u0434\u0435\u043b\u0438\u0440\u0443\u0439'));
  it('24 keeps the English example exact', () => expect(sgText('EN', 'enExample')).toBe('What information do you need before recommending a reorder?'));
  it('24a derives presentation and Ask locale only from the global language', () => {
    expect(['uz', 'uzc', 'ru', 'en'].map(savdoGraphLocaleFromLanguage)).toEqual(['UZ', 'UZC', 'RU', 'EN']);
    expect(['uz', 'uzc', 'ru', 'en'].map(askLocaleFromLanguage)).toEqual(['UZ', 'UZ', 'RU', 'EN']);
  });
  it('24b preserves the exact English hero contract', () => {
    expect(sgText('EN', 'productPromise')).toBe('Evidence-first operating system for retail decisions.');
    expect(sgText('EN', 'productSupport')).toBe('It does not guess. It proves, simulates, and waits for human approval.');
  });
  it('24c renders Uzbek Cyrillic while preserving technical acronyms', () => {
    expect(sgText('UZC', 'productPromise')).toMatch(/[А-Яа-яЎўҚқҒғҲҳ]/);
    expect(sgText('UZC', 'judgeMode')).toContain('Ҳакам');
    expect(sgText('UZC', 'providerUnavailable')).toContain('AI');
  });
  it('25 labels ANSWERED safely', () => expect(statusLabel('ANSWERED', 'EN')).toBe('Answered'));
  it('26 labels NEEDS_CLARIFICATION safely', () => expect(statusLabel('NEEDS_CLARIFICATION', 'EN')).toContain('Clarification'));
  it('27 labels PROVIDER_UNAVAILABLE without a fabricated answer', () => expect(statusLabel('PROVIDER_UNAVAILABLE', 'EN')).toContain('No fallback answer'));
  it('28 labels REFUSED as a domain or safety boundary', () => expect(statusLabel('REFUSED', 'EN')).toContain('refused'));
  it('29 labels groundedness validation failure explicitly', () => expect(statusLabel('GROUNDEDNESS_VALIDATION_FAILED', 'EN')).toContain('not sufficiently grounded'));
  it('30 preserves fact evidence maps and arrays', () => expect(evidenceIdList({ revenue: 8, cogs: 9 })).toEqual([8, 9]));
  it.each(['PROVIDER_UNAVAILABLE', 'REFUSED', 'ERROR', 'GROUNDEDNESS_VALIDATION_FAILED'])(
    'accepts %s without a classification badge',
    (status) => expect(normaliseAskResponse({ status, classification: null, answer: 'Safe backend message' })).toMatchObject({ status, classification: null }),
  );
  it('accepts NEEDS_CLARIFICATION without inferring a classification', () => expect(normaliseAskResponse({ status: 'NEEDS_CLARIFICATION', classification: null, answer: 'Which product?' })).toMatchObject({ classification: null }));
  it.each([
    ['INSUFFICIENT_DATA', 'INSUFFICIENT_DATA'],
    ['UNSUPPORTED', 'UNSUPPORTED'],
  ])('accepts %s only with its corresponding classification', (status, classification) => {
    expect(normaliseAskResponse({ status, classification })).toMatchObject({ status, classification });
    expect(normaliseAskResponse({ status, classification: 'VERIFIED' })).toBeNull();
  });
  it('requires ANSWERED to contain both an answer and a valid business classification', () => {
    expect(normaliseAskResponse({ status: 'ANSWERED', classification: null, answer: 'Fact' })).toBeNull();
    expect(normaliseAskResponse({ status: 'ANSWERED', classification: 'VERIFIED', answer: ' ' })).toBeNull();
  });
  it('requires ANSWERED tool provenance and top-level immutable evidence', () => {
    const grounded = {
      status: 'ANSWERED',
      classification: 'VERIFIED',
      answer: 'Grounded answer',
      toolsUsed: ['get_daily_gross_profit_brief'],
      evidenceIds: [71],
      facts: [],
    };
    expect(normaliseAskResponse(grounded)).toMatchObject(grounded);
    expect(normaliseAskResponse({ ...grounded, toolsUsed: undefined })).toBeNull();
    expect(normaliseAskResponse({ ...grounded, toolsUsed: [] })).toBeNull();
    expect(normaliseAskResponse({ ...grounded, toolsUsed: ['  '] })).toBeNull();
    expect(normaliseAskResponse({ ...grounded, toolsUsed: [' padded_tool '] })).toBeNull();
    expect(normaliseAskResponse({ ...grounded, toolsUsed: Array(6).fill('tool') })).toBeNull();
    expect(normaliseAskResponse({ ...grounded, toolsUsed: ['x'.repeat(65)] })).toBeNull();
    expect(normaliseAskResponse({ ...grounded, evidenceIds: [] })).toBeNull();
    expect(normaliseAskResponse({ ...grounded, evidenceIds: [0, -1, 'invalid'] })).toBeNull();
  });

  it.each([0, 42, -3.5, '103200', ' -3.50 ', '.75', '1,250,000', '1 250 000', '9.4 days', '22.27%', '103200 UZS', 'UZS 1,250,000', '(1,250)', 'about 9 days', 'taxminan 9 kun', 'около 9 дней'])(
    'requires fact-level evidence for numeric ANSWERED fact value %s',
    (value) => {
      const response = {
        status: 'ANSWERED',
        classification: 'VERIFIED',
        answer: 'Grounded answer',
        toolsUsed: ['get_daily_gross_profit_brief'],
        evidenceIds: [71],
        facts: [{ label: 'Metric', value, unit: 'UZS', classification: 'VERIFIED' }],
      };
      expect(normaliseAskResponse(response)).toBeNull();
      expect(normaliseAskResponse({
        ...response,
        facts: [{ ...response.facts[0], evidence_ids: [71] }],
      })).not.toBeNull();
    },
  );

  it('requires immutable evidence on every ANSWERED fact, including narrative facts', () => {
    const response = {
      status: 'ANSWERED',
      classification: 'ESTIMATED',
      answer: 'Narrative context is available.',
      toolsUsed: ['run_reorder_simulation'],
      evidenceIds: [81],
      facts: [
        { label: 'Context', value: 'Demand remained steady during the demo window.', classification: 'ESTIMATED' },
        { label: 'Qualified context', value: '12 units were described narratively.', classification: 'ESTIMATED' },
      ],
    };
    expect(normaliseAskResponse(response)).toBeNull();
    expect(normaliseAskResponse({
      ...response,
      facts: response.facts.map((fact) => ({ ...fact, evidence_ids: [81] })),
    })).not.toBeNull();
  });

  it('requires every fact to use current result evidence and a compatible classification', () => {
    const valid = {
      status: 'ANSWERED', classification: 'ESTIMATED', answer: 'Grounded answer',
      toolsUsed: ['get_daily_gross_profit_brief'], evidenceIds: [71],
      facts: [{ label: 'Gross Profit', value: '44 UZS', evidence_ids: [71], classification: 'VERIFIED' }],
    };
    expect(normaliseAskResponse(valid)).not.toBeNull();
    expect(normaliseAskResponse({
      ...valid, facts: [{ ...valid.facts[0], evidence_ids: [72] }],
    })).toBeNull();
    expect(normaliseAskResponse({
      ...valid, facts: [{ ...valid.facts[0], classification: 'INSUFFICIENT_DATA' }],
    })).toBeNull();
    expect(normaliseAskResponse({
      ...valid, facts: [{ ...valid.facts[0], classification: undefined }],
    })).toBeNull();
    expect(normaliseAskResponse({
      ...valid, classification: 'VERIFIED',
      facts: [{ ...valid.facts[0], classification: 'ESTIMATED' }],
    })).toBeNull();
  });

  it('fails closed for unknown or missing statuses', () => {
    expect(normaliseAskResponse({ status: 'FUTURE_STATUS', classification: null })).toBeNull();
    expect(normaliseAskResponse({ classification: null })).toBeNull();
  });
  it('preserves a legitimate ANSWERED response and its public evidence fields', () => {
    const response = { interactionId: 'ask-1', model: 'gpt-5.6', promptVersion: 'v1', status: 'ANSWERED', errorCode: null, language: 'uz', answer: 'Yalpi foyda 44 UZS.', classification: 'VERIFIED', facts: [{ value: '44', unit: 'UZS', evidence_ids: [71], classification: 'VERIFIED' }], assumptions: [], limitations: [], toolsUsed: ['get_daily_gross_profit_brief'], evidenceIds: [71], suggestedNextActions: [], providerLatencyMs: 120, generatedAt: '2026-07-20T10:00:00Z' };
    expect(normaliseAskResponse(response)).toEqual(response);
  });
  it('preserves safe degraded fields while dropping non-contract provider payloads', () => {
    const response = normaliseAskResponse({ status: 'PROVIDER_UNAVAILABLE', classification: null, answer: 'Safe message', errorCode: 'PROVIDER_UNAVAILABLE', interactionId: 'ask-2', model: 'gpt-5.6', providerLatencyMs: 30, rawProviderResponse: 'DO_NOT_RENDER' });
    expect(response).toEqual({ status: 'PROVIDER_UNAVAILABLE', classification: null, answer: 'Safe message', errorCode: 'PROVIDER_UNAVAILABLE', interactionId: 'ask-2', model: 'gpt-5.6', providerLatencyMs: 30 });
  });
});

describe('judge-ready decision trace', () => {
  it('deduplicates immutable evidence across public response sources', () => {
    expect(decisionEvidenceIds(
      { evidenceIds: { grossProfit: 7 } },
      { evidenceIds: [7, 8], facts: [{ evidence_ids: [8, 9] }] },
      [{ evidenceReferences: '[9,10]' }],
    )).toEqual([7, 8, 9, 10]);
  });

  it('creates exactly six safe trace stages from public contract fields', () => {
    const response = {
      interactionId: 'interaction-demo',
      status: 'ANSWERED',
      classification: 'VERIFIED',
      toolsUsed: ['get_daily_gross_profit_brief'],
      evidenceIds: [71],
      answer: 'PRIVATE_NARRATIVE_999',
      rawProviderResponse: 'RAW_PROVIDER_BODY',
      hiddenReasoning: 'PRIVATE_CHAIN_OF_THOUGHT',
    };
    const trace = buildDecisionTrace(response);
    expect(trace.map((step) => step.key)).toEqual([
      'traceQuestionReceived',
      'traceToolSelected',
      'traceEvidenceLoaded',
      'traceGroundingChecked',
      'traceClassificationPreserved',
      'traceAnswerReleased',
    ]);
    expect(trace.every((step) => step.state === 'complete')).toBe(true);
    expect(JSON.stringify(trace)).not.toMatch(/PRIVATE_NARRATIVE|RAW_PROVIDER_BODY|PRIVATE_CHAIN_OF_THOUGHT|999/);
  });

  it('does not release an answered state without immutable numeric evidence', () => {
    const trace = buildDecisionTrace({ status: 'ANSWERED', classification: 'VERIFIED', toolsUsed: ['get_daily_gross_profit_brief'], evidenceIds: [] });
    expect(trace.at(-1)).toMatchObject({ key: 'traceAnswerReleased', state: 'not_started' });
  });
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

describe('winner UX model contracts', () => {
  const evidenceIds = (offset) => ({
    periodTimezone: offset + 1,
    currentStock: offset + 2,
    netUnitsSold: offset + 3,
    velocity: offset + 4,
    reorderQuantity: offset + 5,
    coverageBefore: offset + 6,
    coverageAfter: offset + 7,
    stockoutRisk: offset + 8,
    overstockRisk: offset + 9,
    tiedUpCapital: offset + 10,
    classification: offset + 11,
  });
  const simulation = (analysisRunId, safetyStockDays, reorderQuantity) => ({
    analysisRunId,
    classification: 'ESTIMATED',
    productId: 42,
    productSku: 'DEMO-42',
    unit: 'pcs',
    currentOnHandQuantity: 9,
    lookbackStart: '2026-07-01',
    lookbackEnd: '2026-07-20',
    netUnitsSold: 19,
    velocityUnitsPerDay: 1,
    leadTimeDays: 2,
    safetyStockDays,
    forecastHorizonDays: 7,
    reorderQuantity,
    coverageBeforeDays: 9,
    coverageAfterDays: 16 + safetyStockDays,
    stockoutRisk: 'NO_STOCKOUT_WITHIN_ASSUMED_LEAD_TIME',
    overstockRisk: 'NO_SCENARIO_OVERSTOCK',
    tiedUpCapitalUzs: null,
    tiedUpCapitalState: 'UNAVAILABLE_NO_LOT_COST_PROVENANCE',
    assumptions: ['Demo assumption'],
    risks: [],
    limitations: ['No lot cost provenance'],
    calculationId: 'SCENARIO_NET_SALES_REORDER',
    calculationVersion: '1.0',
    generatedAt: '2026-07-20T10:00:00',
    evidenceIds: evidenceIds(analysisRunId * 100),
  });
  const twinScenario = (key, result) => ({
    key,
    request: {
      productId: result.productId,
      lookbackStart: result.lookbackStart,
      lookbackEnd: result.lookbackEnd,
      leadTimeDays: result.leadTimeDays,
      safetyStockDays: result.safetyStockDays,
      forecastHorizonDays: result.forecastHorizonDays,
    },
    result,
  });
  const coherentTwin = () => ([
    twinScenario('NO_ACTION', simulation(11, 0, 0)),
    twinScenario('BALANCED', simulation(12, 3, 5)),
    twinScenario('HIGH_COVERAGE', simulation(13, 14, 12)),
  ]);

  it('keeps every SavdoGraph key in parity across UZ, derived UZC, RU and EN', () => {
    const uz = savdoGraphTextKeys('UZ');
    expect(uz.length).toBeGreaterThan(250);
    expect(savdoGraphTextKeys('UZC')).toEqual(uz);
    expect(savdoGraphTextKeys('RU')).toEqual(uz);
    expect(savdoGraphTextKeys('EN')).toEqual(uz);
    expect(uz.every((key) => sgText('UZ', key) !== key && sgText('RU', key) !== key && sgText('EN', key) !== key)).toBe(true);
  });

  it('uses native route copy while preserving approved technical terms', () => {
    expect(sgText('UZ', 'grossProfitBrief')).toBe('Kunlik yalpi foyda hisoboti');
    expect(sgText('RU', 'simulatorHint')).not.toMatch(/backend|proposal/i);
    expect(sgText('UZC', 'decisionTwin')).toContain('SavdoGraph');
    expect(sgText('UZC', 'approvalCreatesOneDraft')).toContain('PurchaseOrder DRAFT');
    expect(sgText('UZC', 'proposalReview')).toContain('кўриб');
    expect(sgText('UZC', 'backendUnavailable')).toContain('ўрнатилмади');
    expect(sgText('UZC', 'proposalReview') + sgText('UZC', 'backendUnavailable')).not.toMatch(/[oOgG][‘’']/);
  });

  it('localizes the judge duration in every supported workspace locale', () => {
    expect(sgText('UZ', 'judgeDuration')).toBe('90 soniya');
    expect(sgText('UZC', 'judgeDuration')).toBe('90 сония');
    expect(sgText('RU', 'judgeDuration')).toBe('90 секунд');
    expect(sgText('EN', 'judgeDuration')).toBe('90 seconds');
  });

  it('presents every approved ledger event without echoing raw backend fields', () => {
    const eventTypes = [
      'PROPOSAL_CREATED_FROM_REORDER_SIMULATION',
      'PROPOSAL_APPROVED',
      'PROPOSAL_REJECTED',
      'DRAFT_PURCHASE_ORDER_CREATED',
      'IDEMPOTENT_REPLAY',
    ];
    for (const locale of WORKSPACE_LOCALES) {
      for (const eventType of eventTypes) {
        const presented = presentLedgerEvent({
          eventType, outcome: 'RAW_OUTCOME', actor: 'PRIVATE ACTOR', details: 'PRIVATE DETAIL', id: 999,
        }, locale);
        expect(Object.keys(presented).sort()).toEqual(['actorLabel', 'detail', 'eventLabel', 'outcomeLabel']);
        expect(Object.values(presented).every((value) => typeof value === 'string' && value.length > 0)).toBe(true);
        expect(JSON.stringify(presented)).not.toMatch(/RAW_OUTCOME|PRIVATE ACTOR|PRIVATE DETAIL|999/);
      }
    }
    const unknown = presentLedgerEvent({
      eventType: 'PAYMENT_SENT_SECRET', outcome: 'PAID', actor: 'Alice', details: 'card 4111', id: 77,
    }, 'EN');
    expect(unknown).toEqual({
      eventLabel: 'Recorded decision event',
      outcomeLabel: 'Outcome safely recorded',
      actorLabel: 'Authorized workspace actor',
      detail: 'A read-only decision event was recorded; raw details are hidden.',
    });
    expect(JSON.stringify(unknown)).not.toMatch(/PAYMENT_SENT_SECRET|PAID|Alice|4111|77/);
  });

  it('localizes only the finite Gross Profit brief narrative contract', () => {
    const narratives = [
      'Sale date is start-inclusive and end-exclusive in Asia/Tashkent.',
      'Revenue is the as-of snapshot totalUzs minus refundedTotalUzs.',
      'Credit sales are included because persisted Sale is the booked checkout record.',
      'Currency provenance is missing, mixed, or not UZS-canonical; no aggregate is presented.',
      'At least one sale item has no transaction-time costAtSaleUzs; current product cost is never used.',
      'A refunded quantity is outside its sold quantity; COGS cannot be trusted.',
      'At least one cost snapshot is LEGACY_OR_UNKNOWN and is therefore estimated, not verified.',
    ];
    for (const locale of WORKSPACE_LOCALES) {
      for (const narrative of narratives) {
        const localized = briefNarrativeText(narrative, locale);
        if (locale !== 'EN') expect(localized).not.toBe(narrative);
        expect(localized).not.toBe(sgText(locale, 'briefNarrativeUnavailable'));
      }
      expect(briefNarrativeText('PRIVATE backend diagnostic 123', locale))
        .toBe(sgText(locale, 'briefNarrativeUnavailable'));
    }
    const uzc = briefNarrativeText(narratives[0], 'UZC');
    expect(uzc).toContain('Asia/Tashkent');
    expect(briefNarrativeText(narratives[4], 'UZC')).toContain('costAtSaleUzs');
  });
  it('localizes only approved simulation risk enums and fixed backend narratives', () => {
    const risks = [
      'ESTIMATED_STOCKOUT_BEFORE_LEAD_TIME',
      'NO_STOCKOUT_WITHIN_ASSUMED_LEAD_TIME',
      'ESTIMATED_ABOVE_SCENARIO_TARGET',
      'NO_SCENARIO_OVERSTOCK',
      'NO_OBSERVED_SALES',
      'NO_OBSERVED_SALES_IN_LOOKBACK',
      'INSUFFICIENT_DATA',
      'INSUFFICIENT_DATA_NEGATIVE_ON_HAND',
      'INSUFFICIENT_DATA_PRODUCT_UNIT_OR_CURRENCY_OR_RETURN_QUANTITY',
      'INSUFFICIENT_DATA_SCENARIO_QUANTITY_EXCEEDS_SAFE_LIMIT',
      'LOW',
      'HIGH',
    ];
    for (const locale of WORKSPACE_LOCALES) {
      for (const risk of risks) {
        const label = simulationRiskLabel(risk, locale);
        expect(label).not.toBe(risk);
        expect(label).not.toBe('simulationValueUnavailable');
      }
      expect(simulationRiskLabel('SECRET_INTERNAL_ENUM', locale)).toBe(sgText(locale, 'simulationValueUnavailable'));
    }

    const narratives = [
      'Lead time is an owner-visible scenario assumption: 2 days.',
      'Safety stock is an owner-visible scenario assumption: 14 days.',
      'Forecast horizon is an owner-visible scenario assumption: 7 days.',
      'Formula: max(0, ceil(netUnitsSold/lookbackDays * (leadTimeDays + safetyStockDays + forecastHorizonDays) - currentOnHand)).',
      'No reserved stock, incoming purchase order, supplier delivery, or cross-unit conversion is claimed.',
      'Tied-up capital is unavailable because current on-hand inventory has no immutable lot-cost provenance.',
    ];
    for (const locale of WORKSPACE_LOCALES) {
      for (const narrative of narratives) {
        expect(simulationNarrativeText(narrative, locale)).not.toBe(sgText(locale, 'simulationValueUnavailable'));
      }
      expect(simulationNarrativeText('Future demand can differ from history.', locale))
        .toBe(sgText(locale, 'simulationValueUnavailable'));
      expect(simulationNarrativeText('Lead time is an owner-visible scenario assumption: 61 days.', locale))
        .toBe(sgText(locale, 'simulationValueUnavailable'));
    }
    expect(simulationNarrativeText(narratives[3], 'UZC')).toContain('netUnitsSold');
  });

  it('formats explicit instants in Asia/Tashkent without changing their instant', () => {
    for (const value of ['2026-07-20T00:00:00Z', '2026-07-20T03:30:00+02:00']) {
      const expected = new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tashkent',
      }).format(new Date(value));
      expect(formatSavdoGraphDateTime(value, 'EN')).toBe(expected);
    }
  });

  it('fails closed instead of echoing invalid timestamp text', () => {
    expect(formatSavdoGraphDateTime('PRIVATE backend diagnostic', 'EN')).toBe('');
    expect(formatSavdoGraphDateTime('2026-99-99T12:00:00', 'EN')).toBe('');
  });

  it('interprets offset-less backend LocalDateTime values as Asia/Tashkent wall time', () => {
    const value = '2026-07-18T12:05:00';
    const explicitTashkentInstant = new Date(`${value}+05:00`);
    const intlLocales = { UZ: 'uz-UZ', UZC: 'uz-Cyrl-UZ', RU: 'ru-RU', EN: 'en-US' };
    for (const locale of WORKSPACE_LOCALES) {
      const formatter = new Intl.DateTimeFormat(intlLocales[locale], {
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tashkent',
      });
      const parts = Object.fromEntries(formatter.formatToParts(explicitTashkentInstant)
        .filter(({ type }) => type !== 'literal').map(({ type, value: part }) => [type, part]));
      expect(parts.hour).toBe('12');
      expect(parts.minute).toBe('05');
      expect(formatSavdoGraphDateTime(value, locale)).toBe(formatter.format(explicitTashkentInstant));
    }
  });

  it('localizes safe numeric strings and leaves identifiers or text unchanged', () => {
    expect(displayBackendValue('1234.5', 'EN')).toBe('1,234.5');
    expect(displayBackendValue('-1200', 'EN')).toBe('-1,200');
    expect(displayBackendValue('000123', 'EN')).toBe('000123');
    expect(displayBackendValue('analysis-1234', 'EN')).toBe('analysis-1234');
    expect(displayBackendValue('a5920ec367fc', 'EN')).toBe('a5920ec367fc');
  });

  it('presents backend Uzbek narrative in Cyrillic without carrying raw fields', () => {
    const localized = localizeAskResponseForPresentation({
      status: 'ANSWERED',
      classification: 'VERIFIED',
      language: 'UZ',
      answer: 'Yalpi foyda 103200 UZS. GPT-5.6 dalillarni tushuntirdi.',
      facts: [{ label: 'Yalpi foyda', value: '103200', unit: 'UZS', evidence_ids: [71], classification: 'VERIFIED', raw: 'DROP' }],
      assumptions: ['Faraz yo‘q'],
      limitations: ['Cheklov yo‘q'],
      toolsUsed: ['get_daily_gross_profit_brief'],
      evidenceIds: [71],
      suggestedNextActions: [{ type: 'OPEN_EVIDENCE', label: 'Dalilni ochish', requires_human_action: true, raw: 'DROP' }],
      rawProviderResponse: 'DROP',
    }, 'UZC');
    expect(localized.answer).toMatch(/Ялпи фойда/);
    expect(localized.answer).toContain('UZS');
    expect(localized.answer).toContain('GPT-5.6');
    expect(localized.facts[0]).toEqual({
      label: 'Ялпи фойда', value: '103200', unit: 'UZS', evidence_ids: [71], classification: 'VERIFIED',
    });
    expect(localized.suggestedNextActions[0]).not.toHaveProperty('raw');
    expect(localized).not.toHaveProperty('rawProviderResponse');
  });

  it('fails closed on mismatched ANSWERED languages while preserving safe non-ANSWERED statuses', () => {
    const answered = {
      status: 'ANSWERED', classification: 'VERIFIED', answer: 'Grounded answer',
      facts: [], toolsUsed: ['get_daily_gross_profit_brief'], evidenceIds: [71],
    };
    expect(localizeAskResponseForPresentation({ ...answered, language: 'uz' }, 'UZ')).not.toBeNull();
    expect(localizeAskResponseForPresentation({ ...answered, language: 'uz' }, 'UZC')).not.toBeNull();
    expect(localizeAskResponseForPresentation({ ...answered, language: 'ru' }, 'RU')).not.toBeNull();
    expect(localizeAskResponseForPresentation({ ...answered, language: 'en' }, 'EN')).not.toBeNull();
    expect(localizeAskResponseForPresentation({ ...answered, language: 'uz' }, 'EN')).toBeNull();
    expect(localizeAskResponseForPresentation({ ...answered, language: 'ru' }, 'UZ')).toBeNull();
    expect(localizeAskResponseForPresentation({ ...answered, language: 'en' }, 'RU')).toBeNull();
    expect(localizeAskResponseForPresentation(answered, 'EN')).toBeNull();

    for (const status of ['PROVIDER_UNAVAILABLE', 'REFUSED', 'ERROR', 'GROUNDEDNESS_VALIDATION_FAILED']) {
      expect(localizeAskResponseForPresentation({
        status, classification: null, answer: 'Safe backend status',
      }, 'EN')).toMatchObject({ status, classification: null });
    }
  });

  it('builds exactly three bounded server request bodies without extra backend fields', () => {
    expect(buildDecisionTwinRequests({
      productId: '42', lookbackStart: '2026-07-01', lookbackEnd: '2026-07-20',
    })).toEqual([
      { key: 'NO_ACTION', request: { productId: 42, lookbackStart: '2026-07-01', lookbackEnd: '2026-07-20', leadTimeDays: 2, safetyStockDays: 0, forecastHorizonDays: 7 } },
      { key: 'BALANCED', request: { productId: 42, lookbackStart: '2026-07-01', lookbackEnd: '2026-07-20', leadTimeDays: 2, safetyStockDays: 3, forecastHorizonDays: 7 } },
      { key: 'HIGH_COVERAGE', request: { productId: 42, lookbackStart: '2026-07-01', lookbackEnd: '2026-07-20', leadTimeDays: 2, safetyStockDays: 14, forecastHorizonDays: 7 } },
    ]);
  });

  it('validates coherent server snapshots without calculating browser deltas', () => {
    const validated = validateDecisionTwin(coherentTwin());
    expect(validated).toMatchObject({ coherent: true, reason: null });
    expect(validated.scenarios.map(({ key, supported, result }) => [key, supported, result.reorderQuantity])).toEqual([
      ['NO_ACTION', true, 0], ['BALANCED', true, 5], ['HIGH_COVERAGE', true, 12],
    ]);
    expect(validated.scenarios[1].request).toEqual({
      productId: 42, lookbackStart: '2026-07-01', lookbackEnd: '2026-07-20',
      leadTimeDays: 2, safetyStockDays: 3, forecastHorizonDays: 7,
    });
    expect(validated.scenarios[1]).not.toHaveProperty('delta');
  });

  it('binds every Decision Twin response to its exact keyed request', () => {
    const missingRequest = coherentTwin();
    delete missingRequest[0].request;
    expect(validateDecisionTwin(missingRequest).reason).toBe('SCENARIO_REQUEST_MISMATCH');

    const extraRequestField = coherentTwin();
    extraRequestField[1].request.shopId = 9;
    expect(validateDecisionTwin(extraRequestField).reason).toBe('SCENARIO_REQUEST_MISMATCH');

    const wrongPreset = coherentTwin();
    wrongPreset[1].request.safetyStockDays = 14;
    expect(validateDecisionTwin(wrongPreset).reason).toBe('SCENARIO_REQUEST_MISMATCH');

    const mismatchedProduct = coherentTwin();
    mismatchedProduct[2].request.productId = 99;
    expect(validateDecisionTwin(mismatchedProduct).reason).toBe('SCENARIO_REQUEST_RESULT_MISMATCH');

    const mismatchedWindow = coherentTwin();
    mismatchedWindow[1].request.lookbackStart = '2026-07-02';
    expect(validateDecisionTwin(mismatchedWindow).reason).toBe('SCENARIO_REQUEST_RESULT_MISMATCH');

    const mismatchedHorizon = coherentTwin();
    mismatchedHorizon[1].result.forecastHorizonDays = 8;
    expect(validateDecisionTwin(mismatchedHorizon).reason).toBe('SCENARIO_REQUEST_RESULT_MISMATCH');
  });

  it('rejects returned reorder quantities above the canonical server ceiling', () => {
    const oversized = coherentTwin();
    oversized[2].result.reorderQuantity = 100001;
    expect(validateDecisionTwin(oversized).reason).toBe('SCENARIO_CONTRACT_MISMATCH');
  });

  it('fails closed on incomplete, invalid, or monetary-impact Twin snapshots', () => {
    const mutations = [
      (result) => { result.productSku = ''; },
      (result) => { result.unit = ' '; },
      (result) => { result.currentOnHandQuantity = -1; },
      (result) => { result.netUnitsSold = Number.NaN; },
      (result) => { result.velocityUnitsPerDay = Number.POSITIVE_INFINITY; },
      (result) => { result.coverageBeforeDays = -0.1; },
      (result) => { result.tiedUpCapitalUzs = 5000; },
      (result) => { result.tiedUpCapitalState = 'AVAILABLE'; },
      (result) => { result.stockoutRisk = 'UNKNOWN_STOCKOUT_RISK'; },
      (result) => { result.overstockRisk = 'UNKNOWN_OVERSTOCK_RISK'; },
    ];
    for (const mutate of mutations) {
      const twin = coherentTwin();
      mutate(twin[1].result);
      expect(validateDecisionTwin(twin).reason).toBe('SCENARIO_CONTRACT_MISMATCH');
    }
  });

  it('fails closed when NO_ACTION is not a returned zero with evidence', () => {
    const input = coherentTwin();
    input[0].result.reorderQuantity = 1;
    const validated = validateDecisionTwin(input);
    expect(validated).toMatchObject({ coherent: false, reason: 'NO_ACTION_NOT_SUPPORTED' });
    expect(validated.scenarios.every(({ result, supported }) => result === null && supported === false)).toBe(true);
  });

  it('fails closed unless balanced and high scenarios prove ordered server results', () => {
    const noBalancedAction = coherentTwin();
    noBalancedAction[1].result.reorderQuantity = 0;
    expect(validateDecisionTwin(noBalancedAction).reason).toBe('BALANCED_REORDER_NOT_POSITIVE');

    const lowerHighQuantity = coherentTwin();
    lowerHighQuantity[2].result.reorderQuantity = 4;
    expect(validateDecisionTwin(lowerHighQuantity).reason).toBe('HIGH_REORDER_BELOW_BALANCED');

    const missingCoverage = coherentTwin();
    missingCoverage[1].result.coverageAfterDays = null;
    expect(validateDecisionTwin(missingCoverage).reason).toBe('COVERAGE_AFTER_UNAVAILABLE');

    const nonFiniteCoverage = coherentTwin();
    nonFiniteCoverage[2].result.coverageAfterDays = 'not-a-number';
    expect(validateDecisionTwin(nonFiniteCoverage).reason).toBe('COVERAGE_AFTER_UNAVAILABLE');

    const nonIncreasingCoverage = coherentTwin();
    nonIncreasingCoverage[2].result.coverageAfterDays = nonIncreasingCoverage[1].result.coverageAfterDays;
    expect(validateDecisionTwin(nonIncreasingCoverage).reason).toBe('HIGH_COVERAGE_NOT_ABOVE_BALANCED');
  });

  it('fails closed on missing, duplicated, stale, or incoherent Twin evidence', () => {
    const missingEvidence = coherentTwin();
    delete missingEvidence[1].result.evidenceIds.coverageAfter;
    expect(validateDecisionTwin(missingEvidence).reason).toBe('SCENARIO_EVIDENCE_INCOMPLETE');

    const duplicatedWithinRun = coherentTwin();
    duplicatedWithinRun[1].result.evidenceIds.velocity = duplicatedWithinRun[1].result.evidenceIds.currentStock;
    expect(validateDecisionTwin(duplicatedWithinRun).reason).toBe('SCENARIO_EVIDENCE_NOT_DISTINCT');

    const reusedAcrossRuns = coherentTwin();
    reusedAcrossRuns[2].result.evidenceIds.currentStock = reusedAcrossRuns[1].result.evidenceIds.currentStock;
    expect(validateDecisionTwin(reusedAcrossRuns).reason).toBe('SCENARIO_EVIDENCE_NOT_DISTINCT');

    const mismatched = coherentTwin();
    mismatched[2].result.productId = 99;
    expect(validateDecisionTwin(mismatched).reason).toBe('SCENARIO_REQUEST_RESULT_MISMATCH');
  });

  it('builds only ID-proven Proof Graph joins and exposes safe actions', () => {
    const graph = buildProofGraph({
      brief: { analysisRunId: 1, classification: 'VERIFIED', grossProfitUzs: 103200, currency: 'UZS', evidenceIds: { revenue: 101, cogs: 102, grossProfit: 103 } },
      askResponse: { interactionId: 'ask-1', model: 'gpt-5.6-terra', status: 'ANSWERED', classification: 'VERIFIED', answer: 'PRIVATE 999', toolsUsed: ['get_daily_gross_profit_brief'], evidenceIds: [103] },
      simulations: [{ analysisRunId: 2, productId: 42, evidenceIds: { currentStock: 201, reorderQuantity: 202 } }],
      proposal: { proposalId: 3, sourceKind: 'B2_REORDER_SIMULATION', sourceAnalysisRunId: 2, productId: 42, evidenceIds: [201, 202] },
      decision: { proposalId: 3, decision: 'APPROVE', proposalStatus: 'DRAFT_CREATED', purchaseOrderId: 4 },
      ledger: [{ id: 5, proposalId: 3, purchaseOrderId: 4, eventType: 'DRAFT_PURCHASE_ORDER_CREATED', evidenceReferences: '[202]', details: 'PRIVATE' }],
    });
    expect(graph.nodes.find(({ id }) => id === 'evidence:103')?.action).toEqual({ kind: 'open-evidence', evidenceId: 103 });
    expect(graph.nodes.find(({ id }) => id === 'ask:ask-1')).toMatchObject({
      targetId: 'sg-answer-section', model: 'gpt-5.6-terra',
    });
    expect(graph.nodes.find(({ id }) => id === 'simulation:2')?.targetId).toBe('sg-simulator-section');
    expect(graph.nodes.find(({ id }) => id === 'evidence:103')).toMatchObject({ value: 103200, currency: 'UZS' });
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'evidence:101', to: 'evidence:103', kind: 'calculation-input' }),
      expect.objectContaining({ from: 'evidence:103', to: 'ask:ask-1', kind: 'grounds' }),
      expect.objectContaining({ from: 'simulation:2', to: 'proposal:3', kind: 'source-analysis' }),
      expect.objectContaining({ from: 'proposal:3', to: 'decision:3', kind: 'owner-decision' }),
      expect.objectContaining({ from: 'decision:3', to: 'draft:4', kind: 'creates-draft' }),
      expect.objectContaining({ from: 'draft:4', to: 'ledger:5', kind: 'records-draft' }),
    ]));
    expect(JSON.stringify(graph)).not.toMatch(/PRIVATE|999/);
  });

  it('creates Gross Profit proof only from a VERIFIED value, currency, and exact evidence key', () => {
    const valid = {
      analysisRunId: 1, classification: 'VERIFIED', grossProfitUzs: '103200', currency: 'UZS',
      evidenceIds: { sourceRecordCounts: 100, revenue: 101, refundedRevenue: 102, cogs: 103, grossProfit: 104 },
    };
    const validGraph = buildProofGraph({ brief: valid });
    expect(validGraph.nodes.find(({ labelKey }) => labelKey === 'proofGrossProfit')).toMatchObject({
      id: 'evidence:104', value: 103200, currency: 'UZS',
    });
    expect(validGraph.edges.filter(({ kind }) => kind === 'calculation-input')).toHaveLength(4);

    const invalidBriefs = [
      { ...valid, classification: 'ESTIMATED' },
      { ...valid, grossProfitUzs: null },
      { ...valid, currency: '' },
      { ...valid, currency: 'uzs' },
      { ...valid, evidenceIds: { ...valid.evidenceIds, grossProfit: 0 } },
      { ...valid, evidenceIds: { revenue: 101, cogs: 103 } },
    ];
    for (const brief of invalidBriefs) {
      const graph = buildProofGraph({ brief });
      expect(graph.nodes.some(({ labelKey }) => labelKey === 'proofGrossProfit')).toBe(false);
      expect(graph.edges.some(({ kind }) => kind === 'calculation-input')).toBe(false);
    }
  });

  it('creates Ask proof only from the strict renderable grounding contract', () => {
    const valid = {
      interactionId: 'ask-safe', status: 'ANSWERED', classification: 'VERIFIED', answer: 'Grounded.',
      toolsUsed: ['get_daily_gross_profit_brief'], evidenceIds: [103],
      facts: [{ label: 'Gross Profit', value: '103200 UZS', evidence_ids: [103], classification: 'VERIFIED' }],
    };
    expect(buildProofGraph({ askResponse: valid }).nodes.find(({ id }) => id === 'ask:ask-safe')).not.toHaveProperty('model');
    for (const askResponse of [
      { ...valid, answer: ' ' },
      { ...valid, toolsUsed: [] },
      { ...valid, evidenceIds: [] },
      { ...valid, facts: [{ label: 'Gross Profit', value: '103200 UZS', classification: 'VERIFIED' }] },
      { ...valid, model: 'unsafe model identifier' },
    ]) {
      const node = buildProofGraph({ askResponse }).nodes.find(({ kind }) => kind === 'explanation');
      if (askResponse.model) expect(node).not.toHaveProperty('model');
      else expect(node).toBeUndefined();
    }
  });

  it('requires exact canonical simulation-to-proposal joins', () => {
    const simulationResult = { analysisRunId: 2, productId: 42, evidenceIds: { currentStock: 201, reorderQuantity: 202 } };
    const proposalBase = {
      proposalId: 3,
      sourceKind: 'B2_REORDER_SIMULATION',
      sourceAnalysisRunId: 2,
      productId: 42,
      evidenceIds: [202, 201],
    };
    const hasSourceEdge = (proposal) => buildProofGraph({
      simulations: [simulationResult],
      proposal,
    }).edges.some(({ kind }) => kind === 'source-analysis');

    expect(hasSourceEdge(proposalBase)).toBe(true);
    expect(hasSourceEdge({ ...proposalBase, sourceKind: 'OTHER' })).toBe(false);
    expect(hasSourceEdge({ ...proposalBase, productId: 99 })).toBe(false);
    expect(hasSourceEdge({ ...proposalBase, sourceAnalysisRunId: 99 })).toBe(false);
    expect(hasSourceEdge({ ...proposalBase, evidenceIds: [202] })).toBe(false);
    expect(hasSourceEdge({ ...proposalBase, evidenceIds: [201, 202, 203] })).toBe(false);
  });

  it('creates decisions only for typed owner outcomes and restricts ledger proof links', () => {
    const proposal = { proposalId: 3, evidenceIds: [202] };
    const invalidDecision = buildProofGraph({
      proposal,
      decision: { proposalId: 3, decision: 'FUTURE_DECISION', purchaseOrderId: 4 },
    });
    expect(invalidDecision.nodes.some(({ kind }) => kind === 'decision' || kind === 'draft')).toBe(false);

    const graph = buildProofGraph({
      proposal,
      decision: { proposalId: 3, decision: 'APPROVE', proposalStatus: 'DRAFT_CREATED', purchaseOrderId: 4 },
      ledger: [
        { id: 5, proposalId: 3, purchaseOrderId: 4, eventType: 'PROPOSAL_APPROVED' },
        { id: 6, proposalId: 99, purchaseOrderId: 4, eventType: 'DRAFT_PURCHASE_ORDER_CREATED' },
        { id: 7, proposalId: 3, purchaseOrderId: 4, eventType: 'DRAFT_PURCHASE_ORDER_CREATED' },
      ],
    });
    expect(graph.nodes.find(({ id }) => id === 'draft:4')?.targetId).toBe('sg-ledger-section');
    expect(graph.nodes.some(({ id }) => id === 'ledger:5')).toBe(true);
    expect(graph.nodes.some(({ id }) => id === 'ledger:6')).toBe(false);
    expect(graph.nodes.some(({ id }) => id === 'ledger:7')).toBe(true);
    expect(graph.edges.filter(({ kind }) => kind === 'records-draft')).toEqual([
      expect.objectContaining({ from: 'draft:4', to: 'ledger:7' }),
    ]);
    expect(graph.edges).toContainEqual(expect.objectContaining({
      from: 'decision:3', to: 'ledger:5', kind: 'records-decision',
    }));
  });

  it('links only the exact rejected decision event into the Proof Graph', () => {
    const base = {
      proposal: { proposalId: 3, evidenceIds: [202] },
      decision: { proposalId: 3, decision: 'REJECT', proposalStatus: 'REJECTED' },
    };
    const graph = buildProofGraph({
      ...base,
      ledger: [
        { id: 8, proposalId: 3, eventType: 'PROPOSAL_REJECTED' },
        { id: 9, proposalId: 3, purchaseOrderId: 4, eventType: 'PROPOSAL_REJECTED' },
        { id: 10, proposalId: 99, eventType: 'PROPOSAL_REJECTED' },
      ],
    });
    expect(graph.edges.filter(({ kind }) => kind === 'records-decision')).toEqual([
      expect.objectContaining({ from: 'decision:3', to: 'ledger:8' }),
    ]);

    const invalidDecision = buildProofGraph({
      proposal: base.proposal,
      decision: { ...base.decision, purchaseOrderId: 4 },
      ledger: [{ id: 8, proposalId: 3, eventType: 'PROPOSAL_REJECTED' }],
    });
    expect(invalidDecision.edges.some(({ kind }) => kind === 'records-decision')).toBe(false);
  });

  it('does not join mismatched proposal, decision, or DRAFT identifiers', () => {
    const graph = buildProofGraph({
      simulations: [{ analysisRunId: 2, evidenceIds: { reorderQuantity: 202 } }],
      proposal: { proposalId: 3, sourceAnalysisRunId: 99, evidenceIds: [202] },
      decision: { proposalId: 8, decision: 'APPROVE', proposalStatus: 'DRAFT_CREATED', purchaseOrderId: 4 },
      ledger: [{ id: 5, proposalId: 8, purchaseOrderId: 4 }],
    });
    expect(graph.nodes.some(({ kind }) => kind === 'decision' || kind === 'draft')).toBe(false);
    expect(graph.edges.some(({ kind }) => ['source-analysis', 'owner-decision', 'creates-draft'].includes(kind))).toBe(false);
  });

  it('separates enforced system policy from evidence observed in the current run', () => {
    const shield = buildPolicyShield({
      brief: { calculationId: 'GROSS_PROFIT', calculationVersion: '1', evidenceIds: { grossProfit: 101 } },
      askResponse: { interactionId: 'ask-1', status: 'ANSWERED', classification: 'VERIFIED', answer: 'Grounded', toolsUsed: ['get_daily_gross_profit_brief'], evidenceIds: [101] },
      simulations: coherentTwin(),
      proposal: { proposalId: 3 },
      decision: { proposalId: 3, decision: 'APPROVE', proposalStatus: 'DRAFT_CREATED', purchaseOrderId: 4 },
      ledger: [{ id: 5, proposalId: 3, purchaseOrderId: 4, eventType: 'DRAFT_PURCHASE_ORDER_CREATED', evidenceReferences: '[101]' }],
    });
    expect(shield.systemPolicy).toHaveLength(10);
    expect(shield.items.find(({ key }) => key === 'numeric-grounding')?.targetId).toBe('sg-answer-section');
    expect(shield.systemPolicy.every(({ scope, status }) => scope === 'SYSTEM_POLICY' && status === 'enforced')).toBe(true);
    const current = Object.fromEntries(shield.currentRun.map((item) => [item.key, item.status]));
    expect(current).toMatchObject({
      'immutable-evidence': 'recorded',
      'deterministic-calculations': 'recorded',
      'numeric-grounding': 'verified',
      'human-approval': 'verified',
      'one-draft': 'verified',
      'supplier-isolation': 'not_observed',
      'no-payment': 'not_observed',
      'no-inventory-mutation': 'not_observed',
      'zero-autonomous-spend': 'not_observed',
      'tenant-isolation': 'not_observed',
    });
  });

  it('counts one-DRAFT evidence only for the current proposal and requires canonical decision status', () => {
    const currentStatuses = (input) => Object.fromEntries(buildPolicyShield(input).currentRun
      .map((item) => [item.key, item.status]));
    const approved = {
      proposal: { proposalId: 3 },
      decision: { proposalId: 3, decision: 'APPROVE', proposalStatus: 'DRAFT_CREATED', purchaseOrderId: 4 },
      ledger: [
        { id: 1, proposalId: 3, purchaseOrderId: 4, eventType: 'DRAFT_PURCHASE_ORDER_CREATED' },
        { id: 2, proposalId: 99, purchaseOrderId: 90, eventType: 'DRAFT_PURCHASE_ORDER_CREATED' },
        { id: 3, proposalId: 98, purchaseOrderId: 91, eventType: 'DRAFT_PURCHASE_ORDER_CREATED' },
      ],
    };
    expect(currentStatuses(approved)).toMatchObject({
      'human-approval': 'verified', 'one-draft': 'verified',
    });

    const secondCurrentDraft = {
      ...approved,
      ledger: [...approved.ledger, {
        id: 4, proposalId: 3, purchaseOrderId: 5, eventType: 'DRAFT_PURCHASE_ORDER_CREATED',
      }],
    };
    expect(currentStatuses(secondCurrentDraft)['one-draft']).toBe('blocked');

    const invalidApprovalStatus = {
      ...approved,
      decision: { ...approved.decision, proposalStatus: 'APPROVED' },
    };
    expect(currentStatuses(invalidApprovalStatus)).toMatchObject({
      'human-approval': 'pending', 'one-draft': 'blocked',
    });

    const rejected = {
      proposal: { proposalId: 3 },
      decision: { proposalId: 3, decision: 'REJECT', proposalStatus: 'REJECTED' },
      ledger: [{ id: 9, proposalId: 99, purchaseOrderId: 90, eventType: 'DRAFT_PURCHASE_ORDER_CREATED' }],
    };
    expect(currentStatuses(rejected)).toMatchObject({
      'human-approval': 'verified', 'one-draft': 'verified',
    });
  });

  it('shows explicit groundedness failure as blocked and never as a current-run success', () => {
    const trace = buildDecisionTrace({
      interactionId: 'ask-failed', status: 'GROUNDEDNESS_VALIDATION_FAILED',
      classification: null, toolsUsed: ['get_daily_gross_profit_brief'], evidenceIds: [71],
    });
    expect(trace.map(({ state }) => state)).toEqual(['complete', 'complete', 'complete', 'blocked', 'not_started', 'not_started']);
    const shield = buildPolicyShield({
      askResponse: { interactionId: 'ask-failed', status: 'GROUNDEDNESS_VALIDATION_FAILED', classification: null, toolsUsed: ['get_daily_gross_profit_brief'], evidenceIds: [71] },
    });
    expect(shield.currentRun.find(({ key }) => key === 'numeric-grounding')?.status).toBe('blocked');
  });
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
