import {
  buildDecisionTrace,
  buildPolicyShield,
  buildProofGraph,
  decisionEvidenceIds,
  displayBackendValue,
  evidenceIdList,
  formatSavdoGraphDateTime,
  isSimulationEligible,
  PROOFTWIN_BRAND,
  simulationNarrativeText,
  simulationRiskLabel,
  sgText,
  statusLabel,
} from './model.js';
import { ClassificationBadge } from './components.jsx';

const JUDGE_STAGES = Object.freeze([
  { labelKey: 'judgeStageGrossProfit', hintKey: 'judgeStageGrossProfitHint', targetId: 'sg-answer-section' },
  { labelKey: 'judgeStageAskProof', hintKey: 'judgeStageAskProofHint', targetId: 'sg-ask-section' },
  { labelKey: 'judgeStageCompareFutures', hintKey: 'judgeStageCompareFuturesHint', targetId: 'sg-decision-twin' },
  { labelKey: 'judgeStagePolicy', hintKey: 'judgeStagePolicyHint', targetId: 'sg-policy-shield' },
  { labelKey: 'judgeStageProposal', hintKey: 'judgeStageProposalHint', targetId: 'sg-proposal-section' },
  { labelKey: 'judgeStageApproveDraft', hintKey: 'judgeStageApproveDraftHint', targetId: 'sg-proposal-section' },
  { labelKey: 'judgeStageLedger', hintKey: 'judgeStageLedgerHint', targetId: 'sg-ledger-section' },
]);

const WORKFLOW_STEPS = Object.freeze([
  { key: 'understand', hintKey: 'understandHint' },
  { key: 'simulate', hintKey: 'simulateHint' },
  { key: 'approveStage', hintKey: 'approveStageHint' },
]);

const SCENARIO_KEYS = Object.freeze(['scenarioNoAction', 'scenarioBalanced', 'scenarioHighCoverage']);
const TRACE_STATE_KEYS = Object.freeze({
  completed: 'traceComplete',
  current: 'traceCurrent',
  blocked: 'traceBlocked',
  not_started: 'traceNotStarted',
});
const POLICY_STATUS_KEYS = Object.freeze({
  ENFORCED: 'policyEnforced',
  VERIFIED: 'policyVerified',
  RECORDED: 'policyRecorded',
  PENDING: 'policyPending',
  NOT_OBSERVED: 'policyNotObserved',
  NOT_APPLICABLE: 'policyNotObserved',
  BLOCKED: 'traceBlocked',
});

function PlaceholderValue({ children, demoMode, locale }) {
  return (
    <span className="sg-command-placeholder">
      {demoMode && <small>{sgText(locale, 'demoPlaceholder')}</small>}
      <strong>{children}</strong>
    </span>
  );
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
}

function localizedSimulationNarratives(value, locale) {
  return [...new Set(asArray(value).map((item) => simulationNarrativeText(item, locale)))];
}

function dedupeSimulations(simulations, simulation) {
  const values = [...asArray(simulations), ...asArray(simulation)];
  const seen = new Set();
  return values.filter((value) => {
    const key = value?.scenarioId ?? value?.scenarioKey ?? value?.analysisRunId ?? value;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function workflowStates({ brief, askResponse, simulations, simulation, proposal, decision, ledger }) {
  const allSimulations = dedupeSimulations(simulations, simulation);
  const hasBriefProof = brief?.classification === 'VERIFIED' && decisionEvidenceIds(brief).length > 0;
  const hasAnswerProof = askResponse?.status === 'ANSWERED' && decisionEvidenceIds(askResponse).length > 0;
  const understandBlocked = askResponse?.status === 'GROUNDEDNESS_VALIDATION_FAILED';
  const understood = hasBriefProof || hasAnswerProof;
  const simulated = allSimulations.some((item) => {
    const result = item?.simulation ?? item?.result ?? item;
    return Number(result?.analysisRunId) > 0 && decisionEvidenceIds(result).length > 0;
  });
  const proposalId = Number(proposal?.proposalId);
  const proposalExists = Number.isSafeInteger(proposalId) && proposalId > 0;
  const decisionStatus = String(
    decision?.proposalStatus
      ?? decision?.status
      ?? proposal?.proposalStatus
      ?? proposal?.status
      ?? '',
  ).toUpperCase();
  const decided = ['APPROVED', 'REJECTED', 'DRAFT_CREATED'].includes(decisionStatus)
    || Number(decision?.purchaseOrderId) > 0
    || (proposalExists && asArray(ledger).some((event) =>
      Number(event?.proposalId) === proposalId
      && [
        'PROPOSAL_APPROVED',
        'PROPOSAL_REJECTED',
        'DRAFT_PURCHASE_ORDER_CREATED',
      ].includes(String(event?.eventType).toUpperCase())));

  if (understandBlocked) return ['blocked', 'not_started', 'not_started'];
  if (!understood) return ['current', 'not_started', 'not_started'];
  if (!simulated) return ['completed', 'current', 'not_started'];
  if (decided) return ['completed', 'completed', 'completed'];
  return ['completed', 'completed', proposalExists ? 'current' : 'current'];
}

function stateText(locale, state) {
  if (state === 'completed') return sgText(locale, 'workflowComplete');
  if (state === 'not_started') return sgText(locale, 'workflowNotStarted');
  if (state === 'blocked') return sgText(locale, 'workflowBlocked');
  return sgText(locale, 'workflowCurrent');
}

function traceState(step, index, steps, response) {
  if (response?.status === 'GROUNDEDNESS_VALIDATION_FAILED') {
    const validationIndex = steps.findIndex((item) => item.key === 'traceGroundingChecked');
    if (index === validationIndex) return 'blocked';
    if (validationIndex >= 0 && index > validationIndex) return 'not_started';
  }
  if (step.state === 'complete' || step.state === 'completed') return 'completed';
  if (step.state === 'blocked') return 'blocked';
  if (step.state === 'current') return 'current';
  if (step.state === 'not_started') return 'not_started';
  if (step.state === 'pending') {
    const firstPending = steps.findIndex((item) => item.state === 'pending');
    return index === firstPending ? 'current' : 'not_started';
  }
  return 'not_started';
}

function policyStatusText(locale, status) {
  const normalized = String(status || 'NOT_OBSERVED').toUpperCase();
  return sgText(locale, POLICY_STATUS_KEYS[normalized] || 'policyNotObserved');
}

function evidenceForField(simulation, field) {
  const raw = simulation?.evidenceIds;
  if (Array.isArray(raw)) return evidenceIdList(raw);
  if (!raw || typeof raw !== 'object') return [];

  const aliases = {
    currentOnHandQuantity: ['currentOnHandQuantity', 'currentStock', 'onHand'],
    reorderQuantity: ['reorderQuantity', 'quantity'],
    coverageBeforeDays: ['coverageBeforeDays', 'coverageBefore'],
    coverageAfterDays: ['coverageAfterDays', 'coverageAfter'],
    velocityUnitsPerDay: ['velocityUnitsPerDay', 'velocity'],
  };
  return evidenceIdList((aliases[field] || [field]).map((key) => raw[key]));
}

function scenarioDescriptor(entry, index) {
  const simulation = entry?.simulation ?? entry?.result ?? entry;
  const scenarioKey = entry?.scenarioKey ?? entry?.key ?? SCENARIO_KEYS[index] ?? ('scenario-' + (index + 1));
  const isNoAction = index === 0 || ['NO_ACTION', 'CURRENT', 'CURRENT_NO_ACTION'].includes(String(
    entry?.scenarioType ?? entry?.type ?? entry?.scenario ?? '',
  ).toUpperCase());
  const runBacked = Number.isInteger(Number(simulation?.analysisRunId)) && Number(simulation.analysisRunId) > 0;
  const evidence = decisionEvidenceIds(simulation);
  const estimated = simulation?.classification === 'ESTIMATED';
  const zeroEvidence = evidenceForField(simulation, 'reorderQuantity');
  const noActionProven = !isNoAction
    || (Number(simulation?.reorderQuantity) === 0 && zeroEvidence.length > 0);
  const explicitlyUnsupported = entry?.status === 'UNSUPPORTED'
    || entry?.supported === false
    || simulation?.classification === 'UNSUPPORTED'
    || simulation?.classification === 'INSUFFICIENT_DATA';

  return {
    entry,
    simulation,
    scenarioKey,
    isNoAction,
    evidence,
    supported: !explicitlyUnsupported && runBacked && estimated && evidence.length > 0 && noActionProven,
  };
}

function ScenarioFact({ label, value, suffix, evidence, locale }) {
  if (value === null || value === undefined || value === '' || evidence.length === 0) return null;
  return (
    <div className="sg-twin-fact" data-evidence-backed="true">
      <dt>{label}</dt>
      <dd>
        <strong>{displayBackendValue(value, locale)}{suffix ? ' ' + suffix : ''}</strong>
        <small>{evidence.map((id) => '#' + id).join(', ')}</small>
      </dd>
    </div>
  );
}

function graphNodeLabel(node, locale) {
  if (node?.label) return String(node.label);
  return sgText(locale, node?.labelKey || 'proofGraph');
}

function graphNodeEvidenceId(node) {
  const direct = Number(node?.evidenceId);
  if (Number.isInteger(direct) && direct > 0) return direct;
  return evidenceIdList(node?.evidenceIds)[0] ?? null;
}

function safeGraphNodeValue(node, evidenceId, locale) {
  if (node?.value === null || node?.value === undefined || node?.value === '') return null;
  if (typeof node.value === 'number' && evidenceId == null) return null;
  return displayBackendValue(node.value, locale) + (node.unit ? ' ' + node.unit : '');
}

export function DecisionCommandHeader({
  brief,
  askResponse,
  simulation,
  simulations = [],
  proposal,
  decision,
  ledger = [],
  periodStart,
  periodEnd,
  latestTimestamp,
  demoMode = false,
  locale = 'UZ',
  judgeMode = false,
  onStartJudge,
}) {
  const allSimulations = dedupeSimulations(simulations, simulation);
  const evidenceIds = decisionEvidenceIds(brief, askResponse, allSimulations, proposal, decision, ledger);
  const grossProfitEvidence = evidenceIdList([brief?.evidenceIds?.grossProfit]);
  const proposalStatus = decision?.proposalStatus
    ?? decision?.status
    ?? proposal?.proposalStatus
    ?? proposal?.status
    ?? (Number(decision?.purchaseOrderId) > 0 ? 'DRAFT_CREATED' : null);
  const verifiedGrossProfit = brief?.classification === 'VERIFIED'
    && brief.grossProfitUzs != null
    && grossProfitEvidence.length > 0
    && typeof brief.currency === 'string'
    && brief.currency.trim()
    ? brief.grossProfitUzs
    : null;
  const currency = verifiedGrossProfit != null ? brief.currency.trim() : null;

  return (
    <section className="sg-command-center" aria-labelledby="sg-command-title">
      <div className="sg-command-hero">
        <div className="sg-command-identity">
          <span className="sg-product-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <div>
            <span className="sg-eyebrow">{sgText(locale, 'decisionCommand')}</span>
            <h1 id="sg-command-title">{PROOFTWIN_BRAND}</h1>
            <p className="sg-product-promise">{sgText(locale, 'productPromise')}</p>
            <p className="sg-product-support">{sgText(locale, 'productSupport')}</p>
          </div>
        </div>
        <div className="sg-command-actions">
          <span className="sg-approval-required"><span aria-hidden="true">✓</span> {sgText(locale, 'humanApproval')} {sgText(locale, 'required')}</span>
          <button type="button" className="btn btn-accent sg-judge-start" aria-pressed={judgeMode} onClick={onStartJudge}>
            <span aria-hidden="true">▶</span>{sgText(locale, 'judgeStart')}
          </button>
        </div>
      </div>

      <dl className="sg-command-metrics">
        <div className="sg-command-card sg-command-primary">
          <dt>{sgText(locale, 'verifiedGrossProfit')}</dt>
          <dd>{verifiedGrossProfit != null
            ? <><strong>{displayBackendValue(verifiedGrossProfit, locale)} {currency}</strong><ClassificationBadge classification="VERIFIED" locale={locale} /></>
            : <PlaceholderValue demoMode={demoMode} locale={locale}>{sgText(locale, 'awaitingVerifiedBrief')}</PlaceholderValue>}</dd>
        </div>
        <div className="sg-command-card">
          <dt>{sgText(locale, 'immutableEvidenceCount')}</dt>
          <dd>{evidenceIds.length > 0
            ? <strong>{displayBackendValue(evidenceIds.length, locale)}</strong>
            : <PlaceholderValue demoMode={demoMode} locale={locale}>{sgText(locale, 'noEvidenceLoaded')}</PlaceholderValue>}</dd>
        </div>
        <div className="sg-command-card">
          <dt>{sgText(locale, 'currentDecision')}</dt>
          <dd>{proposalStatus
            ? <span className={'sg-status sg-status-' + String(proposalStatus).toLowerCase()}>{statusLabel(proposalStatus, locale)}</span>
            : <PlaceholderValue demoMode={demoMode} locale={locale}>{sgText(locale, 'noProposalYet')}</PlaceholderValue>}</dd>
        </div>
        <div className="sg-command-card sg-policy-metric">
          <dt>{sgText(locale, 'autonomousSpend')}</dt>
          <dd>
            <strong aria-describedby="sg-zero-spend-policy">0 UZS</strong>
            <span id="sg-zero-spend-policy" className="sg-policy-tooltip" role="tooltip" title={sgText(locale, 'policyAutonomousTooltip')}>
              {sgText(locale, 'policyAutonomousTooltip')}
            </span>
          </dd>
        </div>
      </dl>

      <div className="sg-command-context">
        <span>{sgText(locale, 'selectedPeriod')}: <b>{periodStart || '—'} <span aria-hidden="true">→</span> {periodEnd || '—'}</b></span>
        <span>{sgText(locale, 'timezone')}: <b>Asia/Tashkent (UTC+5)</b></span>
        <span>{sgText(locale, 'freshness')}: <b>{latestTimestamp ? formatSavdoGraphDateTime(latestTimestamp, locale) : sgText(locale, 'notGenerated')}</b></span>
      </div>
    </section>
  );
}

export function WorkflowRail({
  brief,
  askResponse,
  simulation,
  simulations = [],
  proposal,
  decision,
  ledger = [],
  locale = 'UZ',
  activeStage,
}) {
  const derived = workflowStates({ brief, askResponse, simulation, simulations, proposal, decision, ledger });
  const forcedIndex = Number.isInteger(activeStage) && activeStage >= 0 && activeStage < WORKFLOW_STEPS.length ? activeStage : null;
  const states = forcedIndex == null
    ? derived
    : derived.map((state, index) => (state === 'completed' || state === 'blocked'
      ? state
      : index === forcedIndex ? 'current' : 'not_started'));

  return (
    <nav className="sg-workflow-rail" data-testid="savdograph-workflow" aria-label={sgText(locale, 'workflowRail')}>
      <ol>
        {WORKFLOW_STEPS.map((step, index) => {
          const state = states[index];
          return (
            <li key={step.key} className={'sg-workflow-' + state} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="sg-workflow-number" aria-hidden="true">{index + 1}</span>
              <div><strong>{sgText(locale, step.key)}</strong><small>{sgText(locale, step.hintKey)}</small></div>
              <em>{stateText(locale, state)}</em>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function TrustStrip({ locale = 'UZ' }) {
  const items = [['trustImmutable', '§'], ['trustDeterministic', '∑'], ['trustHumanApproval', '◇'], ['trustZeroSpend', '0']];
  return (
    <ul className="sg-trust-strip" aria-label={sgText(locale, 'safeEnvironment')}>
      {items.map(([key, icon]) => <li key={key}><span aria-hidden="true">{icon}</span><strong>{sgText(locale, key)}</strong></li>)}
    </ul>
  );
}

export function JudgeModeGuide({ active, locale = 'UZ', currentStage = 0, onExit, onNavigate, onStageChange }) {
  if (!active) return null;
  const index = Math.min(Math.max(Number.isInteger(currentStage) ? currentStage : 0, 0), JUDGE_STAGES.length - 1);
  const navigate = (nextIndex) => {
    const bounded = Math.min(Math.max(nextIndex, 0), JUDGE_STAGES.length - 1);
    const stage = JUDGE_STAGES[bounded];
    onStageChange?.(bounded);
    onNavigate?.(stage.targetId, bounded);
  };

  return (
    <section className="sg-judge-guide" aria-labelledby="sg-judge-title" data-testid="savdograph-judge-guide">
      <div className="sg-judge-intro">
        <span className="sg-eyebrow">{sgText(locale, 'judgeDuration')}</span>
        <h2 id="sg-judge-title">{sgText(locale, 'judgeMode')}</h2>
        <p>{sgText(locale, 'judgeModeHint')}</p>
        <strong className="sg-judge-progress" aria-live="polite">{index + 1} / {JUDGE_STAGES.length} · {sgText(locale, 'judgeStepOf')}</strong>
      </div>

      <ol className="sg-judge-stages">
        {JUDGE_STAGES.map((stage, stageIndex) => {
          const state = stageIndex < index ? 'completed' : stageIndex === index ? 'current' : 'not_started';
          return (
            <li key={stage.labelKey} className={'sg-judge-' + state} data-state={state}>
              <button type="button" aria-current={state === 'current' ? 'step' : undefined} onClick={() => navigate(stageIndex)}>
                <span>{String(stageIndex + 1).padStart(2, '0')}</span>
                <strong>{sgText(locale, stage.labelKey)}</strong>
                <small>{sgText(locale, stage.hintKey)}</small>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="sg-judge-controls">
        <button type="button" className="btn btn-ghost" disabled={index === 0} onClick={() => navigate(index - 1)}>
          <span aria-hidden="true">←</span> {sgText(locale, 'judgeBack')}
        </button>
        <button type="button" className="btn btn-primary" disabled={index === JUDGE_STAGES.length - 1} onClick={() => navigate(index + 1)}>
          {sgText(locale, 'judgeNext')} <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="btn btn-ghost" onClick={onExit}>{sgText(locale, 'judgeExit')}</button>
      </div>
    </section>
  );
}

export function DecisionTrace({ response, locale = 'UZ' }) {
  const steps = buildDecisionTrace(response);
  if (steps.length === 0) return null;
  return (
    <section className="sg-decision-trace" aria-labelledby="sg-trace-title">
      <header><div><h3 id="sg-trace-title">{sgText(locale, 'decisionTrace')}</h3><p>{sgText(locale, 'decisionTraceHint')}</p></div></header>
      <ol>
        {steps.map((step, index) => {
          const state = traceState(step, index, steps, response);
          let detail = step.detail;
          if (step.key === 'traceEvidenceLoaded' && detail != null) detail = displayBackendValue(detail, locale) + ' ' + sgText(locale, 'evidenceReferences');
          if ((step.key === 'traceGroundingChecked' || step.key === 'traceAnswerReleased') && detail) detail = statusLabel(detail, locale);
          return (
            <li key={step.key} className={'sg-trace-' + state} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="sg-trace-marker" aria-hidden="true">{state === 'completed' ? '✓' : state === 'blocked' ? '!' : state === 'current' ? '→' : '○'}</span>
              <div><strong>{sgText(locale, step.key)}</strong>{detail != null && <small>{String(detail)}</small>}</div>
              <em>{sgText(locale, TRACE_STATE_KEYS[state])}</em>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function DecisionTwin({ scenarios = [], locale = 'UZ', selectedScenarioId, onSelectScenario, onOpenEvidence }) {
  const scenarioList = asArray(scenarios);
  const descriptors = [0, 1, 2].map((index) => scenarioDescriptor(scenarioList[index], index));

  return (
    <section id="sg-decision-twin" className="sg-decision-twin" data-testid="savdograph-decision-twin" aria-labelledby="sg-decision-twin-title" tabIndex={-1}>
      <header className="sg-section-heading"><div><span className="sg-eyebrow">{sgText(locale, 'simulationOnly')}</span><h2 id="sg-decision-twin-title">{sgText(locale, 'decisionTwin')}</h2><p>{sgText(locale, 'decisionTwinHint')}</p></div></header>
      <div className="sg-twin-scenarios">
        {descriptors.map((descriptor, index) => {
          const simulation = descriptor.simulation;
          const scenarioKey = descriptor.scenarioKey;
          const scenarioId = descriptor.entry?.scenarioId ?? simulation?.analysisRunId ?? scenarioKey;
          const selected = String(selectedScenarioId ?? '') === String(scenarioId);
          const eligible = descriptor.supported && !descriptor.isNoAction && isSimulationEligible(simulation);
          const coverageField = descriptor.isNoAction ? 'coverageBeforeDays' : 'coverageAfterDays';
          const stockoutRisk = simulation?.stockoutRisk == null ? null : simulationRiskLabel(simulation.stockoutRisk, locale);
          const overstockRisk = simulation?.overstockRisk == null ? null : simulationRiskLabel(simulation.overstockRisk, locale);
          const assumptions = localizedSimulationNarratives(simulation?.assumptions, locale);
          const limitations = localizedSimulationNarratives(simulation?.limitations, locale);

          return (
            <article
              key={String(scenarioId)}
              className={'sg-twin-scenario sg-twin-' + (index === 0 ? 'current' : index === 1 ? 'balanced' : 'high') + (selected ? ' is-selected' : '')}
              data-supported={descriptor.supported}
            >
              <header>
                <span className="sg-scenario-index">{String.fromCharCode(65 + index)}</span>
                <div><h3>{sgText(locale, SCENARIO_KEYS[index])}</h3><small>{descriptor.supported ? sgText(locale, 'scenarioServerBacked') : sgText(locale, 'scenarioUnsupported')}</small></div>
                <ClassificationBadge classification={descriptor.supported ? simulation.classification : 'INSUFFICIENT_DATA'} locale={locale} />
              </header>

              {descriptor.supported ? (
                <>
                  <dl className="sg-twin-facts">
                    <ScenarioFact label={sgText(locale, 'currentStock')} value={simulation.currentOnHandQuantity} suffix={simulation.unit} evidence={evidenceForField(simulation, 'currentOnHandQuantity')} locale={locale} />
                    <ScenarioFact label={sgText(locale, 'reorderQuantity')} value={simulation.reorderQuantity} suffix={simulation.unit} evidence={evidenceForField(simulation, 'reorderQuantity')} locale={locale} />
                    <ScenarioFact label={sgText(locale, 'coverage')} value={simulation[coverageField]} suffix={sgText(locale, 'daysUnit')} evidence={evidenceForField(simulation, coverageField)} locale={locale} />
                    <ScenarioFact label={sgText(locale, 'velocity')} value={simulation.velocityUnitsPerDay} suffix={simulation.unit} evidence={evidenceForField(simulation, 'velocityUnitsPerDay')} locale={locale} />
                    <ScenarioFact label={sgText(locale, 'stockoutRisk')} value={stockoutRisk} evidence={evidenceForField(simulation, 'stockoutRisk')} locale={locale} />
                    <ScenarioFact label={sgText(locale, 'overstockRisk')} value={overstockRisk} evidence={evidenceForField(simulation, 'overstockRisk')} locale={locale} />
                  </dl>

                  {assumptions.length > 0 && <div className="sg-twin-notes"><h4>{sgText(locale, 'assumptions')}</h4><ul>{assumptions.map((item, itemIndex) => <li key={itemIndex + '-' + item}>{item}</li>)}</ul></div>}
                  {limitations.length > 0 && <div className="sg-twin-notes"><h4>{sgText(locale, 'limitations')}</h4><ul>{limitations.map((item, itemIndex) => <li key={itemIndex + '-' + item}>{item}</li>)}</ul></div>}

                  <div className="sg-twin-evidence" aria-label={sgText(locale, 'evidenceReferences')}>
                    {descriptor.evidence.map((id) => <button type="button" key={id} className="sg-evidence-link" onClick={() => onOpenEvidence?.(id)}>{sgText(locale, 'openEvidence')} #{id}</button>)}
                  </div>
                </>
              ) : (
                <p className="sg-twin-unsupported" role="status">{descriptor.evidence.length === 0 ? sgText(locale, 'scenarioEvidenceMissing') : sgText(locale, 'scenarioUnsupported')}</p>
              )}

              {eligible && (
                <button type="button" className="btn btn-primary sg-twin-select" aria-pressed={selected} onClick={() => onSelectScenario?.(simulation, scenarioKey)}>
                  {selected ? sgText(locale, 'selectedForProposal') : sgText(locale, 'selectForProposal')}
                </button>
              )}
            </article>
          );
        })}
      </div>

      <ul className="sg-twin-safety" aria-label={sgText(locale, 'simulatorSafetyTitle')}>
        {['humanReviewRequired', 'noSupplierContacted', 'noPaymentInitiated', 'noInventoryChanged'].map((key) => <li key={key}><span aria-hidden="true">✓</span>{sgText(locale, key)}</li>)}
      </ul>
    </section>
  );
}

export function InteractiveProofGraph({
  brief,
  askResponse,
  simulations = [],
  proposal,
  decision,
  ledger = [],
  locale = 'UZ',
  onOpenEvidence,
  onFocusTarget,
}) {
  const graph = buildProofGraph({ brief, askResponse, simulations, proposal, decision, ledger }) || {};
  const nodes = asArray(graph.nodes);
  const nodeIds = new Set(nodes.map((node) => String(node.id)));
  const edges = asArray(graph.edges).filter((edge) => nodeIds.has(String(edge?.from)) && nodeIds.has(String(edge?.to)));
  const nodeById = new Map(nodes.map((node) => [String(node.id), node]));

  return (
    <section id="sg-proof-graph" className="sg-proof-graph" data-testid="savdograph-proof-graph" aria-labelledby="sg-proof-graph-title" tabIndex={-1}>
      <header className="sg-section-heading"><div><h2 id="sg-proof-graph-title">{sgText(locale, 'proofGraph')}</h2><p>{sgText(locale, 'proofGraphHint')}</p></div></header>
      {nodes.length === 0 ? (
        <p className="sg-inline-empty" role="status">{sgText(locale, 'proofGraphEmpty')}</p>
      ) : (
        <>
          <p className="sg-proof-mobile-hint">{sgText(locale, 'proofGraphMobileHint')}</p>
          <div className="sg-proof-canvas">
            <ol className="sg-proof-nodes">
              {nodes.map((node) => {
                const evidenceId = graphNodeEvidenceId(node);
                const targetId = node?.targetId || null;
                const value = safeGraphNodeValue(node, evidenceId, locale);
                const label = graphNodeLabel(node, locale);
                const actionLabel = evidenceId ? sgText(locale, 'openEvidence') + ' #' + evidenceId : targetId ? sgText(locale, 'focusWorkspace') : label;
                return (
                  <li key={String(node.id)} className={'sg-proof-node sg-proof-' + String(node.kind || 'record').toLowerCase()} data-node-id={node.id}>
                    <button
                      type="button"
                      aria-label={label + '. ' + actionLabel}
                      onClick={() => {
                        if (evidenceId) onOpenEvidence?.(evidenceId);
                        else if (targetId) onFocusTarget?.(targetId);
                      }}
                    >
                      <span className="sg-proof-kind">{sgText(locale, node.kindKey || node.kind || 'evidence')}</span>
                      <strong>{label}</strong>
                      {evidenceId && <small>{sgText(locale, 'evidenceId')}: #{evidenceId}</small>}
                      {value && <b>{value}</b>}
                      {node?.sourcePeriod && <small>{sgText(locale, 'sourcePeriod')}: {String(node.sourcePeriod)}</small>}
                      {node?.calculationVersion && <small>{String(node.calculationVersion)}</small>}
                      {node?.model && <small>{String(node.model)}</small>}
                      {node?.integrityState && <em>{String(node.integrityState)}</em>}
                    </button>
                  </li>
                );
              })}
            </ol>
            {edges.length > 0 && (
              <ul className="sg-proof-connectors" aria-label={sgText(locale, 'proofGraph')}>
                {edges.map((edge, index) => (
                  <li key={edge.from + '-' + edge.to + '-' + index} className="sg-proof-connector" data-from={edge.from} data-to={edge.to}>
                    <span>{graphNodeLabel(nodeById.get(String(edge.from)), locale)}</span>
                    <b aria-hidden="true">→</b>
                    <span>{graphNodeLabel(nodeById.get(String(edge.to)), locale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export function PolicyShield({
  brief,
  askResponse,
  simulations = [],
  proposal,
  decision,
  ledger = [],
  locale = 'UZ',
  onFocusTarget,
}) {
  const built = buildPolicyShield({ brief, askResponse, simulations, proposal, decision, ledger });
  const items = asArray(Array.isArray(built) ? built : built?.items);

  return (
    <section id="sg-policy-shield" className="sg-policy-shield" data-testid="savdograph-policy-shield" aria-labelledby="sg-policy-shield-title" tabIndex={-1}>
      <header className="sg-section-heading"><div><h2 id="sg-policy-shield-title">{sgText(locale, 'policyShield')}</h2><p>{sgText(locale, 'policyShieldHint')}</p></div></header>
      <div className="sg-policy-legend" aria-hidden="true"><span>{sgText(locale, 'systemPolicy')}</span><span>{sgText(locale, 'currentRun')}</span></div>
      <ul>
        {items.map((item) => {
          const label = item.label || sgText(locale, item.labelKey);
          const explanation = item.explanation || sgText(locale, item.explanationKey);
          const source = item.source || sgText(locale, item.sourceKey || 'sourceBackendContract');
          const systemStatus = String(item.systemStatus || 'NOT_OBSERVED').toUpperCase();
          const currentRunStatus = String(item.currentRunStatus || 'NOT_OBSERVED').toUpperCase();
          const content = (
            <>
              <span className="sg-policy-icon" aria-hidden="true">{systemStatus === 'ENFORCED' ? '✓' : '○'}</span>
              <span className="sg-policy-copy"><strong>{label}</strong><small>{explanation}</small><em>{sgText(locale, 'enforcementSource')}: {source}</em></span>
              <span className={'sg-policy-status sg-policy-system-' + systemStatus.toLowerCase()}><small>{sgText(locale, 'systemPolicy')}</small><b>{policyStatusText(locale, systemStatus)}</b></span>
              <span className={'sg-policy-status sg-policy-run-' + currentRunStatus.toLowerCase()}><small>{sgText(locale, 'currentRun')}</small><b>{policyStatusText(locale, currentRunStatus)}</b></span>
            </>
          );
          return <li key={item.id || item.labelKey}>{item.targetId ? <button type="button" onClick={() => onFocusTarget?.(item.targetId)}>{content}</button> : <div>{content}</div>}</li>;
        })}
      </ul>
    </section>
  );
}
