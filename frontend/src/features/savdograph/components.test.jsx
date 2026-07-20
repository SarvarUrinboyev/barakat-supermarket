import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  AskResult,
  BriefResult,
  ClassificationBadge,
  DecisionDialog,
  DemoDataBanner,
  EvidenceDrawer,
  EvidenceLinks,
  LedgerTimeline,
  ProposalCard,
  SimulationResult,
  SupplierBridgeControls,
} from './components.jsx';
import {
  DecisionCommandHeader,
  DecisionTrace,
  DecisionTwin,
  InteractiveProofGraph,
  JudgeModeGuide,
  PolicyShield,
  TrustStrip,
  WorkflowRail,
} from './experience.jsx';
import { isLinkedGrossProfitBrief } from '../../pages/SavdoGraph.jsx';

const render = (node) => renderToStaticMarkup(node);

const groundedAskResponse = (overrides = {}) => ({
  status: 'ANSWERED',
  classification: 'VERIFIED',
  answer: 'Evidence-backed answer',
  toolsUsed: ['get_daily_gross_profit_brief'],
  evidenceIds: [71],
  ...overrides,
});

describe('SavdoGraph demo environment labeling', () => {
  it('renders a stable named note when demo mode is explicitly enabled', () => {
    const html = render(<DemoDataBanner enabled locale="EN" />);
    expect(html).toContain('role="note"');
    expect(html).toContain('aria-label="Demo Data"');
    expect(html).toContain('anonymized demo data');
  });

  it('renders no demo label when demo mode is explicitly disabled', () => {
    expect(render(<DemoDataBanner enabled={false} locale="EN" />)).toBe('');
  });
});

describe('SavdoGraph result rendering', () => {
  const linkedBrief = {
    analysisRunId: 71,
    classification: 'VERIFIED',
    periodStart: '2026-07-20',
    periodEnd: '2026-07-21',
    timezone: 'Asia/Tashkent',
    evidenceIds: { periodTimezone: 81 },
  };

  it('accepts a Gross Profit Brief only when it is linked to the exact submitted request', () => {
    const submittedPeriod = { periodStart: '2026-07-20', periodEnd: '2026-07-21' };
    expect(isLinkedGrossProfitBrief(linkedBrief, submittedPeriod)).toBe(true);

    for (const response of [
      { ...linkedBrief, periodStart: '2026-07-19' },
      { ...linkedBrief, periodEnd: '2026-07-22' },
      { ...linkedBrief, timezone: 'UTC' },
      { ...linkedBrief, analysisRunId: 0 },
      { ...linkedBrief, analysisRunId: '71' },
      { ...linkedBrief, classification: 'FUTURE_CLASSIFICATION' },
      { ...linkedBrief, evidenceIds: {} },
      { ...linkedBrief, evidenceIds: { periodTimezone: 0 } },
      { ...linkedBrief, evidenceIds: { periodTimezone: '81' } },
    ]) expect(isLinkedGrossProfitBrief(response, submittedPeriod)).toBe(false);
  });

  it('clears a prior Gross Profit Brief before issuing the next request', () => {
    const source = readFileSync(new URL('../../pages/SavdoGraph.jsx', import.meta.url), 'utf8');
    const handler = source.slice(source.indexOf('async function generateBrief'), source.indexOf('async function askStore'));
    expect(handler.indexOf('setBrief(null)')).toBeGreaterThan(-1);
    expect(handler.indexOf('setBrief(null)')).toBeLessThan(handler.indexOf('await SavdoGraphApi.createGrossProfitBrief'));
  });

  it('renders VERIFIED brief values exactly as returned by the backend', () => {
    const html = render(<BriefResult locale="EN" brief={{ classification: 'VERIFIED', timezone: 'Asia/Tashkent', currency: 'UZS', revenueUzs: '123.4500', cogsUzs: '20.1000', grossProfitUzs: '103.3500', grossMarginPercent: '83.718', completedSaleCount: 4, sourceSaleItemCount: 7, refundedAmountUzs: '0.2500', evidenceIds: { revenue: 1, cogs: 2, grossProfit: 9, grossMargin: 3, sourceRecordCounts: 4, refundedRevenue: 5 } }} />);
    expect(html).toContain('123.45 UZS');
    expect(html).toContain('103.35 UZS');
  });

  it('never relabels Gross Profit as Net Profit', () => {
    const html = render(<BriefResult locale="EN" brief={{ classification: 'VERIFIED', grossProfitUzs: '4', evidenceIds: [1] }} />);
    expect(html).toContain('Gross Profit');
    expect(html).not.toContain('Net Profit');
  });

  it('renders ESTIMATED assumptions visibly', () => {
    const html = render(<BriefResult locale="EN" brief={{ classification: 'ESTIMATED', assumptions: ['Revenue is the as-of snapshot totalUzs minus refundedTotalUzs.'], evidenceIds: [1] }} />);
    expect(html).toContain('Assumptions');
    expect(html).toContain('Revenue is the saved totalUzs minus refundedTotalUzs as of the brief.');
  });

  it('does not render a missing brief number as zero', () => {
    const html = render(<BriefResult locale="EN" brief={{ classification: 'INSUFFICIENT_DATA', revenueUzs: null, evidenceIds: [] }} />);
    expect(html).toContain('Not available');
    expect(html).not.toContain('>0 UZS<');
  });

  it('fails closed for every Brief business number without its exact named evidence', () => {
    const hiddenValues = ['991001', '991002', '991003', '991004', '991005', '991006', '991007'];
    const html = render(<BriefResult locale="EN" brief={{
      classification: 'VERIFIED',
      currency: 'UZS',
      revenueUzs: hiddenValues[0],
      cogsUzs: hiddenValues[1],
      grossProfitUzs: hiddenValues[2],
      grossMarginPercent: hiddenValues[3],
      completedSaleCount: Number(hiddenValues[4]),
      refundedAmountUzs: hiddenValues[5],
      sourceSaleItemCount: Number(hiddenValues[6]),
      evidenceIds: { periodTimezone: 81, classification: 82 },
    }} />);
    const renderedDigits = html.replace(/\D/g, '');
    for (const value of hiddenValues) expect(renderedDigits).not.toContain(value);
    expect(html).toContain('Not available');
  });

  it('does not default or expose Gross Profit currency and timezone when they are absent', () => {
    const html = render(<BriefResult locale="EN" brief={{
      classification: 'VERIFIED',
      grossProfitUzs: '88776655',
      currency: null,
      timezone: null,
      evidenceIds: { grossProfit: 91 },
    }} />);
    expect(html.replace(/\D/g, '')).not.toContain('88776655');
    expect(html).not.toContain('UZS');
    expect(html).not.toContain('Asia/Tashkent');
    expect(html).toContain('Not available');
  });

  it('fails every UZS monetary field closed for a non-canonical Brief currency', () => {
    const hiddenValues = ['91827364', '82736455', '73645546', '64554637'];
    const html = render(<BriefResult locale="EN" brief={{
      classification: 'VERIFIED',
      currency: 'USD',
      revenueUzs: hiddenValues[0],
      cogsUzs: hiddenValues[1],
      grossProfitUzs: hiddenValues[2],
      refundedAmountUzs: hiddenValues[3],
      evidenceIds: { revenue: 1, cogs: 2, grossProfit: 3, refundedRevenue: 4 },
    }} />);
    const renderedDigits = html.replace(/\D/g, '');
    for (const value of hiddenValues) expect(renderedDigits).not.toContain(value);
    expect(html).not.toContain('USD');
  });

  it('requires canonical timezone plus named period evidence for Brief dates and timezone', () => {
    const base = {
      classification: 'VERIFIED',
      currency: 'UZS',
      timezone: 'Asia/Tashkent',
      periodStart: '2099-11-29',
      periodEnd: '2099-11-30',
      generatedAt: '2099-11-29T12:00:00',
    };
    const missingEvidence = render(<BriefResult locale="EN" brief={{ ...base, evidenceIds: {} }} />);
    const wrongTimezone = render(<BriefResult locale="EN" brief={{ ...base, timezone: 'Europe/London', evidenceIds: { periodTimezone: 93 } }} />);
    const valid = render(<BriefResult locale="EN" brief={{ ...base, evidenceIds: { periodTimezone: 94 } }} />);
    expect(missingEvidence).not.toMatch(/Asia\/Tashkent|2099/);
    expect(wrongTimezone).not.toMatch(/Europe\/London|2099/);
    expect(valid).toContain('Asia/Tashkent');
    expect(valid).toContain('2099-11-29 → 2099-11-30');
  });

  it('localizes approved Brief narratives and filters unknown backend prose', () => {
    const html = render(<BriefResult locale="RU" brief={{
      classification: 'ESTIMATED',
      currency: 'UZS',
      grossProfitUzs: '10',
      evidenceIds: { grossProfit: 92 },
      assumptions: [
        'Sale date is start-inclusive and end-exclusive in Asia/Tashkent.',
        'RAW BRIEF ASSUMPTION 445566',
      ],
      limitations: [
        'A refunded quantity is outside its sold quantity; COGS cannot be trusted.',
        'RAW BRIEF LIMITATION 778899',
      ],
    }} />);
    expect(html).toContain('Дата продажи включает начало');
    expect(html).toContain('COGS нельзя считать надёжным');
    expect(html).not.toMatch(/Sale date is start-inclusive|A refunded quantity|RAW BRIEF|445566|778899/);
    expect(html).not.toContain('Недоступно в подтверждённом контракте отчёта');
  });
  it('classification is not color-only', () => {
    const html = render(<ClassificationBadge classification="ESTIMATED" locale="EN" />);
    expect(html).toContain('Estimated');
    expect(html).toContain('~');
    expect(html).toContain('server-side assumptions');
  });

  it('renders Uzbek, Russian and English typed answers as text', () => {
    expect(render(<AskResult locale="UZ" response={groundedAskResponse({ answer: 'Yalpi foyda' })} />)).toContain('Yalpi foyda');
    expect(render(<AskResult locale="RU" response={groundedAskResponse({ answer: '\u0412\u0430\u043b\u043e\u0432\u0430\u044f \u043f\u0440\u0438\u0431\u044b\u043b\u044c' })} />)).toContain('\u0412\u0430\u043b\u043e\u0432\u0430\u044f \u043f\u0440\u0438\u0431\u044b\u043b\u044c');
    expect(render(<AskResult locale="EN" response={groundedAskResponse({ answer: 'Gross profit' })} />)).toContain('Gross profit');
  });

  it('escapes untrusted answer text instead of injecting script', () => {
    const html = render(<AskResult locale="EN" response={groundedAskResponse({ answer: '<script>steal()</script>' })} />);
    expect(html).toContain('&lt;script&gt;steal()&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('does not render hidden reasoning or raw provider protocol fields', () => {
    const html = render(<AskResult locale="EN" response={groundedAskResponse({ answer: 'Safe', hiddenReasoning: 'PRIVATE_CHAIN', rawProviderResponse: 'RAW_PROTOCOL' })} />);
    expect(html).not.toContain('PRIVATE_CHAIN');
    expect(html).not.toContain('RAW_PROTOCOL');
  });

  it('preserves fact-level evidence links', () => {
    const html = render(<AskResult locale="EN" response={groundedAskResponse({ answer: 'Revenue is 44 UZS.', facts: [{ label: 'Revenue', value: '44', unit: 'UZS', classification: 'VERIFIED', evidence_ids: [71] }] })} />);
    expect(html).toContain('Evidence #71');
    expect(html).toContain('Open evidence 71');
  });

  it.each([
    ['tool provenance', { toolsUsed: [] }],
    ['only non-empty tool names', { toolsUsed: ['get_daily_gross_profit_brief', ''] }],
    ['positive response evidence', { evidenceIds: [0, -3, 'invalid'] }],
    ['a classification', { classification: null }],
    ['a supported classification', { classification: 'RAW_CLASSIFICATION' }],
  ])('fails closed when ANSWERED is missing %s', (_condition, invalid) => {
    const html = render(<AskResult locale="EN" response={groundedAskResponse({
      ...invalid,
      answer: 'REJECTED_987654 UZS',
      facts: [{ label: 'Revenue 987654', value: '987654', unit: 'UZS', classification: 'VERIFIED', evidence_ids: [71] }],
      assumptions: ['Assume 987654'],
      limitations: ['Limit 987654'],
      suggestedNextActions: [{ label: 'Order 987654' }],
      interactionId: 'safe-interaction',
      model: 'safe-model',
      promptVersion: 'safe-prompt',
    })} />);
    expect(html).toContain('not sufficiently grounded');
    expect(html).toContain('sg-status-groundedness_validation_failed');
    expect(html).not.toMatch(/REJECTED|987654|Revenue 987654|Assume 987654|Limit 987654|Order 987654/);
    expect(html).not.toContain('sg-result-evidence');
    expect(html).not.toContain('Evidence #71');
    expect(html).not.toContain('sg-classification');
    expect(html).toContain('safe-interaction');
    expect(html).toContain('safe-model');
    expect(html).toContain('safe-prompt');
  });

  it('fails closed when a numeric fact has no positive fact-level evidence', () => {
    const html = render(<AskResult locale="EN" response={groundedAskResponse({
      answer: 'REJECTED_FACT_765432 UZS',
      facts: [{ label: 'Gross Profit', value: '765432', unit: 'UZS', classification: 'VERIFIED', evidence_ids: [0, -1] }],
      assumptions: ['Rejected assumption 765432'],
      suggestedNextActions: [{ label: 'Rejected action 765432' }],
      interactionId: 'safe-interaction',
    })} />);
    expect(html).toContain('not sufficiently grounded');
    expect(html).not.toMatch(/REJECTED_FACT|765432|Rejected assumption|Rejected action/);
    expect(html).not.toContain('sg-result-evidence');
    expect(html).not.toContain('Evidence #71');
    expect(html).toContain('safe-interaction');
  });

  it('fails closed when a narrative fact has no fact-level evidence', () => {
    const html = render(<AskResult locale="EN" response={groundedAskResponse({
      answer: 'REJECTED_NARRATIVE_ANSWER',
      facts: [{ label: 'Narrative fact', value: 'Stock coverage is described qualitatively.', classification: 'VERIFIED', evidence_ids: [] }],
      interactionId: 'safe-interaction',
    })} />);
    expect(html).toContain('not sufficiently grounded');
    expect(html).not.toMatch(/REJECTED_NARRATIVE_ANSWER|Stock coverage is described qualitatively|Narrative fact/);
    expect(html).not.toContain('sg-result-evidence');
    expect(html).toContain('safe-interaction');
  });
  it('shows clarification control only for the clarification result', () => {
    const clarification = <button type="button">Explicit candidate</button>;
    const html = render(<AskResult locale="EN" response={{ status: 'NEEDS_CLARIFICATION', classification: 'INSUFFICIENT_DATA', answer: 'Which tea?' }} clarificationControl={clarification} />);
    expect(html).toContain('Which tea?');
    expect(html).toContain('Explicit candidate');
  });

  it('renders a provider-unavailable response with null classification and no badge', () => {
    const html = render(<AskResult locale="UZ" response={{ status: 'PROVIDER_UNAVAILABLE', classification: null, answer: 'Safe backend message' }} />);
    expect(html).toContain('AI provayder hozir mavjud emas');
    expect(html).toContain('Safe backend message');
    expect(html).not.toContain('sg-classification');
  });

  it('suppresses an untrusted answer when groundedness validation fails', () => {
    const html = render(<AskResult locale="UZ" response={{ status: 'GROUNDEDNESS_VALIDATION_FAILED', classification: null, answer: 'UNTRUSTED 999999 UZS' }} />);
    expect(html).toContain('Javob dalillar bilan yetarlicha bog');
    expect(html).not.toContain('UNTRUSTED');
    expect(html).not.toContain('999999');
    expect(html).not.toContain('sg-classification');
  });

  it('renders no classification badge when classification is null', () => {
    expect(render(<ClassificationBadge classification={null} locale="EN" />)).toBe('');
  });

  it('renders intended symbols instead of literal Unicode escape text', () => {
    const html = [
      render(<EvidenceLinks evidenceIds={[1]} locale="EN" />),
      render(<BriefResult locale="EN" brief={null} />),
      render(<AskResult locale="EN" response={null} />),
      render(<SimulationResult locale="EN" simulation={null} />),
      render(<ProposalCard locale="EN" proposal={null} />),
      render(<LedgerTimeline locale="EN" events={[]} />),
    ].join('');
    for (const symbol of ['⧉', '◌', '✶', '↺', '⊙', '◷']) expect(html).toContain(symbol);
    expect(html).not.toMatch(/\\u[0-9a-fA-F]{4}/);
  });

  it('contains no raw Unicode escape sequences in SavdoGraph JSX text nodes', () => {
    const source = [
      readFileSync(new URL('./components.jsx', import.meta.url), 'utf8'),
      readFileSync(new URL('./experience.jsx', import.meta.url), 'utf8'),
      readFileSync(new URL('../../pages/SavdoGraph.jsx', import.meta.url), 'utf8'),
    ].join('\n');
    expect(source).not.toMatch(/>[^<{]*\\u[0-9a-fA-F]{4}[^<{]*</);
  });

  it('renders simulation backend values without a proposal side effect', () => {
    const html = render(<SimulationResult locale="EN" productName="Tea" simulation={{ classification: 'ESTIMATED', productSku: 'T-1', currentOnHandQuantity: 3, reorderQuantity: 9, assumptions: ['Velocity assumption'], evidenceIds: [2] }} />);
    expect(html).toContain('Tea');
    expect(html).toContain('9');
    expect(html).toContain('Before');
    expect(html).toContain('After');
    expect(html).toContain('Human review required');
    expect(html).toContain('No supplier contacted');
    expect(html).toContain('No payment initiated');
    expect(html).toContain('No inventory changed');
    expect(html).not.toContain('Create review proposal');
  });

  it('leaves unavailable tied-up capital unavailable', () => {
    const html = render(<SimulationResult locale="EN" simulation={{ classification: 'ESTIMATED', tiedUpCapitalUzs: null, evidenceIds: [2] }} />);
    expect(html).toContain('Tied-up capital');
    expect(html).toContain('Not available');
  });
  it('never echoes raw simulation enums or English narrative sentinels in Uzbek', () => {
    const html = render(<SimulationResult locale="UZ" simulation={{
      classification: 'ESTIMATED',
      stockoutRisk: 'RAW_STOCKOUT_ENUM',
      overstockRisk: 'RAW_OVERSTOCK_ENUM',
      assumptions: ['RAW ENGLISH ASSUMPTION'],
      risks: ['NO_OBSERVED_SALES_IN_LOOKBACK', 'RAW ENGLISH RISK'],
      limitations: ['RAW ENGLISH LIMITATION'],
      evidenceIds: { stockoutRisk: 51, overstockRisk: 52, classification: 53 },
    }} />);
    expect(html).not.toMatch(/RAW_STOCKOUT_ENUM|RAW_OVERSTOCK_ENUM|NO_OBSERVED_SALES_IN_LOOKBACK|RAW ENGLISH/);
    expect(html).toContain('Tanlangan kuzatuv davrida savdo kuzatilmadi');
    expect(html).toContain('Mavjud emas');
  });
  it('keeps supplier selection disabled only while suppliers are loading', () => {
    const loading = render(<SupplierBridgeControls locale="EN" supplierLoading onSupplierChange={() => {}} />);
    expect(loading).toMatch(/<select[^>]*disabled=""/);

    const loaded = render(<SupplierBridgeControls locale="EN" suppliers={[{ id: 31, name: 'Demo Supplier' }]} onSupplierChange={() => {}} />);
    expect(loaded).toContain('Demo Supplier');
    expect(loaded).not.toMatch(/<select[^>]*disabled=""/);

    const empty = render(<SupplierBridgeControls locale="EN" suppliers={[]} onSupplierChange={() => {}} />);
    expect(empty).not.toMatch(/<select[^>]*disabled=""/);
  });

  it('enables proposal creation only after a valid supplier is selected', () => {
    const missing = render(<SupplierBridgeControls locale="EN" supplierId="" onSupplierChange={() => {}} />);
    expect(missing).toMatch(/<button[^>]*disabled=""[^>]*>Create review proposal/);

    const selected = render(<SupplierBridgeControls locale="EN" supplierId="31" onSupplierChange={() => {}} />);
    expect(selected).not.toMatch(/<button[^>]*disabled=""[^>]*>Create review proposal/);
  });
});

describe('winner UX contract', () => {
  it('shows backend-returned verified Gross Profit and a deduplicated immutable evidence count', () => {
    const html = render(<DecisionCommandHeader
      locale="EN"
      periodStart="2026-07-20"
      periodEnd="2026-07-21"
      brief={{ classification: 'VERIFIED', grossProfitUzs: '1250000.0000', currency: 'UZS', evidenceIds: { grossProfit: 71 } }}
      askResponse={{ evidenceIds: [71, 72], facts: [{ evidence_ids: [72] }] }}
      proposal={{ proposalStatus: 'PROPOSED', evidenceIds: [73] }}
      ledger={[]}
    />);
    expect(html).toContain('1,250,000 UZS');
    expect(html).toContain('Verified Gross Profit');
    expect(html).toContain('>3<');
    expect(html).toContain('0 UZS');
    expect(html).toContain('Human approval');
    expect(html).not.toMatch(/Net Profit|Net Income|Final Profit/);
  });

  it('labels demo placeholders and never invents a missing financial result', () => {
    const html = render(<DecisionCommandHeader locale="EN" demoMode periodStart="2026-07-20" periodEnd="2026-07-21" />);
    expect(html).toContain('Demo placeholder');
    expect(html).toContain('Awaiting verified brief');
    expect(html).not.toMatch(/[1-9][0-9,.]* UZS/);
  });

  it('renders the exact four trust concepts', () => {
    const html = render(<TrustStrip locale="EN" />);
    for (const concept of ['Immutable evidence', 'Deterministic calculations', 'Human approval required', 'Zero autonomous spend']) {
      expect(html).toContain(concept);
    }
  });

  it('renders the six-stage public decision trace without provider or reasoning payloads', () => {
    const html = render(<DecisionTrace locale="EN" response={{
      interactionId: 'interaction-demo',
      status: 'ANSWERED',
      classification: 'VERIFIED',
      toolsUsed: ['get_daily_gross_profit_brief'],
      evidenceIds: [71],
      answer: 'DO_NOT_COPY_ANSWER',
      rawProviderResponse: 'DO_NOT_RENDER_RAW',
      hiddenReasoning: 'DO_NOT_RENDER_REASONING',
    }} />);
    for (const step of ['Question received', 'Deterministic tool selected', 'Immutable evidence loaded', 'Numeric grounding checked', 'Classification preserved', 'Answer released']) {
      expect(html).toContain(step);
    }
    expect(html).not.toMatch(/DO_NOT_COPY_ANSWER|DO_NOT_RENDER_RAW|DO_NOT_RENDER_REASONING/);
  });

  it('judge mode is inert until explicitly active and exposes seven safe navigation stages', () => {
    expect(render(<JudgeModeGuide active={false} locale="EN" />)).toBe('');
    const html = render(<JudgeModeGuide active locale="EN" currentStage={2} />);
    for (const stage of [
      'Understand the verified Gross Profit',
      'Ask the store and inspect proof',
      'Compare possible inventory futures',
      'Review policy safeguards',
      'Create a human-review proposal',
      'Approve only to one DRAFT',
      'Inspect the immutable ledger',
    ]) expect(html).toContain(stage);
    expect(html).toContain('Back');
    expect(html).toContain('Next');
    expect(html).toContain('Exit guided demo');
    expect((html.match(/data-state=/g) || [])).toHaveLength(7);
  });

  it('removes route-local language controls and derives locale from Settings', () => {
    const source = readFileSync(new URL('../../pages/SavdoGraph.jsx', import.meta.url), 'utf8');
    expect(source).toContain('savdoGraphLocaleFromLanguage(lang)');
    expect(source).toContain('askLocaleFromLanguage(lang)');
    expect(source).not.toMatch(/sg-locale-switch|setLocale|setAskLocale|ASK_LOCALES|WORKSPACE_LOCALES/);
  });
});
describe('SavdoGraph human review and immutable history', () => {
  const proposal = { proposalId: 41, proposalStatus: 'PROPOSED', productDisplayName: 'Tea', supplierDisplayName: 'Supplier A', reorderQuantity: 6, classification: 'ESTIMATED', evidenceIds: [9], assumptions: ['Seven-day horizon'], risks: ['Demand can change'] };

  it('hides decision controls without owner authority', () => {
    const html = render(<ProposalCard locale="EN" proposal={proposal} canDecide={false} />);
    expect(html).not.toContain('Approve proposal');
    expect(html).not.toContain('Reject proposal');
  });

  it('shows explicit approve and reject controls with authority', () => {
    const html = render(<ProposalCard locale="EN" proposal={proposal} canDecide />);
    expect(html).toContain('Approve proposal');
    expect(html).toContain('Reject proposal');
  });

  it('never echoes raw proposal simulation narratives in Russian', () => {
    const html = render(<ProposalCard locale="RU" proposal={{
      ...proposal,
      assumptions: ['RAW ENGLISH ASSUMPTION'],
      risks: ['ESTIMATED_STOCKOUT_BEFORE_LEAD_TIME', 'RAW ENGLISH RISK'],
      limitations: ['RAW ENGLISH LIMITATION'],
    }} />);
    expect(html).not.toMatch(/RAW ENGLISH ASSUMPTION|RAW ENGLISH RISK|RAW ENGLISH LIMITATION|ESTIMATED_STOCKOUT_BEFORE_LEAD_TIME/);
    expect(html).toContain('Оценочно запас закончится до истечения срока поставки');
    expect(html).toContain('Недоступно');
  });
  it('decision dialog is an accessible modal with exact SKU, quantity/unit, and DRAFT-only warning', () => {
    const html = render(<DecisionDialog open kind="approve" proposal={{ ...proposal, productSku: 'SKU-TEA', unit: 'pcs', risks: ['NO_SCENARIO_OVERSTOCK'] }} locale="EN" pending={false} error="" reason="" onReasonChange={() => {}} onClose={() => {}} onConfirm={() => {}} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('SKU-TEA');
    expect(html).toContain('6 pcs');
    expect(html).toContain('No scenario overstock detected');
    expect(html).not.toContain('NO_SCENARIO_OVERSTOCK');
    expect(html).toContain('at most one PurchaseOrder DRAFT');
    expect(html).toContain('does not order, pay, receive, deliver, or notify the supplier');
  });

  it('pending decision disables duplicate confirmation submits', () => {
    const html = render(<DecisionDialog open kind="reject" proposal={proposal} locale="EN" pending error="" reason="" onReasonChange={() => {}} onClose={() => {}} onConfirm={() => {}} />);
    expect(html).toContain('disabled=""');
    expect(html).toContain('Submitting');
  });

  it('immutable ledger presents only localized safe fields with exact references', () => {
    const html = render(<LedgerTimeline locale="EN" events={[{
      id: 1,
      proposalId: 41,
      purchaseOrderId: 51,
      actor: 'RAW_ACTOR tenant=99',
      eventType: 'PROPOSAL_APPROVED',
      outcome: 'RAW_OUTCOME',
      details: 'RAW_DETAIL supplierId=81',
      evidenceReferences: '[9]',
      createdAt: '2026-07-18T12:00:00',
    }]} />);
    expect(html).not.toMatch(/PROPOSAL_APPROVED|RAW_ACTOR|RAW_OUTCOME|RAW_DETAIL|supplierId|tenant=99/);
    expect(html).toContain('Proposal approved');
    expect(html).toContain('Proposal:');
    expect(html).toContain('#41');
    expect(html).toContain('PurchaseOrder DRAFT:');
    expect(html).toContain('#51');
    expect(html).toContain('Evidence #9');
    expect(html).not.toMatch(/>Edit<|>Delete</);
  });

  it('unknown ledger payload fails closed without echoing backend values', () => {
    const html = render(<LedgerTimeline locale="RU" events={[{
      id: 2,
      eventType: 'RAW_UNKNOWN_EVENT',
      outcome: 'RAW_UNKNOWN_OUTCOME',
      actor: 'RAW_UNKNOWN_ACTOR',
      details: 'RAW_UNKNOWN_DETAIL phone=555',
    }]} />);
    expect(html).not.toMatch(/RAW_UNKNOWN|phone=555/);
    expect(html).toContain('Записанное событие решения');
    expect(html).toContain('исходные детали скрыты');
  });

  it('evidence viewer exposes safe fields and an integrity status', () => {
    const html = render(<EvidenceDrawer open locale="EN" loading={false} error="" evidence={{ id: 9, evidenceType: 'GROSS_PROFIT', calculationId: 'gp', calculationVersion: '1', periodFrom: '2026-07-17', periodTo: '2026-07-18', calculatedResult: '44.20', unit: 'UZS', contentHash: 'hash-present', inputData: '{"lookbackDays":7,"shopId":99}' }} onClose={() => {}} />);
    expect(html).toContain('Evidence ID');
    expect(html).toContain('Immutable integrity record present');
    expect(html).toContain('lookbackDays');
    expect(html).not.toContain('shopId');
  });

  it('evidence and decision overlays include named close controls', () => {
    const html = render(<EvidenceDrawer open locale="EN" loading evidence={null} error="" onClose={() => {}} />);
    expect(html).toContain('aria-label="Close"');
  });
  it('locks body scrolling and restores the exact previous inline overflow value', () => {
    const source = readFileSync(new URL('./components.jsx', import.meta.url), 'utf8');
    expect(source).toContain('const previousBodyOverflow = document.body.style.overflow;');
    expect(source).toContain("document.body.style.overflow = 'hidden';");
    expect(source).toContain('document.body.style.overflow = previousBodyOverflow;');
  });
});

function findReactElements(value, predicate, found = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => findReactElements(item, predicate, found));
    return found;
  }
  if (!React.isValidElement(value)) return found;
  if (predicate(value)) found.push(value);
  findReactElements(value.props?.children, predicate, found);
  return found;
}

const hasClass = (element, className) => String(element.props?.className || '').split(/\s+/).includes(className);

describe('SavdoGraph decision operating system interactions', () => {
  const scenario = (analysisRunId, reorderQuantity, overrides = {}) => ({
    scenarioId: analysisRunId,
    scenarioKey: overrides.scenarioKey,
    scenarioType: overrides.scenarioType,
    simulation: {
      analysisRunId,
      classification: 'ESTIMATED',
      currentOnHandQuantity: 3,
      reorderQuantity,
      coverageBeforeDays: '3.0000',
      coverageAfterDays: '12.0000',
      velocityUnitsPerDay: '1.0000',
      stockoutRisk: 'LOW',
      overstockRisk: 'LOW',
      unit: 'pcs',
      evidenceIds: {
        currentOnHandQuantity: analysisRunId * 10 + 1,
        reorderQuantity: analysisRunId * 10 + 2,
        coverageBeforeDays: analysisRunId * 10 + 3,
        coverageAfterDays: analysisRunId * 10 + 4,
        velocityUnitsPerDay: analysisRunId * 10 + 5,
      },
      assumptions: ['Server bounded horizon'],
      limitations: ['Future demand can change'],
    },
  });

  it('renders four command cards and invokes only the explicit Judge Mode CTA', () => {
    let starts = 0;
    const props = {
      locale: 'EN',
      brief: { classification: 'VERIFIED', grossProfitUzs: '44.20', currency: 'UZS', evidenceIds: { grossProfit: 7 } },
      periodStart: '2026-07-20',
      periodEnd: '2026-07-21',
      onStartJudge: () => { starts += 1; },
    };
    const html = render(<DecisionCommandHeader {...props} />);
    expect((html.match(/sg-command-card/g) || [])).toHaveLength(4);
    expect(html).toContain('Evidence-first operating system for retail decisions.');
    expect(html).toContain('Enforced by human approval and DRAFT-only execution.');

    const tree = DecisionCommandHeader(props);
    const [cta] = findReactElements(tree, (element) => hasClass(element, 'sg-judge-start'));
    cta.props.onClick();
    expect(starts).toBe(1);
  });

  it('derives workflow progress only from returned business state', () => {
    const initial = render(<WorkflowRail locale="EN" />);
    expect(initial).toContain('data-state="current"');
    expect((initial.match(/data-state="not_started"/g) || [])).toHaveLength(2);

    const complete = render(<WorkflowRail
      locale="EN"
      brief={{ classification: 'VERIFIED', grossProfitUzs: '44.20', evidenceIds: [7] }}
      simulations={[scenario(11, 4)]}
      proposal={{ proposalId: 21, proposalStatus: 'APPROVED', evidenceIds: [12] }}
      decision={{ proposalStatus: 'APPROVED', purchaseOrderId: 31 }}
    />);
    expect((complete.match(/data-state="completed"/g) || [])).toHaveLength(3);

    const blocked = render(<WorkflowRail locale="EN" askResponse={{ status: 'GROUNDEDNESS_VALIDATION_FAILED' }} />);
    expect(blocked).toContain('data-state="blocked"');
    expect((blocked.match(/data-state="not_started"/g) || [])).toHaveLength(2);
  });

  it('Judge Mode navigation calls only navigation callbacks and actual section targets', () => {
    const calls = [];
    let exits = 0;
    const tree = JudgeModeGuide({
      active: true,
      locale: 'EN',
      currentStage: 2,
      onNavigate: (target, index) => calls.push(['navigate', target, index]),
      onStageChange: (index) => calls.push(['stage', index]),
      onExit: () => { exits += 1; },
    });
    const controls = findReactElements(tree, (element) => hasClass(element, 'sg-judge-controls'))[0];
    const buttons = findReactElements(controls, (element) => element.type === 'button');
    buttons[0].props.onClick();
    buttons[1].props.onClick();
    buttons[2].props.onClick();
    expect(calls).toEqual([
      ['stage', 1], ['navigate', 'sg-ask-section', 1],
      ['stage', 3], ['navigate', 'sg-policy-shield', 3],
    ]);
    expect(exits).toBe(1);

    const current = findReactElements(tree, (element) => element.type === 'button' && element.props?.['aria-current'] === 'step');
    expect(current).toHaveLength(1);
    current[0].props.onClick();
    expect(calls.at(-1)).toEqual(['navigate', 'sg-decision-twin', 2]);
  });

  it('shows observable trace states and stops fail-closed after grounding failure', () => {
    const pending = render(<DecisionTrace locale="EN" response={{
      interactionId: 'safe-id',
      status: 'NEEDS_CLARIFICATION',
      classification: 'INSUFFICIENT_DATA',
      toolsUsed: [],
      evidenceIds: [],
    }} />);
    expect(pending).toContain('data-state="completed"');
    expect(pending).toContain('data-state="current"');
    expect(pending).toContain('data-state="not_started"');

    const failed = render(<DecisionTrace locale="EN" response={{
      interactionId: 'safe-id',
      status: 'GROUNDEDNESS_VALIDATION_FAILED',
      classification: null,
      toolsUsed: ['get_daily_gross_profit_brief'],
      evidenceIds: [7],
      rawProviderResponse: 'RAW_NEVER_RENDER',
      hiddenReasoning: 'PRIVATE_NEVER_RENDER',
    }} />);
    expect(failed).toContain('data-state="blocked"');
    expect(failed).toContain('data-state="not_started"');
    expect(failed).not.toMatch(/RAW_NEVER_RENDER|PRIVATE_NEVER_RENDER/);
  });

  it('renders three evidence-backed server Decision Twin states', () => {
    const scenarios = [
      scenario(10, 0, { scenarioType: 'NO_ACTION', scenarioKey: 'scenarioNoAction' }),
      scenario(20, 7, { scenarioKey: 'scenarioBalanced' }),
      scenario(30, 14, { scenarioKey: 'scenarioHighCoverage' }),
    ];
    const html = render(<DecisionTwin locale="EN" scenarios={scenarios} />);
    expect((html.match(/sg-twin-scenario /g) || [])).toHaveLength(3);
    expect(html).toContain('No action');
    expect(html).toContain('Balanced coverage');
    expect(html).toContain('High coverage');
    expect((html.match(/data-supported="true"/g) || [])).toHaveLength(3);
    expect((html.match(/data-evidence-backed="true"/g) || []).length).toBeGreaterThan(8);
    for (const text of ['Human review required', 'No supplier contacted', 'No payment initiated', 'No inventory changed']) {
      expect(html).toContain(text);
    }
  });

  it('fails closed for an unproven NO ACTION or missing numeric evidence', () => {
    const unsafeNoAction = scenario(10, 987654, { scenarioType: 'NO_ACTION', scenarioKey: 'scenarioNoAction' });
    const html = render(<DecisionTwin locale="EN" scenarios={[unsafeNoAction]} />);
    expect(html).toContain('data-supported="false"');
    expect(html).not.toContain('987654');

    const noEvidence = scenario(20, 7654321, { scenarioKey: 'scenarioBalanced' });
    noEvidence.simulation.evidenceIds = {};
    const noEvidenceHtml = render(<DecisionTwin locale="EN" scenarios={[scenario(10, 0, { scenarioType: 'NO_ACTION' }), noEvidence]} />);
    expect(noEvidenceHtml).not.toContain('7654321');
    expect(noEvidenceHtml).toContain('Evidence is missing for a numeric result');
  });

  it('selects only an eligible non-zero server scenario for proposal review', () => {
    const selected = [];
    const tree = DecisionTwin({
      locale: 'EN',
      scenarios: [scenario(10, 0, { scenarioType: 'NO_ACTION' }), scenario(20, 7), scenario(30, 14)],
      onSelectScenario: (value, key) => selected.push([value.analysisRunId, key]),
    });
    const buttons = findReactElements(tree, (element) => hasClass(element, 'sg-twin-select'));
    expect(buttons).toHaveLength(2);
    buttons[0].props.onClick();
    expect(selected).toEqual([[20, 'scenarioBalanced']]);
  });

  it('builds a keyboard-operable proof graph and opens evidence by immutable ID', () => {
    const props = {
      locale: 'EN',
      brief: {
        analysisRunId: 44,
        classification: 'VERIFIED',
        revenueUzs: '100',
        cogsUzs: '60',
        grossProfitUzs: '40',
        currency: 'UZS',
        evidenceIds: { revenue: 71, cogs: 72, grossProfit: 73 },
      },
      askResponse: { interactionId: 'proof-ask', status: 'ANSWERED', answer: 'Gross Profit is 40 UZS.', classification: 'VERIFIED', toolsUsed: ['get_daily_gross_profit_brief'], evidenceIds: [73] },
    };
    const html = render(<InteractiveProofGraph {...props} />);
    expect(html).toContain('id="sg-proof-graph"');
    expect(html).toContain('sg-proof-node');
    expect(html).toContain('type="button"');
    expect(html).toContain('data-from=');
    expect(html).not.toMatch(/contentHash|hiddenReasoning|rawProvider/);

    const opened = [];
    const tree = InteractiveProofGraph({ ...props, onOpenEvidence: (id) => opened.push(id) });
    const evidenceButton = findReactElements(tree, (element) => element.type === 'button' && String(element.props?.['aria-label']).includes('Open evidence'))[0];
    evidenceButton.props.onClick();
    expect(opened[0]).toBeGreaterThan(0);
  });

  it('separates enforced system policy from current-run observation', () => {
    const empty = render(<PolicyShield locale="EN" />);
    for (const label of ['SYSTEM POLICY', 'CURRENT RUN', 'Not observed in this run', 'Maximum one PurchaseOrder DRAFT', 'Autonomous spend: 0 UZS']) {
      expect(empty).toContain(label);
    }

    const verified = render(<PolicyShield
      locale="EN"
      brief={{ classification: 'VERIFIED', evidenceIds: [7] }}
      askResponse={{ status: 'ANSWERED', classification: 'VERIFIED', answer: 'Grounded answer', evidenceIds: [7], toolsUsed: ['get_daily_gross_profit_brief'] }}
      simulations={[scenario(20, 7)]}
      proposal={{ proposalId: 21, sourceAnalysisRunId: 20, evidenceIds: [7] }}
      decision={{ proposalStatus: 'APPROVED', purchaseOrderId: 31 }}
      ledger={[{ id: 41, eventType: 'PURCHASE_ORDER_DRAFT_CREATED', proposalId: 21, purchaseOrderId: 31, evidenceReferences: '[7]' }]}
    />);
    expect(verified).toContain('Verified in this run');
    expect(verified).toContain('Enforcement source');
  });
});
