import path from 'node:path';
import { test, expect } from '@playwright/test';

const MOCK_MODE = process.env.E2E_SAVDOGRAPH_MOCK === '1';
const CAPTURE_FINAL_EVIDENCE = process.env.E2E_CAPTURE_SAVDOGRAPH === '1';
const CAPTURE_OUTPUT_DIR = process.env.E2E_CAPTURE_OUTPUT_DIR?.trim() || null;
const JOURNEY_VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

const BRIEF_EVIDENCE_IDS = Object.freeze({
  periodTimezone: 101,
  revenue: 102,
  refundedRevenue: 103,
  cogs: 104,
  grossProfit: 105,
  grossMargin: 106,
  sourceRecordCounts: 107,
  classification: 108,
});

const SIMULATION_EVIDENCE_FIELDS = Object.freeze([
  'periodTimezone',
  'currentStock',
  'netUnitsSold',
  'velocity',
  'reorderQuantity',
  'coverageBefore',
  'coverageAfter',
  'stockoutRisk',
  'overstockRisk',
  'tiedUpCapital',
  'classification',
]);

const SCENARIO_FIXTURES = Object.freeze({
  0: Object.freeze({
    key: 'NO_ACTION',
    analysisRunId: 601,
    evidenceBase: 200,
    reorderQuantity: 0,
    coverageAfterDays: '10.91',
    stockoutRisk: 'NO_STOCKOUT_WITHIN_ASSUMED_LEAD_TIME',
    overstockRisk: 'ESTIMATED_ABOVE_SCENARIO_TARGET',
  }),
  3: Object.freeze({
    key: 'BALANCED',
    analysisRunId: 602,
    evidenceBase: 300,
    reorderQuantity: 1,
    coverageAfterDays: '13.64',
    stockoutRisk: 'NO_STOCKOUT_WITHIN_ASSUMED_LEAD_TIME',
    overstockRisk: 'NO_SCENARIO_OVERSTOCK',
  }),
  14: Object.freeze({
    key: 'HIGH_COVERAGE',
    analysisRunId: 603,
    evidenceBase: 400,
    reorderQuantity: 5,
    coverageAfterDays: '24.55',
    stockoutRisk: 'NO_STOCKOUT_WITHIN_ASSUMED_LEAD_TIME',
    overstockRisk: 'NO_SCENARIO_OVERSTOCK',
  }),
});

const LOCALE_EXPECTATIONS = Object.freeze({
  uz: { askLocale: 'UZ', documentLanguage: 'uz', marker: 'Chakana savdo qarorlari', answerMarker: 'Bugungi yalpi foyda' },
  uzc: { askLocale: 'UZ', documentLanguage: 'uz-Cyrl', marker: 'Чакана савдо қарорлари', answerMarker: 'Бугунги ялпи фойда' },
  ru: { askLocale: 'RU', documentLanguage: 'ru', marker: 'Операционная система', answerMarker: 'Сегодня валовая прибыль' },
  en: { askLocale: 'EN', documentLanguage: 'en', marker: 'Evidence-first operating system', answerMarker: "Today's Gross Profit" },
});

function simulationEvidenceIds(evidenceBase) {
  return Object.fromEntries(SIMULATION_EVIDENCE_FIELDS.map((field, index) => [field, evidenceBase + index + 1]));
}

function registerEvidence(store, id, {
  evidenceType,
  result,
  unit,
  currency = null,
  periodFrom = '2026-07-18',
  periodTo = '2026-07-19',
  calculationId = 'savdograph-demo-v1',
  calculationVersion = 'B2.0',
  inputs = {},
}) {
  store.set(Number(id), {
    id: Number(id),
    evidenceType,
    sourceType: 'ANONYMIZED_SYNTHETIC_DEMO',
    periodFrom,
    periodTo,
    calculationId,
    calculationVersion,
    inputData: JSON.stringify(inputs),
    calculatedResult: result == null ? null : String(result),
    unit: unit ?? null,
    currency,
    contentHash: String(Number(id) % 10).repeat(64),
    hashVersion: 'B1_CANONICAL_V1',
    createdAt: '2026-07-18T12:00:00',
  });
}

function registerBriefEvidence(store, periodFrom, periodTo) {
  const fixtures = [
    ['periodTimezone', 'PERIOD_TIMEZONE', null, null, null],
    ['revenue', 'REVENUE', '5000000.00', 'money', 'UZS'],
    ['refundedRevenue', 'REFUNDED_REVENUE', '0.00', 'money', 'UZS'],
    ['cogs', 'COGS', '3750000.00', 'money', 'UZS'],
    ['grossProfit', 'GROSS_PROFIT', '1250000.00', 'money', 'UZS'],
    ['grossMargin', 'GROSS_MARGIN', '25.00', 'percent', null],
    ['sourceRecordCounts', 'SOURCE_RECORD_COUNT', '12', 'sales', null],
    ['classification', 'RESULT_CLASSIFICATION', null, null, null],
  ];
  for (const [field, evidenceType, result, unit, currency] of fixtures) {
    registerEvidence(store, BRIEF_EVIDENCE_IDS[field], {
      evidenceType,
      result,
      unit,
      currency,
      periodFrom,
      periodTo,
      calculationId: 'DAILY_GROSS_PROFIT_BRIEF',
      inputs: field === 'sourceRecordCounts'
        ? { completedSaleCount: 12, sourceSaleItemCount: 18 }
        : { field, period: `${periodFrom}/${periodTo}`, timezone: 'Asia/Tashkent' },
    });
  }
}

function buildSimulation(body, fixture, evidenceStore) {
  const evidenceIds = simulationEvidenceIds(fixture.evidenceBase);
  const valuesByField = {
    periodTimezone: null,
    currentStock: 4,
    netUnitsSold: '11.00',
    velocity: '0.37',
    reorderQuantity: fixture.reorderQuantity,
    coverageBefore: '10.91',
    coverageAfter: fixture.coverageAfterDays,
    stockoutRisk: '10.91',
    overstockRisk: fixture.coverageAfterDays,
    tiedUpCapital: null,
    classification: null,
  };
  const typeByField = {
    periodTimezone: 'PERIOD_TIMEZONE',
    currentStock: 'REORDER_CURRENT_STOCK',
    netUnitsSold: 'REORDER_NET_UNITS_SOLD',
    velocity: 'REORDER_VELOCITY',
    reorderQuantity: 'REORDER_QUANTITY',
    coverageBefore: 'REORDER_COVERAGE_BEFORE',
    coverageAfter: 'REORDER_COVERAGE_AFTER',
    stockoutRisk: 'REORDER_STOCKOUT_RISK',
    overstockRisk: 'REORDER_OVERSTOCK_RISK',
    tiedUpCapital: 'REORDER_TIED_UP_CAPITAL',
    classification: 'RESULT_CLASSIFICATION',
  };
  const unitByField = {
    currentStock: 'dona',
    netUnitsSold: 'dona',
    velocity: 'units/day',
    reorderQuantity: 'dona',
    coverageBefore: 'days',
    coverageAfter: 'days',
    stockoutRisk: 'days',
    overstockRisk: 'days',
    tiedUpCapital: 'money',
  };
  const inputByField = {
    periodTimezone: { timezone: 'Asia/Tashkent', startInclusive: body.lookbackStart, endExclusive: body.lookbackEnd },
    currentStock: { currentOnHandQuantity: 4, productUnit: 'dona' },
    netUnitsSold: { formula: 'SUM(quantity - refundedQty) for this product', sourceSaleItemCount: 1 },
    velocity: { formula: 'netUnitsSold / explicitLookbackDays', lookbackDays: 30 },
    reorderQuantity: { leadTimeDays: body.leadTimeDays, safetyStockDays: body.safetyStockDays, forecastHorizonDays: body.forecastHorizonDays, formulaVersion: 'B2.0' },
    coverageBefore: { state: 'AVAILABLE' },
    coverageAfter: { state: 'AVAILABLE' },
    stockoutRisk: { risk: fixture.stockoutRisk },
    overstockRisk: { risk: fixture.overstockRisk },
    tiedUpCapital: { state: 'UNAVAILABLE_NO_LOT_COST_PROVENANCE' },
    classification: { classification: 'ESTIMATED', scenario: fixture.key },
  };

  for (const field of SIMULATION_EVIDENCE_FIELDS) {
    registerEvidence(evidenceStore, evidenceIds[field], {
      evidenceType: typeByField[field],
      result: valuesByField[field],
      unit: unitByField[field],
      currency: field === 'tiedUpCapital' || field === 'currentStock' ? 'UZS' : null,
      periodFrom: body.lookbackStart,
      periodTo: body.lookbackEnd,
      calculationId: 'SCENARIO_NET_SALES_REORDER',
      inputs: inputByField[field],
    });
  }

  const generatedMinute = Number(body.safetyStockDays) === 0 ? 2 : Number(body.safetyStockDays) === 3 ? 3 : 4;
  return {
    analysisRunId: fixture.analysisRunId,
    classification: 'ESTIMATED',
    productId: 77,
    productSku: '4780001090001',
    unit: 'dona',
    currentOnHandQuantity: 4,
    lookbackStart: body.lookbackStart,
    lookbackEnd: body.lookbackEnd,
    netUnitsSold: '11.00',
    velocityUnitsPerDay: '0.37',
    leadTimeDays: body.leadTimeDays,
    safetyStockDays: body.safetyStockDays,
    forecastHorizonDays: body.forecastHorizonDays,
    reorderQuantity: fixture.reorderQuantity,
    coverageBeforeDays: '10.91',
    coverageAfterDays: fixture.coverageAfterDays,
    stockoutRisk: fixture.stockoutRisk,
    overstockRisk: fixture.overstockRisk,
    tiedUpCapitalUzs: null,
    tiedUpCapitalState: 'UNAVAILABLE_NO_LOT_COST_PROVENANCE',
    assumptions: [
      'Lead time is an owner-visible scenario assumption: ' + body.leadTimeDays + ' days.',
      'Safety stock is an owner-visible scenario assumption: ' + body.safetyStockDays + ' days.',
      'Forecast horizon is an owner-visible scenario assumption: ' + body.forecastHorizonDays + ' days.',
      'Formula: max(0, ceil(netUnitsSold/lookbackDays * (leadTimeDays + safetyStockDays + forecastHorizonDays) - currentOnHand)).',
    ],
    risks: [fixture.stockoutRisk, fixture.overstockRisk],
    limitations: [
      'No reserved stock, incoming purchase order, supplier delivery, or cross-unit conversion is claimed.',
      'Tied-up capital is unavailable because current on-hand inventory has no immutable lot-cost provenance.',
    ],
    calculationId: 'SCENARIO_NET_SALES_REORDER',
    calculationVersion: 'B2.0',
    generatedAt: '2026-07-18T12:0' + generatedMinute + ':00',
    evidenceIds,
  };
}

function askPresentationFor(locale = 'EN') {
  const requested = String(locale).toUpperCase();
  if (requested === 'UZ') return {
    language: 'uz',
    answer: 'Bugungi yalpi foyda 1 250 000 UZS.',
    factLabel: 'Yalpi foyda',
    limitation: 'Sof foyda hisoblanmagan.',
    actionLabel: "Dalilni ko'rib chiqish",
  };
  if (requested === 'RU') return {
    language: 'ru',
    answer: 'Сегодня валовая прибыль составляет 1 250 000 UZS.',
    factLabel: 'Валовая прибыль',
    limitation: 'Чистая прибыль не рассчитывалась.',
    actionLabel: 'Просмотреть доказательства',
  };
  return {
    language: 'en',
    answer: "Today's Gross Profit is 1,250,000 UZS.",
    factLabel: 'Gross Profit',
    limitation: 'Net Profit is not calculated.',
    actionLabel: 'Review evidence',
  };
}

async function installSyntheticBackend(page, { language = 'en' } = {}) {
  const evidenceStore = new Map();

  const state = {
    askBodies: [],
    askEvidenceIds: [],
    bridgeBodies: [],
    decisionBodies: [],
    draftIds: [],
    ledger: [],
    pageErrors: [],
    consoleErrors: [],
    postPaths: [],
    simulationsByRun: new Map(),
    simulationBodies: [],
  };

  page.on('console', (message) => {
    if (message.type() === 'error') state.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => state.pageErrors.push(error.message));

  await page.addInitScript((initialLanguage) => {
    localStorage.setItem('savdopro.token', 'synthetic-e2e-session');
    localStorage.setItem('savdopro.activeShopId', '1');
    if (!localStorage.getItem('barakat.lang')) localStorage.setItem('barakat.lang', initialLanguage);
  }, language);

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const requestPath = requestUrl.pathname;
    const method = request.method();
    const json = (body, status = 200) => route.fulfill({
      status,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(body),
    });

    if (!requestPath.startsWith('/api/')) return route.continue();
    if (method === 'POST') state.postPaths.push(requestPath);

    if (requestPath === '/api/license/auth/me') {
      return json({
        userId: 1,
        username: 'demo_owner',
        fullName: 'Demo Owner',
        role: 'ACCOUNT_OWNER',
        accountId: 90001,
        accountName: 'Anonymized Demo Store',
        blocked: false,
        enabledModules: null,
        permissions: ['SAVDOGRAPH:READ', 'SAVDOGRAPH:WRITE', 'SAVDOGRAPH:DECIDE', 'SAVDOGRAPH_LEDGER:READ'],
      });
    }
    if (requestPath === '/api/shops') return json([{ id: 1, name: 'Demo Store', main: true }]);
    if (requestPath === '/api/billing/current') return json({ status: 'ACTIVE', planName: 'Demo' });
    if (requestPath === '/api/savdograph/action-ledger') return json(state.ledger);

    if (requestPath === '/api/savdograph/gross-profit-briefs' && method === 'POST') {
      const body = request.postDataJSON();
      registerBriefEvidence(evidenceStore, body.periodStart, body.periodEnd);
      return json({
        analysisRunId: 501,
        label: 'Daily Gross Profit Brief',
        classification: 'VERIFIED',
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        timezone: 'Asia/Tashkent',
        currency: 'UZS',
        revenueUzs: '5000000.0000',
        cogsUzs: '3750000.0000',
        grossProfitUzs: '1250000.0000',
        grossMarginPercent: '25.0000',
        grossMarginState: 'AVAILABLE',
        completedSaleCount: 12,
        sourceSaleItemCount: 18,
        refundedAmountUzs: '0.0000',
        assumptions: [],
        limitations: ['Gross Profit is not Net Profit.'],
        calculationId: 'DAILY_GROSS_PROFIT_BRIEF',
        calculationVersion: 'B2.0',
        generatedAt: '2026-07-18T12:00:00',
        evidenceIds: BRIEF_EVIDENCE_IDS,
      }, 201);
    }

    if (requestPath === '/api/savdograph/ask' && method === 'POST') {
      const body = request.postDataJSON();
      state.askBodies.push(body);
      const presentation = askPresentationFor(body.locale);
      if (String(body.question).includes('grounding-failure')) {
        return json({
          interactionId: 'ask-demo-grounding-failure',
          model: 'gpt-5.6-terra',
          promptVersion: 'SAVDOGRAPH_COPILOT_V1',
          status: 'GROUNDEDNESS_VALIDATION_FAILED',
          errorCode: 'GROUNDEDNESS_VALIDATION_FAILED',
          language: presentation.language,
          answer: 'REJECTED_PROVIDER_ANSWER_MUST_NEVER_RENDER 9,999,999 UZS',
          classification: null,
          facts: [],
          assumptions: [],
          limitations: [],
          toolsUsed: ['get_daily_gross_profit_brief'],
          evidenceIds: [],
          suggestedNextActions: [],
          providerLatencyMs: 30,
          generatedAt: '2026-07-18T12:01:30',
          rawProviderBody: 'MUST_NOT_RENDER',
          hiddenReasoning: 'MUST_NOT_RENDER',
        });
      }
      const interactionId = `ask-demo-${state.askBodies.length}`;
      const askEvidenceId = 1000 + state.askBodies.length;
      state.askEvidenceIds.push(askEvidenceId);
      registerEvidence(evidenceStore, askEvidenceId, {
        evidenceType: 'GROSS_PROFIT',
        result: '1250000.0000',
        unit: 'money',
        currency: 'UZS',
        periodFrom: body.periodStart,
        periodTo: body.periodEnd,
        calculationId: 'DAILY_GROSS_PROFIT_BRIEF',
        inputs: { interactionId, timezone: 'Asia/Tashkent' },
      });
      return json({
        interactionId,
        model: 'gpt-5.6-terra',
        promptVersion: 'SAVDOGRAPH_COPILOT_V1',
        status: 'ANSWERED',
        language: presentation.language,
        answer: presentation.answer,
        classification: 'VERIFIED',
        facts: [{
          label: presentation.factLabel,
          value: '1250000.0000',
          unit: 'UZS',
          evidence_ids: [askEvidenceId],
          classification: 'VERIFIED',
        }],
        assumptions: [],
        limitations: [presentation.limitation],
        toolsUsed: ['get_daily_gross_profit_brief'],
        evidenceIds: [askEvidenceId],
        suggestedNextActions: [{ type: 'VIEW_EVIDENCE', label: presentation.actionLabel, requires_human_action: true }],
        generatedAt: '2026-07-18T12:01:00',
      });
    }

    const evidenceMatch = requestPath.match(/^\/api\/savdograph\/evidence-items\/(\d+)$/);
    if (evidenceMatch && method === 'GET') {
      const item = evidenceStore.get(Number(evidenceMatch[1]));
      return item ? json(item) : json({ code: 'NOT_FOUND' }, 404);
    }

    if (requestPath === '/api/products' && method === 'GET') {
      return json([{ id: 77, name: 'Demo Sut 1L', barcode: '4780001090001', quantity: 4, unit: 'dona' }]);
    }

    if (requestPath === '/api/savdograph/reorder-simulations' && method === 'POST') {
      const body = request.postDataJSON();
      state.simulationBodies.push(body);
      const fixture = SCENARIO_FIXTURES[Number(body.safetyStockDays)];
      if (!fixture) return json({ code: 'UNSUPPORTED_SYNTHETIC_SCENARIO' }, 422);
      const simulation = buildSimulation(body, fixture, evidenceStore);
      state.simulationsByRun.set(simulation.analysisRunId, simulation);
      return json(simulation, 201);
    }

    if (requestPath === '/api/suppliers' && method === 'GET') {
      return json([{ id: 31, name: 'Demo Supplier' }]);
    }

    const proposalMatch = requestPath.match(/^\/api\/savdograph\/reorder-simulations\/(\d+)\/proposals$/);
    if (proposalMatch && method === 'POST') {
      const analysisRunId = Number(proposalMatch[1]);
      const simulation = state.simulationsByRun.get(analysisRunId);
      const body = request.postDataJSON();
      state.bridgeBodies.push({ analysisRunId, body });
      if (!simulation || Number(simulation.reorderQuantity) <= 0) return json({ code: 'INELIGIBLE_SIMULATION' }, 422);
      const evidenceIds = Object.values(simulation.evidenceIds);
      state.ledger = [{
        id: 801,
        proposalId: 701,
        proposalDecisionId: null,
        actor: 'Demo Owner',
        evidenceReferences: JSON.stringify(evidenceIds),
        eventType: 'PROPOSAL_CREATED_FROM_REORDER_SIMULATION',
        outcome: 'SUCCESS',
        purchaseOrderId: null,
        details: 'Human-review proposal created from the selected deterministic simulation.',
        createdAt: '2026-07-18T12:05:00',
      }];
      return json({
        proposalId: 701,
        proposalStatus: 'PROPOSED',
        sourceKind: 'B2_REORDER_SIMULATION',
        sourceAnalysisRunId: analysisRunId,
        productId: 77,
        productDisplayName: 'Demo Sut 1L',
        supplierId: 31,
        supplierDisplayName: 'Demo Supplier',
        reorderQuantity: simulation.reorderQuantity,
        classification: 'ESTIMATED',
        assumptions: simulation.assumptions,
        risks: simulation.risks,
        limitations: simulation.limitations,
        evidenceIds,
        createdAt: '2026-07-18T12:05:00',
        idempotent: false,
      }, 201);
    }

    if (requestPath === '/api/savdograph/proposals/701/approve' && method === 'POST') {
      const body = request.postDataJSON();
      state.decisionBodies.push({ kind: 'approve', body });
      if (state.draftIds.length === 0) state.draftIds.push(1001);
      state.ledger = [{
        id: 803,
        proposalId: 701,
        proposalDecisionId: 901,
        actor: 'Demo Owner',
        evidenceReferences: JSON.stringify(Object.values(simulationEvidenceIds(300))),
        eventType: 'DRAFT_PURCHASE_ORDER_CREATED',
        outcome: 'SUCCESS',
        purchaseOrderId: 1001,
        details: 'One DRAFT was created; no supplier notification or operational action occurred.',
        createdAt: '2026-07-18T12:06:01',
      }, {
        id: 802,
        proposalId: 701,
        proposalDecisionId: 901,
        actor: 'Demo Owner',
        evidenceReferences: JSON.stringify(Object.values(simulationEvidenceIds(300))),
        eventType: 'PROPOSAL_APPROVED',
        outcome: 'SUCCESS',
        purchaseOrderId: null,
        details: 'Human approval recorded.',
        createdAt: '2026-07-18T12:06:00',
      }, ...state.ledger];
      return json({
        proposalId: 701,
        decision: 'APPROVE',
        proposalStatus: 'DRAFT_CREATED',
        purchaseOrderId: 1001,
        idempotent: false,
        decidedAt: '2026-07-18T12:06:00',
      });
    }

    if (requestPath === '/api/savdograph/proposals/701/reject' && method === 'POST') {
      const body = request.postDataJSON();
      state.decisionBodies.push({ kind: 'reject', body });
      return json({
        proposalId: 701,
        decision: 'REJECT',
        proposalStatus: 'REJECTED',
        purchaseOrderId: null,
        idempotent: false,
        decidedAt: '2026-07-18T12:06:00',
      });
    }

    return json(method === 'GET' ? [] : {});
  });

  return state;
}

async function openWorkspace(page, viewport = JOURNEY_VIEWPORTS[0]) {
  await page.setViewportSize(viewport);
  await page.goto('/savdograph');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByTestId('savdograph-workspace')).toBeVisible();
  await expect(page.locator('a[href="/savdograph"]')).toBeVisible();
}

function assertRuntimeClean(state) {
  expect(state.consoleErrors, 'console errors: ' + state.consoleErrors.join(' | ')).toEqual([]);
  expect(state.pageErrors, 'page errors: ' + state.pageErrors.join(' | ')).toEqual([]);
}

async function assertNoHorizontalOverflow(page, viewport) {
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    offenders: [...document.querySelectorAll('body *')]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.right > document.documentElement.clientWidth + 1 || rect.left < -1)
      .slice(0, 12)
      .map(({ element, rect }) => ({
        tag: element.tagName,
        className: element.className,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      })),
  }));
  const label = viewport.width + 'x' + viewport.height + ': ' + JSON.stringify(geometry);
  expect(geometry.clientWidth).toBe(viewport.width);
  expect(geometry.scrollWidth, label).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(geometry.bodyScrollWidth, label).toBeLessThanOrEqual(geometry.bodyClientWidth + 1);
  return geometry;
}

async function generateBrief(page) {
  await page.locator('#sg-brief-section form button[type=submit]').click();
  await expect(page.locator('[data-result="gross-profit-brief"]')).toContainText('UZS');
}

async function askGroundedQuestion(page, question = "What is today's Gross Profit and which evidence supports it?") {
  const section = page.locator('#sg-ask-section');
  await section.locator('textarea').fill(question);
  await section.locator('form').first().locator('button[type=submit]').click();
  await expect(page.locator('[data-result="ask-store"]')).toBeVisible();
}

async function chooseSyntheticProduct(page) {
  const input = page.locator('#simulation-product-search');
  await input.fill('Demo Sut');
  await input.locator('xpath=ancestor::form').locator('button[type=submit]').click();
  await page.locator('#sg-simulator-section .sg-product-results button').click();
  await expect(page.locator('#sg-simulator-section .sg-selected-product')).toContainText('4780001090001');
}

async function runDecisionTwin(page, state) {
  const before = state.simulationBodies.length;
  await page.locator('#sg-simulator-section .sg-scenario-form button[type=submit]').click();
  await expect.poll(() => state.simulationBodies.length).toBe(before + 3);
  await expect(page.getByTestId('savdograph-decision-twin').locator('.sg-twin-scenario[data-supported="true"]')).toHaveCount(3);

  const bodies = state.simulationBodies.slice(before);
  expect(bodies.map((body) => Number(body.safetyStockDays)).sort((left, right) => left - right)).toEqual([0, 3, 14]);
  for (const body of bodies) {
    expect(body).toMatchObject({ productId: 77, leadTimeDays: 2, forecastHorizonDays: 7 });
    expect(body.lookbackStart).toBe(bodies[0].lookbackStart);
    expect(body.lookbackEnd).toBe(bodies[0].lookbackEnd);
  }

  const results = bodies.map((body) => state.simulationsByRun.get(SCENARIO_FIXTURES[Number(body.safetyStockDays)].analysisRunId));
  const allEvidenceIds = [];
  for (const result of results) {
    const fixture = SCENARIO_FIXTURES[Number(result.safetyStockDays)];
    expect(result).toMatchObject({
      classification: 'ESTIMATED',
      productId: 77,
      productSku: '4780001090001',
      unit: 'dona',
      currentOnHandQuantity: 4,
      netUnitsSold: '11.00',
      velocityUnitsPerDay: '0.37',
      reorderQuantity: fixture.reorderQuantity,
      coverageBeforeDays: '10.91',
      coverageAfterDays: fixture.coverageAfterDays,
      stockoutRisk: fixture.stockoutRisk,
      overstockRisk: fixture.overstockRisk,
      tiedUpCapitalUzs: null,
      calculationId: 'SCENARIO_NET_SALES_REORDER',
      calculationVersion: 'B2.0',
    });
    expect(Object.keys(result.evidenceIds).sort()).toEqual([...SIMULATION_EVIDENCE_FIELDS].sort());
    expect(new Set(Object.values(result.evidenceIds)).size).toBe(11);
    allEvidenceIds.push(...Object.values(result.evidenceIds));
  }
  expect(new Set(results.map((result) => result.analysisRunId)).size).toBe(3);
  expect(new Set(allEvidenceIds).size).toBe(33);
}

async function selectBalancedScenario(page) {
  const twin = page.getByTestId('savdograph-decision-twin');
  const balanced = twin.locator('.sg-twin-balanced');
  await balanced.locator('.sg-twin-select').click();
  await expect(balanced.locator('.sg-twin-select')).toHaveAttribute('aria-pressed', 'true');
}

async function createProposal(page) {
  const section = page.locator('#sg-simulator-section');
  await section.getByRole('combobox').last().selectOption('31');
  await section.locator('.sg-bridge-bar button').click();
  await expect(page.locator('[data-result="proposal-review"]')).toContainText('Demo Supplier');
}

async function approveProposal(page) {
  await page.locator('#sg-proposal-section .sg-decision-actions .btn-green').click();
  const dialog = page.locator('.sg-dialog');
  await expect(dialog).toContainText('PurchaseOrder DRAFT');
  await expect(dialog.locator('.sg-value').nth(1)).toContainText('1');
  await dialog.locator('footer .btn-green').click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#sg-ledger-section')).toContainText('#1001');
}

test.describe.serial('SavdoGraph deterministic mocked release gates', () => {
  test.skip(!MOCK_MODE, 'Set E2E_SAVDOGRAPH_MOCK=1 to run the isolated synthetic suite.');

  test('Judge Mode navigates all seven stages and never submits an API request', async ({ page }) => {
    const state = await installSyntheticBackend(page);
    await openWorkspace(page);
    expect(state.postPaths).toEqual([]);

    await page.getByRole('button', { name: 'Start 90-second guided demo', exact: true }).click();
    await expect(page).toHaveURL(/[?&]judge=1(?:&|$)/);
    const guide = page.getByTestId('savdograph-judge-guide');
    await expect(guide).toBeVisible();
    await expect(guide.locator('.sg-judge-stages > li')).toHaveCount(7);
    await expect(guide.locator('.sg-judge-stages [aria-current="step"]')).toHaveCount(1);

    const stageButtons = guide.locator('.sg-judge-stages button');
    for (let index = 0; index < 7; index += 1) {
      await stageButtons.nth(index).click();
      await expect(stageButtons.nth(index)).toHaveAttribute('aria-current', 'step');
      expect(state.postPaths).toEqual([]);
    }

    const controls = guide.locator('.sg-judge-controls');
    await controls.getByRole('button', { name: /Back/i }).click();
    await expect(stageButtons.nth(5)).toHaveAttribute('aria-current', 'step');
    await controls.getByRole('button', { name: /Next/i }).click();
    await expect(stageButtons.nth(6)).toHaveAttribute('aria-current', 'step');
    expect(state.postPaths).toEqual([]);

    await controls.getByRole('button', { name: 'Exit guided demo', exact: true }).click();
    await expect(guide).toBeHidden();
    await expect(page).not.toHaveURL(/[?&]judge=1(?:&|$)/);

    await page.goto('/savdograph?judge=1');
    await expect(page.getByTestId('savdograph-judge-guide')).toBeVisible();
    expect(state.postPaths).toEqual([]);
    assertRuntimeClean(state);
  });

  test('owner follows evidence to one DRAFT through Proof Graph, Decision Twin, and Policy Shield', async ({ page }) => {
    const state = await installSyntheticBackend(page);
    await openWorkspace(page);

    await expect(page.getByRole('heading', { name: 'SavdoGraph AI', exact: true })).toBeVisible();
    await expect(page.getByTestId('savdograph-workspace')).toContainText('Evidence-first operating system for retail decisions.');
    await expect(page.getByRole('note', { name: 'Demo Data' })).toContainText(/anonymized (?:sample|demo) data/i);
    await expect(page.locator('.sg-locale-switch')).toHaveCount(0);

    await generateBrief(page);
    const briefResult = page.locator('[data-result="gross-profit-brief"]');
    const answerRegion = page.locator('.sg-answer-results');
    const [briefBox, answerBox] = await Promise.all([briefResult.boundingBox(), answerRegion.boundingBox()]);
    expect(briefBox).not.toBeNull();
    expect(answerBox).not.toBeNull();
    expect(briefBox.width).toBeGreaterThanOrEqual(answerBox.width - 2);
    const overflowingFactLinks = await briefResult.locator('.sg-result-facts .sg-value').evaluateAll((cards) => cards.filter((card) => {
      const bounds = card.getBoundingClientRect();
      return [...card.querySelectorAll('.sg-evidence-link')].some((link) => link.getBoundingClientRect().right > bounds.right + 1);
    }).length);
    expect(overflowingFactLinks).toBe(0);
    await expect(briefResult.locator('.sg-value').filter({ hasText: 'Completed sales' })).toContainText('12');
    await expect(briefResult.locator('.sg-value').filter({ hasText: 'Refunded amount' })).toContainText('0 UZS');
    await expect(briefResult.locator('.sg-value').filter({ hasText: 'Source records' })).toContainText('18');
    await expect(briefResult.getByRole('button', { name: /Open evidence 103/i }).first()).toBeVisible();
    await expect(briefResult.getByRole('button', { name: /Open evidence 107/i }).first()).toBeVisible();
    await expect(page.locator('.sg-command-center')).toContainText('1,250,000');
    await expect(page.locator('.sg-command-center')).toContainText('Verified Gross Profit');
    await expect(page.locator('.sg-command-center')).toContainText('0 UZS');
    await expect(page.getByTestId('savdograph-workflow').locator('[data-state="completed"]')).toHaveCount(1);

    await askGroundedQuestion(page);
    await expect(page.locator('[data-result="ask-store"]')).toContainText("Today's Gross Profit is 1,250,000 UZS.");
    expect(state.askBodies.at(-1).locale).toBe('EN');
    expect(state.askEvidenceIds.at(-1)).not.toBe(BRIEF_EVIDENCE_IDS.grossProfit);

    const trace = page.locator('.sg-decision-trace');
    for (const step of ['Question received', 'Deterministic tool selected', 'Immutable evidence loaded', 'Numeric grounding checked', 'Classification preserved', 'Answer released']) {
      await expect(trace).toContainText(step);
    }
    await expect(trace.locator('[data-state="completed"]')).toHaveCount(6);
    await expect(trace).not.toContainText("Today's Gross Profit is 1,250,000 UZS.");

    const graph = page.getByTestId('savdograph-proof-graph');
    await expect(graph).toBeVisible();
    expect(await graph.locator('.sg-proof-node').count()).toBeGreaterThanOrEqual(5);
    await expect(graph).toContainText('Refund evidence');
    await expect(graph).toContainText('Source sales, refunds, and cost snapshots');
    await expect(graph.getByRole('button', { name: /Open evidence #103/i }).first()).toBeVisible();
    await expect(graph.getByRole('button', { name: /Open evidence #107/i }).first()).toBeVisible();
    const graphEvidence = graph.getByRole('button', { name: /Open evidence #105/i }).first();
    await graphEvidence.focus();
    await expect(graphEvidence).toBeFocused();
    await graphEvidence.press('Enter');
    const evidenceDialog = page.getByRole('dialog', { name: /Evidence Viewer/i });
    await expect(evidenceDialog).toContainText('DAILY_GROSS_PROFIT_BRIEF');
    await expect(evidenceDialog).toContainText('Immutable integrity record present');
    await expect(evidenceDialog).not.toContainText(String(BRIEF_EVIDENCE_IDS.grossProfit % 10).repeat(64));
    await page.keyboard.press('Escape');
    await expect(evidenceDialog).toBeHidden();
    await expect(graphEvidence).toBeFocused();

    await chooseSyntheticProduct(page);
    await runDecisionTwin(page, state);
    const twin = page.getByTestId('savdograph-decision-twin');
    await expect(twin).toContainText('No action');
    await expect(twin).toContainText('Balanced coverage');
    await expect(twin).toContainText('High coverage');
    await expect(twin.locator('.sg-twin-current')).toContainText('0 dona');
    await expect(twin.locator('.sg-twin-balanced')).toContainText('1 dona');
    await expect(twin.locator('.sg-twin-high')).toContainText('5 dona');
    await selectBalancedScenario(page);

    const shield = page.getByTestId('savdograph-policy-shield');
    await expect(shield).toContainText(/system policy/i);
    await expect(shield).toContainText(/current run/i);
    await expect(shield).toContainText('Immutable evidence required');
    await expect(shield).toContainText('Human approval required');
    await expect(shield).toContainText('Autonomous spend: 0 UZS');
    await expect(shield).toContainText(/backend contract|database constraint|authorization|append-only ledger/i);

    await createProposal(page);
    expect(state.bridgeBodies).toEqual([{ analysisRunId: 602, body: { supplierId: 31 } }]);
    await expect(page.locator('[data-result="proposal-review"] .sg-value').nth(3)).toContainText('1');
    await expect(page.locator('[data-result="proposal-review"]')).toContainText(/No supplier contacted|Supplier has not been contacted/i);
    await expect(page.locator('[data-result="proposal-review"]')).toContainText(/No payment initiated|Payment has not been initiated/i);
    await expect(page.locator('[data-result="proposal-review"]')).toContainText(/No inventory changed|Inventory has not been changed/i);

    await approveProposal(page);
    expect(state.decisionBodies).toHaveLength(1);
    expect(state.decisionBodies[0].kind).toBe('approve');
    expect(Object.keys(state.decisionBodies[0].body).sort()).toEqual(['idempotencyKey', 'reason']);
    expect(state.draftIds).toEqual([1001]);
    expect([...new Set(state.ledger.map((event) => event.purchaseOrderId).filter(Boolean))]).toEqual([1001]);
    const ledger = page.locator('#sg-ledger-section');
    await expect(ledger).toContainText('Proposal approved by a human');
    await expect(ledger).toContainText('Human approval recorded');
    await expect(ledger).toContainText('PurchaseOrder DRAFT created');
    await expect(ledger).toContainText('One DRAFT recorded');
    await expect(ledger).toContainText('Authorized workspace actor');
    await expect(ledger).toContainText('At most one PurchaseOrder DRAFT was recorded; no supplier, payment, receiving, or inventory action occurred.');
    await expect(ledger).toContainText('#1001');
    await expect(ledger).not.toContainText(/PROPOSAL_APPROVED|DRAFT_PURCHASE_ORDER_CREATED|SUCCESS|Demo Owner/);
    await expect(page.getByTestId('savdograph-proof-graph')).toContainText('PurchaseOrder DRAFT');

    expect(state.simulationBodies).toHaveLength(3);
    expect(state.postPaths.filter((requestPath) => requestPath === '/api/savdograph/reorder-simulations')).toHaveLength(3);
    expect(state.postPaths.filter((requestPath) => /supplier|payment|inventory|receiv|deliver|price/i.test(requestPath))).toEqual([]);
    expect(state.postPaths).toEqual([
      '/api/savdograph/gross-profit-briefs',
      '/api/savdograph/ask',
      '/api/savdograph/reorder-simulations',
      '/api/savdograph/reorder-simulations',
      '/api/savdograph/reorder-simulations',
      '/api/savdograph/reorder-simulations/602/proposals',
      '/api/savdograph/proposals/701/approve',
    ]);

    const workspaceText = await page.getByTestId('savdograph-workspace').innerText();
    expect(workspaceText).not.toMatch(/REJECTED_PROVIDER|MUST_NOT_RENDER|hidden reasoning|raw provider/i);
    expect(workspaceText).not.toMatch(/\\u[0-9a-fA-F]{4}/);
    expect(workspaceText).not.toMatch(/\b(?:Yalpi|Dalil|Savol|Qayta|Tanlash|Tasdiqlash|Joriy|Ssenariy|Buyurtma|Tushunish)\b/i);
    await assertNoHorizontalOverflow(page, JOURNEY_VIEWPORTS[0]);
    assertRuntimeClean(state);
  });

  test('Uzbek Latin owner completes the full evidence-to-DRAFT journey', async ({ page }) => {
    const state = await installSyntheticBackend(page, { language: 'uz' });
    await openWorkspace(page);

    const workspace = page.getByTestId('savdograph-workspace');
    await expect(page.locator('.lang-select')).toHaveValue('uz');
    await expect(workspace).toContainText('Chakana savdo qarorlari uchun dalilga asoslangan operatsion tizim.');
    await expect(page.locator('.sg-locale-switch')).toHaveCount(0);

    await generateBrief(page);
    await expect(page.locator('.sg-command-center')).toContainText('Tasdiqlangan yalpi foyda');
    await expect(page.locator('.sg-command-center')).toContainText(/1(?:,|\s)250(?:,|\s)000 UZS/);

    await askGroundedQuestion(page, 'Bugungi yalpi foyda qancha va bu raqam qaysi dalillarga asoslangan?');
    await expect(page.locator('[data-result="ask-store"]')).toContainText('Bugungi yalpi foyda 1 250 000 UZS.');
    expect(state.askBodies).toHaveLength(1);
    expect(state.askBodies[0].locale).toBe('UZ');
    await expect(page.locator('.sg-decision-trace')).toContainText('Savol qabul qilindi');
    await expect(page.locator('.sg-decision-trace')).toContainText('Deterministik vosita tanlandi');

    await chooseSyntheticProduct(page);
    await runDecisionTwin(page, state);
    const twin = page.getByTestId('savdograph-decision-twin');
    await expect(twin).toContainText('Hech narsa qilmaslik');
    await expect(twin).toContainText('Muvozanatli qamrov');
    await expect(twin).toContainText('Yuqori qamrov');
    await expect(twin.locator('.sg-twin-current')).toContainText('0 dona');
    await expect(twin.locator('.sg-twin-balanced')).toContainText('1 dona');
    await expect(twin.locator('.sg-twin-high')).toContainText('5 dona');
    await selectBalancedScenario(page);
    await expect(twin.locator('.sg-twin-balanced .sg-twin-select')).toHaveAttribute('aria-pressed', 'true');

    await expect(page.getByTestId('savdograph-policy-shield')).toContainText('Siyosat qalqoni');
    await createProposal(page);
    expect(state.bridgeBodies).toEqual([{ analysisRunId: 602, body: { supplierId: 31 } }]);
    await expect(page.locator('[data-result="proposal-review"] .sg-value').nth(3)).toContainText('1');

    await approveProposal(page);
    expect(state.decisionBodies).toHaveLength(1);
    expect(state.decisionBodies[0].kind).toBe('approve');
    expect(state.draftIds).toEqual([1001]);
    expect(state.ledger.filter((event) => event.eventType === 'DRAFT_PURCHASE_ORDER_CREATED')).toHaveLength(1);
    const uzLedger = page.locator('#sg-ledger-section');
    await expect(uzLedger).toContainText('PurchaseOrder DRAFT yaratildi');
    await expect(uzLedger).toContainText('Bitta DRAFT qayd etildi');
    await expect(uzLedger).toContainText('Vakolatli ish maydoni ishtirokchisi');
    await expect(uzLedger).toContainText('#1001');
    await expect(uzLedger).not.toContainText(/PROPOSAL_APPROVED|DRAFT_PURCHASE_ORDER_CREATED|SUCCESS|Demo Owner/);
    await expect(page.getByTestId('savdograph-proof-graph')).toContainText('PurchaseOrder DRAFT');

    expect(state.simulationBodies).toHaveLength(3);
    expect(state.postPaths.filter((requestPath) => requestPath === '/api/savdograph/reorder-simulations')).toHaveLength(3);
    expect(state.postPaths.filter((requestPath) => /supplier|payment|inventory|receiv|deliver|price/i.test(requestPath))).toEqual([]);
    const workspaceText = await workspace.innerText();
    for (const providerText of ['Gross Profit', 'Net Profit is not calculated.', 'Review evidence']) {
      expect(workspaceText).not.toContain(providerText);
    }
    for (const backendText of [
      'Lead time is an owner-visible scenario assumption:',
      'No reserved stock, incoming purchase order, supplier delivery, or cross-unit conversion is claimed.',
      'Tied-up capital is unavailable because current on-hand inventory has no immutable lot-cost provenance.',
    ]) expect(workspaceText).not.toContain(backendText);
    expect(workspaceText).not.toMatch(/\p{Script=Cyrillic}/u);
    expect(workspaceText).not.toMatch(/\\u[0-9a-fA-F]{4}/);
    await assertNoHorizontalOverflow(page, JOURNEY_VIEWPORTS[0]);
    assertRuntimeClean(state);
  });

  test('grounding failure suppresses the rejected answer and stops the trace', async ({ page }) => {
    const state = await installSyntheticBackend(page);
    await openWorkspace(page);
    await askGroundedQuestion(page, 'grounding-failure');

    const result = page.locator('[data-result="ask-store"]');
    await expect(result).toContainText('not sufficiently grounded');
    await expect(result).not.toContainText('REJECTED_PROVIDER_ANSWER_MUST_NEVER_RENDER');
    await expect(result).not.toContainText('9,999,999');
    await expect(result).not.toContainText('MUST_NOT_RENDER');
    await expect(result.locator('.sg-classification')).toHaveCount(0);

    const trace = page.locator('.sg-decision-trace');
    await expect(trace.locator('li').nth(3)).toHaveAttribute('data-state', 'blocked');
    await expect(trace.locator('li').nth(4)).toHaveAttribute('data-state', 'not_started');
    await expect(trace.locator('li').nth(5)).toHaveAttribute('data-state', 'not_started');
    await expect(trace).toContainText('Stopped');
    assertRuntimeClean(state);
  });

  test('global locale is the only source for EN, UZ, UZC, and RU Ask requests and persists', async ({ page }) => {
    const state = await installSyntheticBackend(page);
    await openWorkspace(page);
    const globalLanguage = page.locator('.lang-select');
    await expect(globalLanguage.locator('option')).toHaveText(['O‘zbekcha', 'Ўзбекча', 'Русский', 'English']);
    await expect(page.locator('.sg-locale-switch')).toHaveCount(0);

    for (const code of ['en', 'uz', 'uzc', 'ru']) {
      const expected = LOCALE_EXPECTATIONS[code];
      await globalLanguage.selectOption(code);
      await expect.poll(() => page.evaluate(() => localStorage.getItem('barakat.lang'))).toBe(code);
      await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(expected.documentLanguage);
      await expect(page.getByTestId('savdograph-workspace')).toContainText(expected.marker);

      const previousAskCount = state.askBodies.length;
      const askSection = page.locator('#sg-ask-section');
      await askSection.locator('textarea').fill('locale-check:' + code);
      await askSection.locator('form').first().locator('button[type="submit"]').click();
      await expect.poll(() => state.askBodies.length).toBe(previousAskCount + 1);
      expect(state.askBodies.at(-1).locale).toBe(expected.askLocale);
      const askResult = page.locator('[data-result="ask-store"]');
      await expect(askResult).toContainText(expected.answerMarker);
      if (code !== 'en') {
        await expect(askResult).not.toContainText('Gross Profit');
        await expect(askResult).not.toContainText('Net Profit is not calculated.');
        await expect(askResult).not.toContainText('Review evidence');
      }

      await page.reload();
      await expect(page.getByTestId('savdograph-workspace')).toBeVisible();
      await expect(page.locator('.lang-select')).toHaveValue(code);
    }

    expect(state.askBodies.map((body) => body.locale)).toEqual(['EN', 'UZ', 'UZ', 'RU']);
    assertRuntimeClean(state);
  });

  for (const viewport of JOURNEY_VIEWPORTS) {
    test('has accessible reduced-motion layout with zero overflow at ' + viewport.width + 'x' + viewport.height, async ({ page }) => {
      const state = await installSyntheticBackend(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openWorkspace(page, viewport);

      await expect(page.locator('.app-shell-savdograph')).toBeVisible();
      await expect(page.getByTestId('savdograph-workspace')).toBeVisible();
      await expect(page.locator('.lang-select')).toBeVisible();
      await expect(page.getByRole('note', { name: 'Demo Data' })).toBeVisible();
      const judgeButton = page.getByRole('button', { name: 'Start 90-second guided demo', exact: true });
      await judgeButton.focus();
      await expect(judgeButton).toBeFocused();
      await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
      await assertNoHorizontalOverflow(page, viewport);
      expect(state.postPaths).toEqual([]);
      assertRuntimeClean(state);
    });
  }

  test('captures final submission evidence only behind the explicit capture gate', async ({ page }) => {
    test.skip(!CAPTURE_FINAL_EVIDENCE, 'Set E2E_CAPTURE_SAVDOGRAPH=1 only after all browser gates pass.');
    const state = await installSyntheticBackend(page);
    await openWorkspace(page);
    const screenshotDirectory = CAPTURE_OUTPUT_DIR
      ? path.resolve(CAPTURE_OUTPUT_DIR)
      : path.resolve(process.cwd(), '../docs/build-week/screenshots/b5.1');
    const screenshotPath = (name) => path.join(screenshotDirectory, name);

    await generateBrief(page);
    await askGroundedQuestion(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: screenshotPath('01-owner-workspace-1440x900.png') });
    const briefResult = page.locator('[data-result="gross-profit-brief"]');
    await briefResult.evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, top - 80));
    });
    await briefResult.screenshot({ path: screenshotPath('02-gross-profit-brief.png') });

    const askEvidenceId = state.askEvidenceIds.at(-1);
    expect(askEvidenceId).not.toBe(BRIEF_EVIDENCE_IDS.grossProfit);
    const askEvidence = page.locator('[data-result="ask-store"]').getByRole('button', { name: new RegExp(`Open evidence ${askEvidenceId}`) }).first();
    await askEvidence.click();
    await expect(page.getByRole('dialog', { name: /Evidence Viewer/i })).toBeVisible();
    await page.screenshot({ path: screenshotPath('03-ask-store-with-evidence.png') });
    await page.keyboard.press('Escape');
    await expect(askEvidence).toBeFocused();

    await chooseSyntheticProduct(page);
    await runDecisionTwin(page, state);
    await selectBalancedScenario(page);
    await page.locator('#sg-simulator-section').evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, top - 80));
    });
    await page.screenshot({ path: screenshotPath('04-reorder-simulation.png') });

    await createProposal(page);
    await page.locator('#sg-proposal-section').screenshot({ path: screenshotPath('05-pending-proposal.png') });
    await page.locator('#sg-proposal-section .sg-decision-actions .btn-green').click();
    const dialog = page.locator('.sg-dialog');
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: screenshotPath('06-approval-confirmation.png') });
    await dialog.locator('footer .btn-green').click();
    await expect(dialog).toBeHidden();
    await page.locator('#sg-ledger-section').screenshot({ path: screenshotPath('07-action-ledger.png') });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(
      () => page.locator('.sidebar').evaluate((element) => Math.ceil(element.getBoundingClientRect().right)),
      { timeout: 2_000 },
    ).toBeLessThanOrEqual(1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await assertNoHorizontalOverflow(page, { width: 390, height: 844 });
    await page.screenshot({ path: screenshotPath('08-mobile-workspace-390x844.png') });
    assertRuntimeClean(state);
  });
});
