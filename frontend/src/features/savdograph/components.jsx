import { useEffect, useId, useRef } from 'react';
import { formatDateTime } from '../../lib/format.js';
import {
  classificationMeta,
  displayBackendValue,
  evidenceIdList,
  parseEvidenceReferences,
  safeStructuredInputs,
  sgText,
  statusLabel,
} from './model.js';

export function ClassificationBadge({ classification, locale = 'UZ' }) {
  const meta = classificationMeta(classification, locale);
  return (
    <span className={`sg-classification sg-classification-${meta.tone}`} title={meta.description}>
      <span className="sg-classification-icon" aria-hidden="true">{meta.icon}</span>
      <span>{meta.label}</span>
      <span className="sr-only">. {meta.description}</span>
    </span>
  );
}

export function AsyncNotice({ tone = 'info', children }) {
  if (!children) return null;
  return <div className={`sg-notice sg-notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function ValueGrid({ items, locale = 'UZ' }) {
  return (
    <dl className="sg-value-grid">
      {items.map(({ label, value, suffix, wide }) => (
        <div className={`sg-value${wide ? ' sg-value-wide' : ''}`} key={label}>
          <dt>{label}</dt>
          <dd>{displayBackendValue(value, locale)}{value !== null && value !== undefined && value !== '' && suffix ? ` ${suffix}` : ''}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TextList({ title, items, emptyText }) {
  if (!Array.isArray(items) || items.length === 0) {
    return emptyText ? <section className="sg-text-list"><h4>{title}</h4><p>{emptyText}</p></section> : null;
  }
  return (
    <section className="sg-text-list">
      <h4>{title}</h4>
      <ul>{items.map((item, index) => <li key={`${index}-${String(item).slice(0, 24)}`}>{String(item)}</li>)}</ul>
    </section>
  );
}

export function EvidenceLinks({ evidenceIds, locale = 'UZ', onOpen }) {
  const ids = evidenceIdList(evidenceIds);
  if (ids.length === 0) return <span className="sg-unavailable">{sgText(locale, 'insufficientEvidence')}</span>;
  return (
    <div className="sg-evidence-links" aria-label={sgText(locale, 'evidencePlural')}>
      {ids.map((id) => (
        <button type="button" className="sg-evidence-link" key={id} onClick={() => onOpen?.(id)} aria-label={`${sgText(locale, 'openEvidence')} ${id}`}>
          <span aria-hidden="true">\u29c9</span> {sgText(locale, 'evidence')} #{id}
        </button>
      ))}
    </div>
  );
}

export function BriefResult({ brief, locale = 'UZ', onOpenEvidence }) {
  if (!brief) return <div className="sg-empty"><span aria-hidden="true">\u25cc</span><p>{sgText(locale, 'noBrief')}</p></div>;
  const currency = brief.currency || 'UZS';
  return (
    <div className="sg-result" data-result="gross-profit-brief">
      <div className="sg-result-head">
        <ClassificationBadge classification={brief.classification} locale={locale} />
        <span className="sg-meta">{brief.timezone || 'Asia/Tashkent'}</span>
      </div>
      <ValueGrid locale={locale} items={[
        { label: sgText(locale, 'revenue'), value: brief.revenueUzs, suffix: currency },
        { label: sgText(locale, 'cogs'), value: brief.cogsUzs, suffix: currency },
        { label: sgText(locale, 'grossProfit'), value: brief.grossProfitUzs, suffix: currency },
        { label: sgText(locale, 'grossMargin'), value: brief.grossMarginPercent, suffix: '%' },
        { label: sgText(locale, 'completedSales'), value: brief.completedSaleCount },
        { label: sgText(locale, 'refundedAmount'), value: brief.refundedAmountUzs, suffix: currency },
        { label: sgText(locale, 'sourceRecords'), value: brief.sourceSaleItemCount },
        { label: sgText(locale, 'calculation'), value: brief.calculationId && brief.calculationVersion ? `${brief.calculationId} / ${brief.calculationVersion}` : null },
        { label: sgText(locale, 'generatedAt'), value: brief.generatedAt ? formatDateTime(brief.generatedAt) : null, wide: true },
      ]} />
      {brief.classification === 'ESTIMATED' && <TextList title={sgText(locale, 'assumptions')} items={brief.assumptions} emptyText={sgText(locale, 'insufficientEvidence')} />}
      <TextList title={sgText(locale, 'limitations')} items={brief.limitations} />
      <EvidenceLinks evidenceIds={brief.evidenceIds} locale={locale} onOpen={onOpenEvidence} />
    </div>
  );
}

function askStatusMessage(status, locale) {
  const messages = {
    PROVIDER_UNAVAILABLE: 'providerUnavailable', REFUSED: 'refused', ERROR: 'error',
    GROUNDEDNESS_VALIDATION_FAILED: 'groundednessFailure', INSUFFICIENT_DATA: 'insufficientDescription',
    UNSUPPORTED: 'unsupportedDescription', NEEDS_CLARIFICATION: 'needsClarification',
  };
  return messages[status] ? sgText(locale, messages[status]) : null;
}

export function AskResult({ response, locale = 'UZ', onOpenEvidence, clarificationControl }) {
  if (!response) return <div className="sg-empty"><span aria-hidden="true">\u2736</span><p>{sgText(locale, 'noAnswer')}</p></div>;
  const facts = Array.isArray(response.facts) ? response.facts : [];
  const safeAnswer = response.status === 'GROUNDEDNESS_VALIDATION_FAILED' ? null : response.answer;
  return (
    <article className="sg-result" data-result="ask-store">
      <div className="sg-result-head">
        <span className={`sg-status sg-status-${String(response.status || '').toLowerCase()}`}>{statusLabel(response.status, locale)}</span>
        <ClassificationBadge classification={response.classification} locale={locale} />
      </div>
      {safeAnswer && <p className="sg-answer">{String(safeAnswer)}</p>}
      {askStatusMessage(response.status, locale) && <AsyncNotice tone={response.status === 'NEEDS_CLARIFICATION' ? 'info' : 'warning'}>{askStatusMessage(response.status, locale)}</AsyncNotice>}
      {response.status === 'NEEDS_CLARIFICATION' && clarificationControl}
      {facts.length > 0 && (
        <section className="sg-facts" aria-labelledby="sg-facts-heading">
          <h4 id="sg-facts-heading">{sgText(locale, 'facts')}</h4>
          <div className="sg-fact-grid">
            {facts.map((fact, index) => (
              <div className="sg-fact" key={`${fact.label || 'fact'}-${index}`}>
                <span>{displayBackendValue(fact.label, locale)}</span>
                <strong>{displayBackendValue(fact.value, locale)}{fact.value != null && fact.unit ? ` ${fact.unit}` : ''}</strong>
                <ClassificationBadge classification={fact.classification || response.classification} locale={locale} />
                <EvidenceLinks evidenceIds={fact.evidence_ids ?? fact.evidenceIds} locale={locale} onOpen={onOpenEvidence} />
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="sg-detail-columns">
        <TextList title={sgText(locale, 'assumptions')} items={response.assumptions} />
        <TextList title={sgText(locale, 'limitations')} items={response.limitations} />
        <TextList title={sgText(locale, 'toolsUsed')} items={response.toolsUsed} />
        <TextList title={sgText(locale, 'suggestedActions')} items={(response.suggestedNextActions || []).map((action) => action?.label).filter(Boolean)} />
      </div>
      <EvidenceLinks evidenceIds={response.evidenceIds} locale={locale} onOpen={onOpenEvidence} />
      <div className="sg-audit-meta">
        {response.language && <span>{sgText(locale, 'language')}: {response.language}</span>}
        {response.interactionId && <span>{sgText(locale, 'interaction')}: {response.interactionId}</span>}
        {response.model && <span>{response.model}</span>}
        {response.promptVersion && <span>{response.promptVersion}</span>}
        {response.generatedAt && <span>{formatDateTime(response.generatedAt)}</span>}
      </div>
    </article>
  );
}

export function SimulationResult({ simulation, productName, locale = 'UZ', onOpenEvidence }) {
  if (!simulation) return <div className="sg-empty"><span aria-hidden="true">\u21ba</span><p>{sgText(locale, 'noSimulation')}</p></div>;
  return (
    <article className="sg-result" data-result="reorder-simulation">
      <div className="sg-result-head">
        <div><strong>{productName || simulation.productSku || sgText(locale, 'product')}</strong><span className="sg-meta">SKU: {displayBackendValue(simulation.productSku, locale)}</span></div>
        <ClassificationBadge classification={simulation.classification} locale={locale} />
      </div>
      <ValueGrid locale={locale} items={[
        { label: sgText(locale, 'currentStock'), value: simulation.currentOnHandQuantity, suffix: simulation.unit },
        { label: sgText(locale, 'netUnitsSold'), value: simulation.netUnitsSold, suffix: simulation.unit },
        { label: sgText(locale, 'velocity'), value: simulation.velocityUnitsPerDay, suffix: simulation.unit },
        { label: sgText(locale, 'forecastDays'), value: simulation.forecastHorizonDays },
        { label: sgText(locale, 'leadTimeDays'), value: simulation.leadTimeDays },
        { label: sgText(locale, 'safetyStockDays'), value: simulation.safetyStockDays },
        { label: sgText(locale, 'coverageBefore'), value: simulation.coverageBeforeDays },
        { label: sgText(locale, 'coverageAfter'), value: simulation.coverageAfterDays },
        { label: sgText(locale, 'reorderQuantity'), value: simulation.reorderQuantity, suffix: simulation.unit },
        { label: sgText(locale, 'stockoutRisk'), value: simulation.stockoutRisk },
        { label: sgText(locale, 'overstockRisk'), value: simulation.overstockRisk },
        { label: sgText(locale, 'tiedUpCapital'), value: simulation.tiedUpCapitalUzs, suffix: simulation.tiedUpCapitalUzs != null ? 'UZS' : '' },
        { label: sgText(locale, 'calculation'), value: simulation.calculationId && simulation.calculationVersion ? `${simulation.calculationId} / ${simulation.calculationVersion}` : null },
        { label: sgText(locale, 'analysisRun'), value: simulation.analysisRunId },
      ]} />
      <div className="sg-detail-columns">
        <TextList title={sgText(locale, 'assumptions')} items={simulation.assumptions} emptyText={simulation.classification === 'ESTIMATED' ? sgText(locale, 'insufficientEvidence') : null} />
        <TextList title={sgText(locale, 'risks')} items={simulation.risks} />
        <TextList title={sgText(locale, 'limitations')} items={simulation.limitations} />
      </div>
      <EvidenceLinks evidenceIds={simulation.evidenceIds} locale={locale} onOpen={onOpenEvidence} />
    </article>
  );
}

export function ProposalCard({ proposal, decision, canDecide, locale = 'UZ', onOpenEvidence, onDecision }) {
  if (!proposal) return <div className="sg-empty"><span aria-hidden="true">\u2299</span><p>{sgText(locale, 'noProposal')}</p></div>;
  const status = decision?.proposalStatus || proposal.proposalStatus || proposal.status;
  return (
    <article className="sg-result sg-proposal" data-result="proposal-review">
      <div className="sg-result-head">
        <span className={`sg-status sg-status-${String(status || '').toLowerCase()}`}>{statusLabel(status, locale)}</span>
        <ClassificationBadge classification={proposal.classification} locale={locale} />
      </div>
      <ValueGrid locale={locale} items={[
        { label: sgText(locale, 'proposalId'), value: proposal.proposalId ?? proposal.id },
        { label: sgText(locale, 'product'), value: proposal.productDisplayName },
        { label: sgText(locale, 'supplier'), value: proposal.supplierDisplayName },
        { label: sgText(locale, 'quantity'), value: proposal.reorderQuantity ?? proposal.proposedReorderQuantity },
        { label: sgText(locale, 'sourceRun'), value: proposal.sourceAnalysisRunId ?? proposal.analysisRunId },
        { label: sgText(locale, 'generatedAt'), value: proposal.createdAt ? formatDateTime(proposal.createdAt) : null },
        { label: sgText(locale, 'draftReference'), value: decision?.purchaseOrderId },
      ]} />
      {proposal.idempotent && <AsyncNotice>{sgText(locale, 'idempotentReplay')}</AsyncNotice>}
      <div className="sg-detail-columns">
        <TextList title={sgText(locale, 'assumptions')} items={proposal.assumptions} />
        <TextList title={sgText(locale, 'risks')} items={proposal.risks} />
        <TextList title={sgText(locale, 'limitations')} items={proposal.limitations} />
      </div>
      <EvidenceLinks evidenceIds={proposal.evidenceIds} locale={locale} onOpen={onOpenEvidence} />
      {canDecide && String(status).toUpperCase() === 'PENDING' && (
        <div className="sg-decision-actions">
          <button type="button" className="btn btn-green" onClick={() => onDecision?.('approve')}>{sgText(locale, 'approveProposal')}</button>
          <button type="button" className="btn btn-red" onClick={() => onDecision?.('reject')}>{sgText(locale, 'rejectProposal')}</button>
        </div>
      )}
      {decision && <AsyncNotice tone="success">{sgText(locale, 'decisionConfirmed')}</AsyncNotice>}
    </article>
  );
}

export function LedgerTimeline({ events, locale = 'UZ', onOpenEvidence }) {
  if (!Array.isArray(events) || events.length === 0) return <div className="sg-empty"><span aria-hidden="true">\u25f7</span><p>{sgText(locale, 'noLedger')}</p></div>;
  return (
    <ol className="sg-ledger" aria-label={sgText(locale, 'recordedHistory')}>
      {events.map((event) => (
        <li key={event.id}>
          <div className="sg-ledger-marker" aria-hidden="true">\u25cf</div>
          <article>
            <div className="sg-ledger-head"><strong>{displayBackendValue(event.eventType, locale)}</strong><time>{event.createdAt ? formatDateTime(event.createdAt) : sgText(locale, 'notAvailable')}</time></div>
            <div className="sg-ledger-grid">
              <span>{sgText(locale, 'outcome')}: <strong>{displayBackendValue(event.outcome, locale)}</strong></span>
              <span>{sgText(locale, 'actor')}: <strong>{displayBackendValue(event.actor, locale)}</strong></span>
              <span>{sgText(locale, 'proposalReference')}: <strong>#{displayBackendValue(event.proposalId, locale)}</strong></span>
              {event.purchaseOrderId != null && <span>{sgText(locale, 'draftReference')}: <strong>#{event.purchaseOrderId}</strong></span>}
            </div>
            {event.details && <p>{String(event.details)}</p>}
            <EvidenceLinks evidenceIds={parseEvidenceReferences(event.evidenceReferences)} locale={locale} onOpen={onOpenEvidence} />
          </article>
        </li>
      ))}
    </ol>
  );
}

function useAccessibleOverlay(open, onClose, panelRef) {
  const returnFocusRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusables = () => [...(panel?.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])];
    const first = focusables()[0];
    first?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) { event.preventDefault(); panel?.focus(); return; }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const target = returnFocusRef.current;
      setTimeout(() => target?.focus?.(), 0);
    };
  }, [open, onClose, panelRef]);
}

export function EvidenceDrawer({ open, evidence, loading, error, locale = 'UZ', onClose, onRetry }) {
  const titleId = useId();
  const panelRef = useRef(null);
  useAccessibleOverlay(open, onClose, panelRef);
  if (!open) return null;
  const inputs = safeStructuredInputs(evidence?.inputData);
  return (
    <div className="sg-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="sg-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef} tabIndex={-1}>
        <header><div><span className="sg-eyebrow">{sgText(locale, 'evidencePlural')}</span><h2 id={titleId}>{sgText(locale, 'evidenceViewer')}</h2></div><button type="button" className="sg-icon-button" onClick={onClose} aria-label={sgText(locale, 'close')}>\u00d7</button></header>
        <div className="sg-drawer-body">
          {loading && <div className="sg-skeleton-stack" aria-label={sgText(locale, 'loading')}><i /><i /><i /></div>}
          {error && <AsyncNotice tone="error">{error} {onRetry && <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>{sgText(locale, 'retry')}</button>}</AsyncNotice>}
          {evidence && (
            <>
              <ValueGrid locale={locale} items={[
                { label: sgText(locale, 'evidenceId'), value: evidence.id },
                { label: sgText(locale, 'evidenceType'), value: evidence.evidenceType },
                { label: sgText(locale, 'calculation'), value: evidence.calculationId && evidence.calculationVersion ? `${evidence.calculationId} / ${evidence.calculationVersion}` : null },
                { label: sgText(locale, 'sourcePeriod'), value: evidence.periodFrom && evidence.periodTo ? `${evidence.periodFrom} \u2192 ${evidence.periodTo}` : null },
                { label: sgText(locale, 'result'), value: evidence.calculatedResult },
                { label: sgText(locale, 'unitCurrency'), value: [evidence.unit, evidence.currency].filter(Boolean).join(' / ') || null },
                { label: sgText(locale, 'generatedAt'), value: evidence.createdAt ? formatDateTime(evidence.createdAt) : null },
                { label: sgText(locale, 'integrityRecorded'), value: evidence.contentHash ? '\u2713' : null },
              ]} />
              {inputs && <section className="sg-safe-json"><h3>{sgText(locale, 'structuredInputs')}</h3><pre>{JSON.stringify(inputs, null, 2)}</pre></section>}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

export function DecisionDialog({ open, kind, proposal, locale = 'UZ', pending, error, reason, onReasonChange, onClose, onConfirm }) {
  const titleId = useId();
  const panelRef = useRef(null);
  useAccessibleOverlay(open, onClose, panelRef);
  if (!open || !proposal) return null;
  const approve = kind === 'approve';
  return (
    <div className="sg-overlay sg-overlay-centered" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}>
      <section className="sg-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef} tabIndex={-1}>
        <header><div><span className="sg-eyebrow">{sgText(locale, 'confirmDecision')}</span><h2 id={titleId}>{sgText(locale, approve ? 'approveProposal' : 'rejectProposal')}</h2></div><button type="button" className="sg-icon-button" onClick={onClose} disabled={pending} aria-label={sgText(locale, 'close')}>\u00d7</button></header>
        <div className="sg-dialog-body">
          <ValueGrid locale={locale} items={[
            { label: sgText(locale, 'product'), value: proposal.productDisplayName },
            { label: sgText(locale, 'quantity'), value: proposal.reorderQuantity },
            { label: sgText(locale, 'supplier'), value: proposal.supplierDisplayName },
          ]} />
          <ClassificationBadge classification={proposal.classification} locale={locale} />
          <TextList title={sgText(locale, 'assumptions')} items={(proposal.assumptions || []).slice(0, 3)} />
          <TextList title={sgText(locale, 'risks')} items={(proposal.risks || []).slice(0, 3)} />
          <AsyncNotice tone="warning">{sgText(locale, 'decisionWarning')}</AsyncNotice>
          <label className="sg-field"><span>{sgText(locale, 'optionalReason')}</span><textarea className="input" rows="3" maxLength="500" value={reason} onChange={(event) => onReasonChange(event.target.value)} /></label>
          {error && <AsyncNotice tone="error">{error}</AsyncNotice>}
        </div>
        <footer>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>{sgText(locale, 'cancel')}</button>
          <button type="button" className={`btn ${approve ? 'btn-green' : 'btn-red'}`} onClick={onConfirm} disabled={pending}>{pending ? sgText(locale, 'submitting') : sgText(locale, approve ? 'approve' : 'reject')}</button>
        </footer>
      </section>
    </div>
  );
}
