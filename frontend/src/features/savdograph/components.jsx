import { useEffect, useId, useRef } from 'react';
import {
  briefNarrativeText,
  classificationMeta,
  displayBackendValue,
  evidenceIdList,
  formatSavdoGraphDateTime,
  isReviewPendingStatus,
  normaliseAskResponse,
  parseEvidenceReferences,
  presentLedgerEvent,
  simulationNarrativeText,
  simulationRiskLabel,
  safeStructuredInputs,
  sgText,
  statusLabel,
} from './model.js';

export function ClassificationBadge({ classification, locale = 'UZ' }) {
  if (classification == null) return null;
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

export function DemoDataBanner({ enabled, locale = 'UZ' }) {
  if (!enabled) return null;
  const label = sgText(locale, 'demoData');
  return (
    <div className="sg-demo-banner" role="note" aria-label={label}>
      <strong>{label}</strong><span>{sgText(locale, 'demoNotice')}</span>
    </div>
  );
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

export function EvidenceLinks({ evidenceIds, locale = 'UZ', onOpen, contextLabel }) {
  const ids = [...new Set(evidenceIdList(evidenceIds))];
  if (ids.length === 0) return <span className="sg-unavailable">{sgText(locale, 'insufficientEvidence')}</span>;
  return (
    <div className="sg-evidence-links" aria-label={sgText(locale, 'evidencePlural')}>
      {ids.map((id) => (
        <button type="button" className="sg-evidence-link" key={id} onClick={() => onOpen?.(id)} aria-label={`${sgText(locale, 'openEvidence')} ${id}${contextLabel ? ` — ${contextLabel}` : ''}`}>
          <span aria-hidden="true">⧉</span> {contextLabel && <span>{contextLabel}: </span>}{sgText(locale, 'evidence')} #{id}
        </button>
      ))}
    </div>
  );
}

function hasBackendValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function namedEvidenceId(evidenceIds, field) {
  if (!evidenceIds || Array.isArray(evidenceIds) || typeof evidenceIds !== 'object') return null;
  const id = Number(evidenceIds[field]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function evidenceForField(evidenceIds, field, requireNamedEvidence = false) {
  const namedId = namedEvidenceId(evidenceIds, field);
  if (namedId != null) return [namedId];
  return !requireNamedEvidence && Array.isArray(evidenceIds) ? evidenceIds : [];
}

function valueWithNamedEvidence(value, evidenceIds, field, requireNamedEvidence = false) {
  const hasNamedMap = evidenceIds && !Array.isArray(evidenceIds) && typeof evidenceIds === 'object';
  return (requireNamedEvidence || hasNamedMap) && namedEvidenceId(evidenceIds, field) == null ? null : value;
}

function EvidenceValueGrid({ items, evidenceIds, locale = 'UZ', onOpen, requireNamedEvidence = false }) {
  return (
    <dl className="sg-value-grid sg-evidence-value-grid">
      {items.map(({ evidenceKey, label, value, suffix, wide }) => {
        const publicValue = valueWithNamedEvidence(value, evidenceIds, evidenceKey, requireNamedEvidence);
        return (
          <div className={`sg-value${wide ? ' sg-value-wide' : ''}`} key={`${evidenceKey}-${label}`}>
            <dt>{label}</dt>
            <dd>{displayBackendValue(publicValue, locale)}{hasBackendValue(publicValue) && suffix ? ` ${suffix}` : ''}</dd>
            <EvidenceLinks evidenceIds={evidenceForField(evidenceIds, evidenceKey, requireNamedEvidence)} locale={locale} onOpen={onOpen} contextLabel={label} />
          </div>
        );
      })}
    </dl>
  );
}
function safeBriefNarratives(items, locale) {
  const unavailable = sgText(locale, 'briefNarrativeUnavailable');
  return (Array.isArray(items) ? items : [])
    .map((item) => briefNarrativeText(item, locale))
    .filter((item) => typeof item === 'string' && item && item !== unavailable);
}

function safeSimulationNarratives(items, locale) {
  return (Array.isArray(items) ? items : []).map((item) => simulationNarrativeText(item, locale));
}

function safeSimulationRisks(items, locale) {
  return (Array.isArray(items) ? items : []).map((item) => simulationRiskLabel(item, locale));
}

export function BriefResult({ brief, locale = 'UZ', onOpenEvidence }) {
  const primaryHeadingId = useId();
  const factsHeadingId = useId();
  const evidenceHeadingId = useId();
  const metadataHeadingId = useId();
  if (!brief) return <div className="sg-empty"><span aria-hidden="true">◌</span><p>{sgText(locale, 'noBrief')}</p></div>;
  const currency = brief.currency === 'UZS' ? 'UZS' : null;
  const periodTimezoneEvidence = evidenceForField(brief.evidenceIds, 'periodTimezone', true);
  const timezone = brief.timezone === 'Asia/Tashkent' && periodTimezoneEvidence.length > 0 ? 'Asia/Tashkent' : null;
  const grossProfitEvidence = evidenceForField(brief.evidenceIds, 'grossProfit', true);
  const grossProfit = currency && grossProfitEvidence.length > 0 ? brief.grossProfitUzs : null;
  const monetaryValue = (value) => currency ? value : null;
  return (
    <article className="sg-result sg-result-hierarchy" data-result="gross-profit-brief">
      <div className="sg-result-head">
        <ClassificationBadge classification={brief.classification} locale={locale} />
        <span className="sg-meta">{displayBackendValue(timezone, locale)}</span>
      </div>
      <section className="sg-primary-answer" aria-labelledby={primaryHeadingId}>
        <span className="sg-eyebrow">{sgText(locale, 'primaryBusinessAnswer')}</span>
        <h3 id={primaryHeadingId}>{sgText(locale, 'grossProfit')}</h3>
        <strong>{displayBackendValue(grossProfit, locale)}{hasBackendValue(grossProfit) ? ` ${currency}` : ''}</strong>
        <EvidenceLinks evidenceIds={grossProfitEvidence} locale={locale} onOpen={onOpenEvidence} contextLabel={sgText(locale, 'grossProfit')} />
      </section>
      <section className="sg-result-section sg-result-facts" aria-labelledby={factsHeadingId}>
        <h4 id={factsHeadingId}>{sgText(locale, 'verifiedFacts')}</h4>
        <EvidenceValueGrid locale={locale} evidenceIds={brief.evidenceIds} onOpen={onOpenEvidence} requireNamedEvidence items={[
          { evidenceKey: 'revenue', label: sgText(locale, 'revenue'), value: monetaryValue(brief.revenueUzs), suffix: currency },
          { evidenceKey: 'cogs', label: sgText(locale, 'cogs'), value: monetaryValue(brief.cogsUzs), suffix: currency },
          { evidenceKey: 'grossMargin', label: sgText(locale, 'grossMargin'), value: brief.grossMarginPercent, suffix: '%' },
          { evidenceKey: 'sourceRecordCounts', label: sgText(locale, 'completedSales'), value: brief.completedSaleCount },
          { evidenceKey: 'refundedRevenue', label: sgText(locale, 'refundedAmount'), value: monetaryValue(brief.refundedAmountUzs), suffix: currency },
          { evidenceKey: 'sourceRecordCounts', label: sgText(locale, 'sourceRecords'), value: brief.sourceSaleItemCount },
        ]} />
      </section>
      <section className="sg-result-section sg-result-evidence" aria-labelledby={evidenceHeadingId}>
        <h4 id={evidenceHeadingId}>{sgText(locale, 'evidencePlural')}</h4>
        <EvidenceLinks evidenceIds={brief.evidenceIds} locale={locale} onOpen={onOpenEvidence} />
      </section>
      {brief.classification === 'ESTIMATED' && <TextList title={sgText(locale, 'assumptions')} items={safeBriefNarratives(brief.assumptions, locale)} emptyText={sgText(locale, 'insufficientEvidence')} />}
      <TextList title={sgText(locale, 'limitations')} items={safeBriefNarratives(brief.limitations, locale)} />
      <section className="sg-result-section sg-technical-meta" aria-labelledby={metadataHeadingId}>
        <h4 id={metadataHeadingId}>{sgText(locale, 'technicalMetadata')}</h4>
        <ValueGrid locale={locale} items={[
          { label: sgText(locale, 'analysisRun'), value: brief.analysisRunId },
          { label: sgText(locale, 'calculation'), value: brief.calculationId && brief.calculationVersion ? `${brief.calculationId} / ${brief.calculationVersion}` : null },
          { label: sgText(locale, 'selectedPeriod'), value: timezone && brief.periodStart && brief.periodEnd ? `${brief.periodStart} → ${brief.periodEnd}` : null },
          { label: sgText(locale, 'timezone'), value: timezone },
          { label: sgText(locale, 'generatedAt'), value: timezone && brief.generatedAt ? formatSavdoGraphDateTime(brief.generatedAt, locale) : null, wide: true },
        ]} />
      </section>
    </article>
  );
}
function safeTechnicalText(value, maxLength = 160) {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean ? clean.slice(0, maxLength) : null;
}

function safeTechnicalTimestamp(value) {
  const clean = safeTechnicalText(value, 64);
  return clean && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(clean)
    ? clean
    : null;
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
  const primaryHeadingId = useId();
  const factsHeadingId = useId();
  const evidenceHeadingId = useId();
  const metadataHeadingId = useId();
  if (!response) return <div className="sg-empty"><span aria-hidden="true">✶</span><p>{sgText(locale, 'noAnswer')}</p></div>;
  const normalizedResponse = normaliseAskResponse(response);
  const responseStatus = String(response.status || '').trim().toUpperCase();
  const normalizedStatus = String(normalizedResponse?.status || '').toUpperCase();
  const answeredValidationFailed = responseStatus === 'ANSWERED' && !normalizedResponse;
  const explicitGroundingFailure = responseStatus === 'GROUNDEDNESS_VALIDATION_FAILED';
  const suppressUngroundedOutput = !normalizedResponse || explicitGroundingFailure;
  const publicStatus = answeredValidationFailed || explicitGroundingFailure
    ? 'GROUNDEDNESS_VALIDATION_FAILED'
    : normalizedStatus || 'ERROR';
  const publicResponse = normalizedResponse || {};
  const metadataSource = normalizedResponse || response;
  const metadata = {
    language: safeTechnicalText(metadataSource.language, 16),
    interactionId: safeTechnicalText(metadataSource.interactionId),
    model: safeTechnicalText(metadataSource.model),
    promptVersion: safeTechnicalText(metadataSource.promptVersion),
    generatedAt: safeTechnicalTimestamp(metadataSource.generatedAt),
  };
  const facts = !suppressUngroundedOutput && Array.isArray(publicResponse.facts) ? publicResponse.facts : [];
  const safeAnswer = suppressUngroundedOutput ? null : publicResponse.answer;
  return (
    <article className="sg-result sg-result-hierarchy" data-result="ask-store">
      <div className="sg-result-head">
        <span className={`sg-status sg-status-${publicStatus.toLowerCase()}`}>{statusLabel(publicStatus, locale)}</span>
        {!suppressUngroundedOutput && publicResponse.classification != null && <ClassificationBadge classification={publicResponse.classification} locale={locale} />}
      </div>
      {safeAnswer && (
        <section className="sg-primary-answer" aria-labelledby={primaryHeadingId}>
          <h3 className="sg-eyebrow" id={primaryHeadingId}>{sgText(locale, 'primaryBusinessAnswer')}</h3>
          <p className="sg-answer">{String(safeAnswer)}</p>
        </section>
      )}
      {askStatusMessage(publicStatus, locale) && <AsyncNotice tone={publicStatus === 'NEEDS_CLARIFICATION' ? 'info' : 'warning'}>{askStatusMessage(publicStatus, locale)}</AsyncNotice>}
      {publicStatus === 'NEEDS_CLARIFICATION' && clarificationControl}
      {facts.length > 0 && (
        <section className="sg-facts sg-result-section" aria-labelledby={factsHeadingId}>
          <h4 id={factsHeadingId}>{sgText(locale, 'verifiedFacts')}</h4>
          <div className="sg-fact-grid">
            {facts.map((fact, index) => (
              <div className="sg-fact" key={`${fact.label || 'fact'}-${index}`}>
                <span>{displayBackendValue(fact.label, locale)}</span>
                <strong>{displayBackendValue(fact.value, locale)}{fact.value != null && fact.unit ? ` ${fact.unit}` : ''}</strong>
                {(fact.classification || publicResponse.classification) && <ClassificationBadge classification={fact.classification || publicResponse.classification} locale={locale} />}
                <EvidenceLinks evidenceIds={fact.evidence_ids ?? fact.evidenceIds} locale={locale} onOpen={onOpenEvidence} />
              </div>
            ))}
          </div>
        </section>
      )}
      {!suppressUngroundedOutput && (
        <section className="sg-result-section sg-result-evidence" aria-labelledby={evidenceHeadingId}>
          <h4 id={evidenceHeadingId}>{sgText(locale, 'evidencePlural')}</h4>
          <EvidenceLinks evidenceIds={publicResponse.evidenceIds} locale={locale} onOpen={onOpenEvidence} />
        </section>
      )}
      <div className="sg-detail-columns">
        <TextList title={sgText(locale, 'assumptions')} items={suppressUngroundedOutput ? [] : publicResponse.assumptions} />
        <TextList title={sgText(locale, 'limitations')} items={suppressUngroundedOutput ? [] : publicResponse.limitations} />
      </div>
      {!suppressUngroundedOutput && <TextList title={sgText(locale, 'suggestedActions')} items={(publicResponse.suggestedNextActions || []).map((action) => action?.label).filter(Boolean)} />}
      <section className="sg-result-section sg-technical-meta" aria-labelledby={metadataHeadingId}>
        <h4 id={metadataHeadingId}>{sgText(locale, 'technicalMetadata')}</h4>
        <TextList title={sgText(locale, 'toolsUsed')} items={suppressUngroundedOutput ? [] : publicResponse.toolsUsed} />
        <div className="sg-audit-meta">
          {metadata.language && <span>{sgText(locale, 'language')}: {metadata.language}</span>}
          {metadata.interactionId && <span>{sgText(locale, 'interaction')}: {metadata.interactionId}</span>}
          {metadata.model && <span>{metadata.model}</span>}
          {metadata.promptVersion && <span>{metadata.promptVersion}</span>}
          {metadata.generatedAt && <span>{formatSavdoGraphDateTime(metadata.generatedAt, locale)}</span>}
        </div>
      </section>
    </article>
  );
}
export function SimulationResult({ simulation, productName, locale = 'UZ', onOpenEvidence }) {
  const evidenceHeadingId = useId();
  const metadataHeadingId = useId();
  if (!simulation) return <div className="sg-empty"><span aria-hidden="true">↺</span><p>{sgText(locale, 'noSimulation')}</p></div>;
  const beforeEvidenceIds = [...new Set([
    ...evidenceForField(simulation.evidenceIds, 'coverageBefore'),
    ...evidenceForField(simulation.evidenceIds, 'currentStock'),
  ])];
  const afterEvidenceIds = [...new Set([
    ...evidenceForField(simulation.evidenceIds, 'coverageAfter'),
    ...evidenceForField(simulation.evidenceIds, 'reorderQuantity'),
  ])];
  const coverageBefore = valueWithNamedEvidence(simulation.coverageBeforeDays, simulation.evidenceIds, 'coverageBefore');
  const currentStock = valueWithNamedEvidence(simulation.currentOnHandQuantity, simulation.evidenceIds, 'currentStock');
  const coverageAfter = valueWithNamedEvidence(simulation.coverageAfterDays, simulation.evidenceIds, 'coverageAfter');
  const reorderQuantity = valueWithNamedEvidence(simulation.reorderQuantity, simulation.evidenceIds, 'reorderQuantity');
  return (
    <article className="sg-result sg-result-hierarchy" data-result="reorder-simulation">
      <div className="sg-result-head">
        <div>
          <strong>{productName || simulation.productSku || sgText(locale, 'product')}</strong>
          <span className="sg-meta">SKU: {displayBackendValue(simulation.productSku, locale)}</span>
        </div>
        <ClassificationBadge classification={simulation.classification} locale={locale} />
      </div>
      <AsyncNotice>{sgText(locale, 'simulatorHint')}</AsyncNotice>
      <div className="sg-simulation-compare" aria-label={`${sgText(locale, 'before')} / ${sgText(locale, 'after')}`}>
        <div className="sg-simulation-state sg-simulation-before">
          <span>{sgText(locale, 'before')}</span>
          <strong>{displayBackendValue(coverageBefore, locale)}{hasBackendValue(coverageBefore) ? ` ${sgText(locale, 'daysUnit')}` : ''}</strong>
          <small>{sgText(locale, 'currentStock')}: {displayBackendValue(currentStock, locale)}{hasBackendValue(currentStock) && simulation.unit ? ` ${simulation.unit}` : ''}</small>
          <EvidenceLinks evidenceIds={beforeEvidenceIds} locale={locale} onOpen={onOpenEvidence} contextLabel={sgText(locale, 'before')} />
        </div>
        <div className="sg-simulation-arrow" aria-hidden="true">→</div>
        <div className="sg-simulation-state sg-simulation-after">
          <span>{sgText(locale, 'after')}</span>
          <strong>{displayBackendValue(coverageAfter, locale)}{hasBackendValue(coverageAfter) ? ` ${sgText(locale, 'daysUnit')}` : ''}</strong>
          <small>{sgText(locale, 'reorderQuantity')}: {displayBackendValue(reorderQuantity, locale)}{hasBackendValue(reorderQuantity) && simulation.unit ? ` ${simulation.unit}` : ''}</small>
          <EvidenceLinks evidenceIds={afterEvidenceIds} locale={locale} onOpen={onOpenEvidence} contextLabel={sgText(locale, 'after')} />
        </div>
      </div>
      <div className="sg-simulation-safety" role="note" aria-label={sgText(locale, 'simulatorSafetyTitle')}>
        {[['humanReviewRequired', '◆'], ['noSupplierContacted', '○'], ['noPaymentInitiated', '○'], ['noInventoryChanged', '○']].map(([key, icon]) => (
          <span key={key}><b aria-hidden="true">{icon}</b>{sgText(locale, key)}</span>
        ))}
      </div>
      <section className="sg-result-section sg-result-evidence" aria-labelledby={evidenceHeadingId}>
        <h4 id={evidenceHeadingId}>{sgText(locale, 'verifiedFacts')}</h4>
        <EvidenceValueGrid locale={locale} evidenceIds={simulation.evidenceIds} onOpen={onOpenEvidence} items={[
          { evidenceKey: 'currentStock', label: sgText(locale, 'currentStock'), value: simulation.currentOnHandQuantity, suffix: simulation.unit },
          { evidenceKey: 'netUnitsSold', label: sgText(locale, 'netUnitsSold'), value: simulation.netUnitsSold, suffix: simulation.unit },
          { evidenceKey: 'velocity', label: sgText(locale, 'velocity'), value: simulation.velocityUnitsPerDay, suffix: simulation.unit },
          { evidenceKey: 'reorderQuantity', label: sgText(locale, 'reorderQuantity'), value: simulation.reorderQuantity, suffix: simulation.unit },
          { evidenceKey: 'coverageBefore', label: sgText(locale, 'coverageBefore'), value: simulation.coverageBeforeDays, suffix: sgText(locale, 'daysUnit') },
          { evidenceKey: 'coverageAfter', label: sgText(locale, 'coverageAfter'), value: simulation.coverageAfterDays, suffix: sgText(locale, 'daysUnit') },
          { evidenceKey: 'stockoutRisk', label: sgText(locale, 'stockoutRisk'), value: simulationRiskLabel(simulation.stockoutRisk, locale) },
          { evidenceKey: 'overstockRisk', label: sgText(locale, 'overstockRisk'), value: simulationRiskLabel(simulation.overstockRisk, locale) },
          { evidenceKey: 'tiedUpCapital', label: sgText(locale, 'tiedUpCapital'), value: simulation.tiedUpCapitalUzs, suffix: 'UZS' },
        ]} />
      </section>
      <div className="sg-detail-columns">
        <TextList title={sgText(locale, 'assumptions')} items={safeSimulationNarratives(simulation.assumptions, locale)} emptyText={simulation.classification === 'ESTIMATED' ? sgText(locale, 'insufficientEvidence') : null} />
        <TextList title={sgText(locale, 'risks')} items={safeSimulationRisks(simulation.risks, locale)} />
        <TextList title={sgText(locale, 'limitations')} items={safeSimulationNarratives(simulation.limitations, locale)} />
      </div>
      <EvidenceLinks evidenceIds={evidenceForField(simulation.evidenceIds, 'classification')} locale={locale} onOpen={onOpenEvidence} contextLabel={sgText(locale, 'result')} />
      <section className="sg-result-section sg-technical-meta" aria-labelledby={metadataHeadingId}>
        <h4 id={metadataHeadingId}>{sgText(locale, 'technicalMetadata')}</h4>
        <ValueGrid locale={locale} items={[
          { label: sgText(locale, 'analysisRun'), value: simulation.analysisRunId },
          { label: sgText(locale, 'calculation'), value: simulation.calculationId && simulation.calculationVersion ? `${simulation.calculationId} / ${simulation.calculationVersion}` : null },
          { label: sgText(locale, 'selectedPeriod'), value: simulation.lookbackStart && simulation.lookbackEnd ? `${simulation.lookbackStart} → ${simulation.lookbackEnd}` : null },
          { label: sgText(locale, 'generatedAt'), value: simulation.generatedAt ? formatSavdoGraphDateTime(simulation.generatedAt, locale) : null, wide: true },
        ]} />
      </section>
    </article>
  );
}
export function SupplierBridgeControls({
  locale = 'UZ', suppliers = [], supplierId = '', supplierLoading = false,
  proposalLoading = false, onSupplierChange, onCreateProposal,
}) {
  return (
    <div className="sg-bridge-bar">
      <label className="sg-field">
        <span>{sgText(locale, 'supplier')}</span>
        <select className="select" value={supplierId} onChange={onSupplierChange} disabled={supplierLoading}>
          <option value="">{supplierLoading ? sgText(locale, 'loading') : sgText(locale, 'chooseSupplier')}</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
      </label>
      <button type="button" className="btn btn-accent" onClick={onCreateProposal} disabled={!supplierId || proposalLoading}>
        {proposalLoading ? sgText(locale, 'loading') : sgText(locale, 'createProposal')}
      </button>
    </div>
  );
}

export function ProposalCard({ proposal, decision, canDecide, locale = 'UZ', onOpenEvidence, onDecision }) {
  const evidenceHeadingId = useId();
  const metadataHeadingId = useId();
  if (!proposal) return <div className="sg-empty"><span aria-hidden="true">⊙</span><p>{sgText(locale, 'noProposal')}</p></div>;
  const status = decision?.proposalStatus || proposal.proposalStatus || proposal.status;
  const quantity = proposal.reorderQuantity ?? proposal.proposedReorderQuantity;
  return (
    <article className="sg-result sg-result-hierarchy sg-proposal" data-result="proposal-review">
      <div className="sg-result-head">
        <span className={`sg-status sg-status-${String(status || '').toLowerCase()}`}>{statusLabel(status, locale)}</span>
        <ClassificationBadge classification={proposal.classification} locale={locale} />
      </div>
      <ValueGrid locale={locale} items={[
        { label: sgText(locale, 'product'), value: proposal.productDisplayName },
        { label: 'SKU', value: proposal.productSku ?? proposal.sku },
        { label: sgText(locale, 'supplier'), value: proposal.supplierDisplayName },
        { label: sgText(locale, 'quantity'), value: quantity, suffix: proposal.unit },
      ]} />
      <section className="sg-result-section sg-result-evidence" aria-labelledby={evidenceHeadingId}>
        <h4 id={evidenceHeadingId}>{sgText(locale, 'evidencePlural')}</h4>
        <EvidenceLinks evidenceIds={proposal.evidenceIds} locale={locale} onOpen={onOpenEvidence} />
      </section>
      <div className="sg-simulation-safety sg-proposal-safety" role="note" aria-label={sgText(locale, 'decisionWarning')}>
        {[['noSupplierContacted', '○'], ['noPaymentInitiated', '○'], ['noInventoryChanged', '○'], ['approvalCreatesOneDraft', '◆']].map(([key, icon]) => (
          <span key={key}><b aria-hidden="true">{icon}</b>{sgText(locale, key)}</span>
        ))}
      </div>
      {proposal.idempotent && <AsyncNotice>{sgText(locale, 'idempotentReplay')}</AsyncNotice>}
      <div className="sg-detail-columns">
        <TextList title={sgText(locale, 'assumptions')} items={safeSimulationNarratives(proposal.assumptions, locale)} />
        <TextList title={sgText(locale, 'risks')} items={safeSimulationRisks(proposal.risks, locale)} />
        <TextList title={sgText(locale, 'limitations')} items={safeSimulationNarratives(proposal.limitations, locale)} />
      </div>
      <section className="sg-result-section sg-technical-meta" aria-labelledby={metadataHeadingId}>
        <h4 id={metadataHeadingId}>{sgText(locale, 'technicalMetadata')}</h4>
        <ValueGrid locale={locale} items={[
          { label: sgText(locale, 'proposalId'), value: proposal.proposalId ?? proposal.id },
          { label: sgText(locale, 'sourceRun'), value: proposal.sourceAnalysisRunId ?? proposal.analysisRunId },
          { label: sgText(locale, 'generatedAt'), value: proposal.createdAt ? formatSavdoGraphDateTime(proposal.createdAt, locale) : null },
          { label: sgText(locale, 'draftReference'), value: decision?.purchaseOrderId },
        ]} />
      </section>
      {canDecide && isReviewPendingStatus(status) && (
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
  if (!Array.isArray(events) || events.length === 0) return <div className="sg-empty"><span aria-hidden="true">◷</span><p>{sgText(locale, 'noLedger')}</p></div>;
  return (
    <div className="sg-ledger-wrap">
      <p className="sg-ledger-readonly">{sgText(locale, 'ledgerHint')}</p>
      <ol className="sg-ledger sg-ledger-compact" aria-label={sgText(locale, 'recordedHistory')}>
        {events.map((event, index) => {
          const proposalId = Number(event.proposalId);
          const purchaseOrderId = Number(event.purchaseOrderId);
          const presentation = presentLedgerEvent(event, locale);
          return (
            <li key={event.id ?? `${event.eventType || 'event'}-${index}`}>
              <div className="sg-ledger-marker" aria-hidden="true">●</div>
              <article>
                <div className="sg-ledger-head">
                  <strong>{presentation.eventLabel}</strong>
                  <time dateTime={event.createdAt || undefined}>{event.createdAt ? formatSavdoGraphDateTime(event.createdAt, locale) : sgText(locale, 'notAvailable')}</time>
                </div>
                <div className="sg-ledger-grid">
                  <span>{sgText(locale, 'outcome')}: <strong>{presentation.outcomeLabel}</strong></span>
                  <span>{sgText(locale, 'actor')}: <strong>{presentation.actorLabel}</strong></span>
                  {Number.isInteger(proposalId) && proposalId > 0 && <span>{sgText(locale, 'proposalReference')}: <strong>#{proposalId}</strong></span>}
                  {Number.isInteger(purchaseOrderId) && purchaseOrderId > 0 && <span>{sgText(locale, 'draftReference')}: <strong>#{purchaseOrderId}</strong></span>}
                </div>
                {presentation.detail && <p className="sg-ledger-detail">{presentation.detail}</p>}
                <EvidenceLinks evidenceIds={parseEvidenceReferences(event.evidenceReferences)} locale={locale} onOpen={onOpenEvidence} />
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
function useAccessibleOverlay(open, onClose, panelRef) {
  const returnFocusRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
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
      document.body.style.overflow = previousBodyOverflow;
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
        <header><div><span className="sg-eyebrow">{sgText(locale, 'evidencePlural')}</span><h2 id={titleId}>{sgText(locale, 'evidenceViewer')}</h2></div><button type="button" className="sg-icon-button" onClick={onClose} aria-label={sgText(locale, 'close')}>×</button></header>
        <div className="sg-drawer-body">
          {loading && <div className="sg-skeleton-stack" aria-label={sgText(locale, 'loading')}><i /><i /><i /></div>}
          {error && <AsyncNotice tone="error">{error} {onRetry && <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>{sgText(locale, 'retry')}</button>}</AsyncNotice>}
          {evidence && (
            <>
              <ValueGrid locale={locale} items={[
                { label: sgText(locale, 'evidenceId'), value: evidence.id },
                { label: sgText(locale, 'evidenceType'), value: evidence.evidenceType },
                { label: sgText(locale, 'calculation'), value: evidence.calculationId && evidence.calculationVersion ? `${evidence.calculationId} / ${evidence.calculationVersion}` : null },
                { label: sgText(locale, 'sourcePeriod'), value: evidence.periodFrom && evidence.periodTo ? `${evidence.periodFrom} → ${evidence.periodTo}` : null },
                { label: sgText(locale, 'result'), value: evidence.calculatedResult },
                { label: sgText(locale, 'unitCurrency'), value: [evidence.unit, evidence.currency].filter(Boolean).join(' / ') || null },
                { label: sgText(locale, 'generatedAt'), value: evidence.createdAt ? formatSavdoGraphDateTime(evidence.createdAt, locale) : null },
                { label: sgText(locale, 'integrityRecorded'), value: evidence.contentHash ? '✓' : null },
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
        <header><div><span className="sg-eyebrow">{sgText(locale, 'confirmDecision')}</span><h2 id={titleId}>{sgText(locale, approve ? 'approveProposal' : 'rejectProposal')}</h2></div><button type="button" className="sg-icon-button" onClick={onClose} disabled={pending} aria-label={sgText(locale, 'close')}>×</button></header>
        <div className="sg-dialog-body">
          <ValueGrid locale={locale} items={[
            { label: sgText(locale, 'product'), value: proposal.productDisplayName },
            { label: 'SKU', value: proposal.productSku ?? proposal.sku },
            { label: sgText(locale, 'quantity'), value: proposal.reorderQuantity ?? proposal.proposedReorderQuantity, suffix: proposal.unit },
            { label: sgText(locale, 'supplier'), value: proposal.supplierDisplayName },
          ]} />
          <ClassificationBadge classification={proposal.classification} locale={locale} />
          <TextList title={sgText(locale, 'assumptions')} items={safeSimulationNarratives(proposal.assumptions, locale).slice(0, 3)} />
          <TextList title={sgText(locale, 'risks')} items={safeSimulationRisks(proposal.risks, locale).slice(0, 3)} />
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
