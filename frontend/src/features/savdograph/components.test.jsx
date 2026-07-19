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

const render = (node) => renderToStaticMarkup(node);

describe('SavdoGraph demo environment labeling', () => {
  it('renders a stable named note when demo mode is explicitly enabled', () => {
    const html = render(<DemoDataBanner enabled locale="EN" />);
    expect(html).toContain('role="note"');
    expect(html).toContain('aria-label="Demo Data"');
    expect(html).toContain('anonymized sample data');
  });

  it('renders no demo label when demo mode is explicitly disabled', () => {
    expect(render(<DemoDataBanner enabled={false} locale="EN" />)).toBe('');
  });
});

describe('SavdoGraph result rendering', () => {
  it('renders VERIFIED brief values exactly as returned by the backend', () => {
    const html = render(<BriefResult locale="EN" brief={{ classification: 'VERIFIED', timezone: 'Asia/Tashkent', currency: 'UZS', revenueUzs: '123.4500', cogsUzs: '20.1000', grossProfitUzs: '103.3500', grossMarginPercent: '83.718', completedSaleCount: 4, sourceSaleItemCount: 7, refundedAmountUzs: '0.2500', evidenceIds: { grossProfit: 9 } }} />);
    expect(html).toContain('123.4500 UZS');
    expect(html).toContain('103.3500 UZS');
  });

  it('never relabels Gross Profit as Net Profit', () => {
    const html = render(<BriefResult locale="EN" brief={{ classification: 'VERIFIED', grossProfitUzs: '4', evidenceIds: [1] }} />);
    expect(html).toContain('Gross Profit');
    expect(html).not.toContain('Net Profit');
  });

  it('renders ESTIMATED assumptions visibly', () => {
    const html = render(<BriefResult locale="EN" brief={{ classification: 'ESTIMATED', assumptions: ['Refund lag assumed'], evidenceIds: [1] }} />);
    expect(html).toContain('Assumptions');
    expect(html).toContain('Refund lag assumed');
  });

  it('does not render a missing brief number as zero', () => {
    const html = render(<BriefResult locale="EN" brief={{ classification: 'INSUFFICIENT_DATA', revenueUzs: null, evidenceIds: [] }} />);
    expect(html).toContain('Not available');
    expect(html).not.toContain('>0 UZS<');
  });

  it('classification is not color-only', () => {
    const html = render(<ClassificationBadge classification="ESTIMATED" locale="EN" />);
    expect(html).toContain('Estimated');
    expect(html).toContain('~');
    expect(html).toContain('backend-listed assumptions');
  });

  it('renders Uzbek, Russian and English typed answers as text', () => {
    expect(render(<AskResult locale="UZ" response={{ status: 'ANSWERED', classification: 'VERIFIED', answer: 'Yalpi foyda' }} />)).toContain('Yalpi foyda');
    expect(render(<AskResult locale="RU" response={{ status: 'ANSWERED', classification: 'VERIFIED', answer: '\u0412\u0430\u043b\u043e\u0432\u0430\u044f \u043f\u0440\u0438\u0431\u044b\u043b\u044c' }} />)).toContain('\u0412\u0430\u043b\u043e\u0432\u0430\u044f \u043f\u0440\u0438\u0431\u044b\u043b\u044c');
    expect(render(<AskResult locale="EN" response={{ status: 'ANSWERED', classification: 'VERIFIED', answer: 'Gross profit' }} />)).toContain('Gross profit');
  });

  it('escapes untrusted answer text instead of injecting script', () => {
    const html = render(<AskResult locale="EN" response={{ status: 'ANSWERED', classification: 'VERIFIED', answer: '<script>steal()</script>' }} />);
    expect(html).toContain('&lt;script&gt;steal()&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('does not render hidden reasoning or raw provider protocol fields', () => {
    const html = render(<AskResult locale="EN" response={{ status: 'ANSWERED', classification: 'VERIFIED', answer: 'Safe', hiddenReasoning: 'PRIVATE_CHAIN', rawProviderResponse: 'RAW_PROTOCOL' }} />);
    expect(html).not.toContain('PRIVATE_CHAIN');
    expect(html).not.toContain('RAW_PROTOCOL');
  });

  it('preserves fact-level evidence links', () => {
    const html = render(<AskResult locale="EN" response={{ status: 'ANSWERED', classification: 'VERIFIED', facts: [{ label: 'Revenue', value: '44', evidence_ids: [71] }] }} />);
    expect(html).toContain('Evidence #71');
    expect(html).toContain('Open evidence 71');
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
      readFileSync(new URL('../../pages/SavdoGraph.jsx', import.meta.url), 'utf8'),
    ].join('\n');
    expect(source).not.toMatch(/>[^<{]*\\u[0-9a-fA-F]{4}[^<{]*</);
  });

  it('renders simulation backend values without a proposal side effect', () => {
    const html = render(<SimulationResult locale="EN" productName="Tea" simulation={{ classification: 'ESTIMATED', productSku: 'T-1', currentOnHandQuantity: 3, reorderQuantity: 9, assumptions: ['Velocity assumption'], evidenceIds: [2] }} />);
    expect(html).toContain('Tea');
    expect(html).toContain('9');
    expect(html).not.toContain('Create proposal for review');
  });

  it('leaves unavailable tied-up capital unavailable', () => {
    const html = render(<SimulationResult locale="EN" simulation={{ classification: 'ESTIMATED', tiedUpCapitalUzs: null, evidenceIds: [2] }} />);
    expect(html).toContain('Tied-up capital');
    expect(html).toContain('Not available');
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
    expect(missing).toMatch(/<button[^>]*disabled=""[^>]*>Create proposal for review/);

    const selected = render(<SupplierBridgeControls locale="EN" supplierId="31" onSupplierChange={() => {}} />);
    expect(selected).not.toMatch(/<button[^>]*disabled=""[^>]*>Create proposal for review/);
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

  it('decision dialog is an accessible modal with DRAFT-only warning', () => {
    const html = render(<DecisionDialog open kind="approve" proposal={proposal} locale="EN" pending={false} error="" reason="" onReasonChange={() => {}} onClose={() => {}} onConfirm={() => {}} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('at most one PurchaseOrder DRAFT');
    expect(html).toContain('does not order, pay, receive, deliver, or notify the supplier');
  });

  it('pending decision disables duplicate confirmation submits', () => {
    const html = render(<DecisionDialog open kind="reject" proposal={proposal} locale="EN" pending error="" reason="" onReasonChange={() => {}} onClose={() => {}} onConfirm={() => {}} />);
    expect(html).toContain('disabled=""');
    expect(html).toContain('Submitting');
  });

  it('immutable ledger has no edit or delete affordance', () => {
    const html = render(<LedgerTimeline locale="EN" events={[{ id: 1, proposalId: 41, actor: 'Owner', eventType: 'PROPOSAL_APPROVED', outcome: 'DRAFT_CREATED', evidenceReferences: '[9]', createdAt: '2026-07-18T12:00:00' }]} />);
    expect(html).toContain('PROPOSAL_APPROVED');
    expect(html).toContain('Evidence #9');
    expect(html).not.toMatch(/>Edit<|>Delete</);
  });

  it('evidence viewer exposes safe fields and an integrity status', () => {
    const html = render(<EvidenceDrawer open locale="EN" loading={false} error="" evidence={{ id: 9, evidenceType: 'GROSS_PROFIT', calculationId: 'gp', calculationVersion: '1', periodFrom: '2026-07-17', periodTo: '2026-07-18', calculatedResult: '44.20', unit: 'UZS', contentHash: 'hash-present', inputData: '{"lookbackDays":7,"shopId":99}' }} onClose={() => {}} />);
    expect(html).toContain('Evidence ID');
    expect(html).toContain('Immutable hash recorded');
    expect(html).toContain('lookbackDays');
    expect(html).not.toContain('shopId');
  });

  it('evidence and decision overlays include named close controls', () => {
    const html = render(<EvidenceDrawer open locale="EN" loading evidence={null} error="" onClose={() => {}} />);
    expect(html).toContain('aria-label="Close"');
  });
});
