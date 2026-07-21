import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProductApi, SavdoGraphApi, SupplierApi } from '../api/endpoints.js';
import { useAuth } from '../context/Auth.jsx';
import { useSettings } from '../context/Settings.jsx';
import { useShop } from '../context/Shop.jsx';
import { IS_DEMO_DATA } from '../config.js';
import {
  askLocaleFromLanguage,
  boundedProducts,
  buildBridgeRequest,
  buildDecisionTwinRequests,
  buildDecisionRequest,
  canDecideSavdoGraph,
  canReadLedger,
  canReadSavdoGraph,
  canWriteSavdoGraph,
  createDecisionKey,
  isSimulationEligible,
  localizeAskResponseForPresentation,
  normaliseAskResponse,
  PROOFTWIN_BRAND,
  safeErrorKey,
  sgText,
  validatePeriod,
  validateSimulationInput,
  validateDecisionTwin,
  savdoGraphLocaleFromLanguage,
} from '../features/savdograph/model.js';
import {
  AskResult,
  AsyncNotice,
  BriefResult,
  DecisionDialog,
  DemoDataBanner,
  EvidenceDrawer,
  LedgerTimeline,
  ProposalCard,
  SupplierBridgeControls,
} from '../features/savdograph/components.jsx';
import {
  DecisionCommandHeader,
  DecisionTrace,
  DecisionTwin,
  InteractiveProofGraph,
  JudgeModeGuide,
  PolicyShield,
  TrustStrip,
  WorkflowRail,
} from '../features/savdograph/experience.jsx';
import { createSupplierLoader } from '../features/savdograph/supplierLoader.js';
import '../styles/savdograph.css';

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const GROSS_PROFIT_BRIEF_CLASSIFICATIONS = new Set([
  'VERIFIED',
  'ESTIMATED',
  'INSUFFICIENT_DATA',
  'UNSUPPORTED',
]);

function isoShift(days, from) {
  const date = from === undefined
    ? new Date(Date.now() + TASHKENT_OFFSET_MS)
    : new Date(from);
  if (!Number.isInteger(days) || Number.isNaN(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function localizedError(error, locale) {
  return sgText(locale, safeErrorKey(error));
}

export function isLinkedGrossProfitBrief(result, submittedPeriod) {
  const periodTimezoneEvidence = result?.evidenceIds?.periodTimezone;
  return Boolean(
    result
    && submittedPeriod
    && Number.isSafeInteger(result.analysisRunId)
    && result.analysisRunId > 0
    && GROSS_PROFIT_BRIEF_CLASSIFICATIONS.has(result.classification)
    && result.periodStart === submittedPeriod.periodStart
    && result.periodEnd === submittedPeriod.periodEnd
    && result.timezone === 'Asia/Tashkent'
    && Object.hasOwn(result.evidenceIds || {}, 'periodTimezone')
    && Number.isSafeInteger(periodTimezoneEvidence)
    && periodTimezoneEvidence > 0
  );
}

function Section({ id, title, hint, action, eyebrow, stage, className = '', children }) {
  const titleId = id + '-title';
  return (
    <section id={id + '-section'} className={'card sg-section ' + className} aria-labelledby={titleId} data-stage={stage} tabIndex="-1">
      <div className="card-head sg-section-head">
        <div>{eyebrow && <span className="sg-eyebrow">{eyebrow}</span>}<h2 id={titleId}>{title}</h2>{hint && <p>{hint}</p>}</div>
        {action && <div className="sg-section-action">{action}</div>}
      </div>
      <div className="card-pad">{children}</div>
    </section>
  );
}

function ProductPicker({ id, locale, selectedProduct, onSelect, disabled = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function search(event) {
    event?.preventDefault();
    const value = query.trim();
    if (!value) return;
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const response = await ProductApi.list({ search: value, status: 'ACTIVE' });
      setResults(boundedProducts(response));
    } catch (err) {
      setError(localizedError(err, locale));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sg-product-picker">
      <form className="sg-inline-form" onSubmit={search}>
        <label className="sg-field sg-grow" htmlFor={`${id}-search`}>
          <span>{sgText(locale, 'productSearch')}</span>
          <input id={`${id}-search`} className="input" value={query} maxLength="120" disabled={disabled} onChange={(event) => setQuery(event.target.value)} placeholder={sgText(locale, 'searchPlaceholder')} autoComplete="off" />
        </label>
        <button type="submit" className="btn btn-ghost" disabled={disabled || loading || !query.trim()} aria-label={`${sgText(locale, 'search')} ${sgText(locale, 'product')}`}>{loading ? sgText(locale, 'loading') : sgText(locale, 'search')}</button>
      </form>
      {error && <AsyncNotice tone="error">{error}</AsyncNotice>}
      {selectedProduct && (
        <div className="sg-selected-product" role="status">
          <span aria-hidden="true">✓</span><strong>{selectedProduct.name}</strong>
          <span>SKU: {selectedProduct.barcode || selectedProduct.sku || sgText(locale, 'notAvailable')}</span>
          <span>{sgText(locale, 'currentStock')}: {selectedProduct.quantity ?? sgText(locale, 'notAvailable')} {selectedProduct.unit || ''}</span>
        </div>
      )}
      {results.length > 0 && (
        <ul className="sg-product-results" aria-label={sgText(locale, 'productSearch')}>
          {results.map((product) => (
            <li key={product.id}>
              <div><strong>{product.name}</strong><span>SKU: {product.barcode || product.sku || sgText(locale, 'notAvailable')} · {sgText(locale, 'currentStock')}: {product.quantity ?? sgText(locale, 'notAvailable')} {product.unit || ''}</span></div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onSelect(product); setQuery(''); setResults([]); }} aria-label={`${sgText(locale, 'select')} ${product.name}`}>{selectedProduct?.id === product.id ? sgText(locale, 'selected') : sgText(locale, 'select')}</button>
            </li>
          ))}
        </ul>
      )}
      {!loading && query.trim() && results.length === 0 && !error && <p className="sg-inline-empty">{sgText(locale, 'noProducts')}</p>}
    </div>
  );
}

function AccessDenied({ locale }) {
  return (
    <section className="sg-denied" data-testid="savdograph-denied">
      <span className="sg-denied-icon" aria-hidden="true">⛔</span>
      <h1>{sgText(locale, 'deniedTitle')}</h1>
      <p>{sgText(locale, 'deniedBody')}</p>
    </section>
  );
}

export function SavdoGraph() {
  const shopContext = useShop();
  const scopeKey = shopContext.loading
    ? 'loading'
    : shopContext.isConsolidated
      ? `consolidated:${shopContext.activeShopId ?? 'all'}`
      : `shop:${shopContext.activeShopId ?? 'none'}`;
  return <ScopedSavdoGraph key={scopeKey} shopContext={shopContext} />;
}

function ScopedSavdoGraph({ shopContext }) {
  const { user } = useAuth();
  const { lang } = useSettings();
  const { activeShopId, isConsolidated, loading: shopsLoading } = shopContext;
  const locale = savdoGraphLocaleFromLanguage(lang);
  const askLocale = askLocaleFromLanguage(lang);
  const t = useCallback((key) => sgText(locale, key), [locale]);
  const allowed = canReadSavdoGraph(user);
  const writable = canWriteSavdoGraph(user);
  const decisionAuthority = canDecideSavdoGraph(user);
  const ledgerAuthority = canReadLedger(user);
  const singleStore = !shopsLoading && !isConsolidated && Number.isInteger(Number(activeShopId)) && Number(activeShopId) > 0;

  const [periodStart, setPeriodStart] = useState(() => isoShift(0));
  const [periodEnd, setPeriodEnd] = useState(() => isoShift(1));
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState('');

  const [question, setQuestion] = useState('');
  const [askProduct, setAskProduct] = useState(null);
  const [askResponse, setAskResponse] = useState(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState('');

  const [simulationProduct, setSimulationProduct] = useState(null);
  const [lookbackDays, setLookbackDays] = useState(30);
  const [twinScenarios, setTwinScenarios] = useState([]);
  const [twinValidation, setTwinValidation] = useState(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState('');

  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState('');
  const [decision, setDecision] = useState(null);

  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState('');

  const [evidenceDrawer, setEvidenceDrawer] = useState({ open: false, id: null, evidence: null, loading: false, error: '' });
  const [decisionDialog, setDecisionDialog] = useState({ open: false, kind: null, reason: '', pending: false, error: '' });
  const [judgeStage, setJudgeStage] = useState(0);
  const [judgeMode, setJudgeMode] = useState(() => (
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('judge') === '1'
  ));
  const decisionKeyRef = useRef(null);
  const supplierLoaderRef = useRef(null);
  if (!supplierLoaderRef.current) supplierLoaderRef.current = createSupplierLoader(() => SupplierApi.list());

  const simulations = useMemo(
    () => twinScenarios.map((scenarioItem) => scenarioItem?.result || scenarioItem).filter(Boolean),
    [twinScenarios],
  );
  const simulation = useMemo(
    () => simulations.find((item) => Number(item.analysisRunId) === Number(selectedScenarioId)) || null,
    [selectedScenarioId, simulations],
  );
  const presentedAskResponse = useMemo(
    () => localizeAskResponseForPresentation(askResponse, locale),
    [askResponse, locale],
  );
  const latestTimestamp = useMemo(() => [
    brief?.generatedAt,
    askResponse?.generatedAt,
    ...simulations.map((item) => item?.generatedAt),
    proposal?.createdAt,
    decision?.decidedAt,
  ].filter(Boolean).sort((left, right) => Date.parse(right) - Date.parse(left))[0] || null,
  [askResponse, brief, decision, proposal, simulations]);
  const eligible = isSimulationEligible(simulation);
  const exampleKey = locale === 'RU' ? 'ruExample' : locale === 'EN' ? 'enExample' : 'uzExample';

  const setJudgeModeWithUrl = useCallback((enabled) => {
    setJudgeMode(enabled);
    if (enabled) setJudgeStage(0);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (enabled) url.searchParams.set('judge', '1');
    else url.searchParams.delete('judge');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, []);

  const navigateJudgeStage = useCallback((targetId) => {
    if (typeof document === 'undefined') return;
    const target = document.getElementById(targetId);
    if (!target) return;
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (judgeMode) document.documentElement.dataset.savdographJudge = 'true';
    else delete document.documentElement.dataset.savdographJudge;
    return () => { delete document.documentElement.dataset.savdographJudge; };
  }, [judgeMode]);

  const loadLedger = useCallback(async () => {
    if (!allowed || !ledgerAuthority || !singleStore) return;
    setLedgerLoading(true);
    setLedgerError('');
    try {
      const result = await SavdoGraphApi.actionLedger();
      if (!Array.isArray(result)) throw new Error('malformed');
      setLedger(result);
    } catch (error) {
      setLedgerError(error.message === 'malformed' ? t('malformedResponse') : localizedError(error, locale));
    } finally {
      setLedgerLoading(false);
    }
  }, [allowed, ledgerAuthority, locale, singleStore, t]);

  useEffect(() => { loadLedger(); }, [loadLedger]);

  useEffect(() => {
    const loader = supplierLoaderRef.current;
    if (!writable || !eligible || !singleStore || loader.state !== 'idle') return;
    setSupplierLoading(true);
    loader.load()
      .then(setSuppliers)
      .catch((error) => setProposalError(localizedError(error, locale)))
      .finally(() => setSupplierLoading(false));
  }, [eligible, locale, singleStore, writable]);

  async function generateBrief(event) {
    event.preventDefault();
    if (!writable) return;
    if (!validatePeriod(periodStart, periodEnd, 31)) { setBriefError(t('validationPeriod')); return; }
    const submittedPeriod = { periodStart, periodEnd };
    setBriefLoading(true); setBriefError(''); setBrief(null);
    try {
      const result = await SavdoGraphApi.createGrossProfitBrief(submittedPeriod);
      if (!isLinkedGrossProfitBrief(result, submittedPeriod)) throw new Error('malformed');
      setBrief(result);
    } catch (error) {
      setBriefError(error.message === 'malformed' ? t('malformedResponse') : localizedError(error, locale));
    } finally { setBriefLoading(false); }
  }

  async function askStore(event) {
    event?.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || cleanQuestion.length > 1200) { setAskError(t('validationQuestion')); return; }
    if (!validatePeriod(periodStart, periodEnd, 31)) { setAskError(t('validationPeriod')); return; }
    setAskLoading(true); setAskError(''); setAskResponse(null);
    const body = { question: cleanQuestion, locale: askLocale, periodStart, periodEnd };
    if (askProduct?.id) body.productId = Number(askProduct.id);
    try {
      const result = await SavdoGraphApi.ask(body);
      const response = normaliseAskResponse(result);
      if (!response) throw new Error('malformed');
      setAskResponse(response);
    } catch (error) {
      setAskError(error.message === 'malformed' ? t('malformedResponse') : localizedError(error, locale));
    } finally { setAskLoading(false); }
  }

  async function runDecisionTwin(event) {
    event.preventDefault();
    if (!writable || !simulationProduct?.id) { setSimulationError(t('validationProduct')); return; }
    const boundedLookback = Number(lookbackDays);
    if (!Number.isInteger(boundedLookback) || boundedLookback < 1 || boundedLookback > 90) {
      setSimulationError(t('validationBounds'));
      return;
    }
    const lookbackEnd = isoShift(1);
    const lookbackStart = isoShift(-boundedLookback, new Date(`${lookbackEnd}T00:00:00Z`));
    const requests = buildDecisionTwinRequests({
      productId: Number(simulationProduct.id),
      lookbackStart,
      lookbackEnd,
    });
    if (!Array.isArray(requests) || requests.length !== 3 || requests.some((entry) => !validateSimulationInput(entry?.request))) {
      setSimulationError(t('validationBounds'));
      return;
    }
    setSimulationLoading(true);
    setSimulationError('');
    setTwinScenarios([]);
    setTwinValidation(null);
    setSelectedScenarioId(null);
    setProposal(null);
    setDecision(null);
    setSupplierId('');
    try {
      const returned = await Promise.all(requests.map(async ({ key, request }) => {
        const result = await SavdoGraphApi.createReorderSimulation(request);
        if (!result || !result.analysisRunId || !result.classification) throw new Error('malformed');
        return { key, request, result };
      }));
      const validation = validateDecisionTwin(returned);
      setTwinValidation(validation);
      setTwinScenarios(Array.isArray(validation?.scenarios) ? validation.scenarios : returned);
    } catch (error) {
      setSimulationError(error.message === 'malformed' ? t('malformedResponse') : localizedError(error, locale));
    } finally {
      setSimulationLoading(false);
    }
  }

  function selectTwinScenario(scenarioItem) {
    const selected = scenarioItem?.result || scenarioItem;
    if (!isSimulationEligible(selected)) return;
    setSelectedScenarioId(Number(selected.analysisRunId));
    setProposal(null);
    setDecision(null);
    setSupplierId('');
    setProposalError('');
  }

  async function createProposal() {
    if (!writable || !eligible) return;
    let body;
    try { body = buildBridgeRequest(supplierId); } catch { setProposalError(t('validationSupplier')); return; }
    setProposalLoading(true); setProposalError('');
    try {
      const result = await SavdoGraphApi.createProposalFromSimulation(Number(simulation.analysisRunId), body);
      const responseEvidence = [...new Set((Array.isArray(result?.evidenceIds) ? result.evidenceIds : [])
        .map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))].sort((left, right) => left - right);
      const sourceEvidence = [...new Set(Object.values(simulation.evidenceIds || {})
        .map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))].sort((left, right) => left - right);
      const sourceMatches = result
        && Number(result.proposalId) > 0
        && result.proposalStatus === 'PROPOSED'
        && result.sourceKind === 'B2_REORDER_SIMULATION'
        && Number(result.sourceAnalysisRunId) === Number(simulation.analysisRunId)
        && Number(result.productId) === Number(simulation.productId)
        && Number(result.supplierId) === Number(supplierId)
        && Number(result.reorderQuantity) === Number(simulation.reorderQuantity)
        && result.classification === simulation.classification
        && responseEvidence.length === sourceEvidence.length
        && responseEvidence.every((id, index) => id === sourceEvidence[index]);
      if (!sourceMatches) throw new Error('malformed');
      setProposal({ ...result, productSku: simulation.productSku, unit: simulation.unit });
      setDecision(null);
      await loadLedger();
    } catch (error) {
      setProposalError(error.message === 'malformed' ? t('malformedResponse') : localizedError(error, locale));
    } finally { setProposalLoading(false); }
  }

  const openEvidence = useCallback(async (id) => {
    const evidenceId = Number(id);
    if (!Number.isInteger(evidenceId) || evidenceId <= 0) return;
    setEvidenceDrawer({ open: true, id: evidenceId, evidence: null, loading: true, error: '' });
    try {
      const evidence = await SavdoGraphApi.evidence(evidenceId);
      if (!evidence || Number(evidence.id) !== evidenceId) throw new Error('malformed');
      setEvidenceDrawer({ open: true, id: evidenceId, evidence, loading: false, error: '' });
    } catch (error) {
      setEvidenceDrawer({ open: true, id: evidenceId, evidence: null, loading: false, error: error.message === 'malformed' ? t('malformedResponse') : localizedError(error, locale) });
    }
  }, [locale, t]);

  const closeEvidence = useCallback(() => {
    setEvidenceDrawer((current) => ({ ...current, open: false }));
  }, []);

  const closeDecision = useCallback(() => {
    setDecisionDialog((current) => current.pending ? current : { open: false, kind: null, reason: '', pending: false, error: '' });
  }, []);

  function openDecision(kind) {
    if (!decisionAuthority || !proposal) return;
    decisionKeyRef.current = createDecisionKey(proposal.proposalId, kind);
    setDecisionDialog({ open: true, kind, reason: '', pending: false, error: '' });
  }

  async function submitDecision() {
    if (decisionDialog.pending || !decisionAuthority || !proposal) return;
    let body;
    try { body = buildDecisionRequest(decisionDialog.reason, decisionKeyRef.current); }
    catch { setDecisionDialog((current) => ({ ...current, error: t('error') })); return; }
    setDecisionDialog((current) => ({ ...current, pending: true, error: '' }));
    try {
      const proposalId = Number(proposal.proposalId);
      const result = decisionDialog.kind === 'approve'
        ? await SavdoGraphApi.approveProposal(proposalId, body)
        : await SavdoGraphApi.rejectProposal(proposalId, body);
      const expectedDecision = decisionDialog.kind === 'approve' ? 'APPROVE' : 'REJECT';
      const validApprove = expectedDecision !== 'APPROVE'
        || (result?.proposalStatus === 'DRAFT_CREATED'
          && Number.isSafeInteger(Number(result.purchaseOrderId))
          && Number(result.purchaseOrderId) > 0);
      const validReject = expectedDecision !== 'REJECT'
        || (result?.proposalStatus === 'REJECTED' && result.purchaseOrderId == null);
      if (!result
        || Number(result.proposalId) !== proposalId
        || result.decision !== expectedDecision
        || !validApprove
        || !validReject) throw new Error('malformed');
      setDecision(result);
      setProposal((current) => ({ ...current, proposalStatus: result.proposalStatus }));
      setDecisionDialog({ open: false, kind: null, reason: '', pending: false, error: '' });
      await loadLedger();
    } catch (error) {
      setDecisionDialog((current) => ({ ...current, pending: false, error: error.message === 'malformed' ? t('malformedResponse') : localizedError(error, locale) }));
    }
  }

  const clarificationControl = useMemo(() => (
    <div className="sg-clarification">
      <p>{t('selectProductToClarify')}</p>
      <ProductPicker id="ask-clarification" locale={locale} selectedProduct={askProduct} onSelect={setAskProduct} />
      <button type="button" className="btn btn-primary" onClick={askStore} disabled={!askProduct || askLoading}>{t('ask')}</button>
    </div>
  ), [askLoading, askProduct, locale, question, askLocale, periodStart, periodEnd, t, writable]);

  if (!allowed) return <AccessDenied locale={locale} />;

  if (shopsLoading) {
    return (
      <section className="sg-page sg-loading-page" aria-busy="true" aria-label={t('loading')}>
        <div className="sg-empty"><span aria-hidden="true">◌</span><p>{t('loading')}</p></div>
      </section>
    );
  }

  if (!singleStore) {
    return (
      <div className="sg-page">
        <section className="sg-access-hero" aria-labelledby="sg-access-title">
          <div className="sg-brand-mark" aria-hidden="true"><i /><i /><i /><i /></div>
          <div><span className="sg-eyebrow">{t('decisionCommand')}</span><h1 id="sg-access-title">{PROOFTWIN_BRAND}</h1><p>{t('productPromise')}</p><small>{t('productSupport')}</small></div>
        </section>
        <div className="sg-denied"><span className="sg-denied-icon" aria-hidden="true">!</span><h2>{t('chooseStoreTitle')}</h2><p>{t('chooseStoreBody')}</p></div>
      </div>
    );
  }

  return (
    <div className={judgeMode ? 'sg-page sg-judge-mode' : 'sg-page'} data-testid="savdograph-workspace">
      <DecisionCommandHeader
        brief={brief}
        askResponse={presentedAskResponse}
        simulation={simulation}
        simulations={simulations}
        proposal={proposal}
        decision={decision}
        ledger={ledger}
        periodStart={brief?.periodStart || periodStart}
        periodEnd={brief?.periodEnd || periodEnd}
        latestTimestamp={latestTimestamp}
        demoMode={IS_DEMO_DATA}
        locale={locale}
        judgeMode={judgeMode}
        onStartJudge={() => setJudgeModeWithUrl(!judgeMode)}
      />
      <WorkflowRail
        brief={brief}
        askResponse={presentedAskResponse}
        simulation={simulation}
        simulations={simulations}
        proposal={proposal}
        decision={decision}
        ledger={ledger}
        locale={locale}
      />
      <JudgeModeGuide
        active={judgeMode}
        locale={locale}
        currentStage={judgeStage}
        onExit={() => setJudgeModeWithUrl(false)}
        onNavigate={navigateJudgeStage}
        onStageChange={setJudgeStage}
      />
      <TrustStrip locale={locale} />
      <DemoDataBanner enabled={IS_DEMO_DATA} locale={locale} />

      <div className="sg-workspace-grid">
        <section id="sg-understand" className="sg-stage-heading" aria-labelledby="sg-understand-title" data-stage="understand" tabIndex="-1">
          <span className="sg-eyebrow">01</span>
          <div><h2 id="sg-understand-title">{t('understand')}</h2><p>{t('understandHint')}</p></div>
        </section>

        <Section id="sg-brief" className="sg-input-section" title={t('grossProfitBrief')} hint={t('briefHint')}>
          <form className="sg-form-row" onSubmit={generateBrief}>
            <label className="sg-field"><span>{t('periodStart')}</span><input className="input" type="date" value={periodStart} disabled={briefLoading || askLoading} onChange={(event) => { setPeriodStart(event.target.value); setBrief(null); setAskResponse(null); setBriefError(''); setAskError(''); }} required /></label>
            <label className="sg-field"><span>{t('periodEnd')}</span><input className="input" type="date" value={periodEnd} disabled={briefLoading || askLoading} onChange={(event) => { setPeriodEnd(event.target.value); setBrief(null); setAskResponse(null); setBriefError(''); setAskError(''); }} required /></label>
            <div className="sg-timezone-chip">Asia/Tashkent</div>
            <button className="btn btn-primary" type="submit" disabled={!writable || briefLoading}>{briefLoading ? t('loading') : t('generateBrief')}</button>
          </form>
          {briefError && <AsyncNotice tone="error">{briefError}</AsyncNotice>}
        </Section>

        <Section id="sg-ask" className="sg-input-section" title={t('askStore')} hint={t('askHint')}>
          <form onSubmit={askStore}>
            <div className="sg-ask-controls">
              <label className="sg-field sg-grow"><span>{t('question')}</span><textarea className="input" rows="3" maxLength="1200" value={question} disabled={askLoading} onChange={(event) => { setQuestion(event.target.value); setAskResponse(null); setAskError(''); }} /></label>
              <button type="submit" className="btn btn-primary" disabled={askLoading}>{askLoading ? t('loading') : t('ask')}</button>
            </div>
            <div className="sg-examples" aria-label={t('examples')}>
              <button type="button" disabled={askLoading} onClick={() => { setQuestion(t(exampleKey)); setAskResponse(null); setAskError(''); }}>{t(exampleKey)}</button>
            </div>
          </form>
          {askError && <AsyncNotice tone="error">{askError}</AsyncNotice>}
        </Section>

        <Section id="sg-answer" className="sg-answer-section" title={t('evidenceBackedAnswer')} hint={t('answerHint')}>
          <div className="sg-answer-results" role="region" aria-live="polite" aria-busy={briefLoading || askLoading} aria-label={t('evidenceBackedAnswer')}>
            {briefLoading && <div className="sg-skeleton-stack" aria-label={t('loading')}><i /><i /><i /></div>}
            {!briefLoading && brief && <BriefResult brief={brief} locale={locale} onOpenEvidence={openEvidence} />}
            {askLoading && <div className="sg-skeleton-stack" aria-label={t('loading')}><i /><i /><i /></div>}
            {!askLoading && presentedAskResponse && <AskResult response={presentedAskResponse} locale={locale} onOpenEvidence={openEvidence} clarificationControl={clarificationControl} />}
            {!briefLoading && !askLoading && !brief && !presentedAskResponse && <div className="sg-empty sg-answer-empty"><span aria-hidden="true">i</span><p>{t('noAnswer')}</p></div>}
          </div>
          <DecisionTrace response={presentedAskResponse} locale={locale} />
        </Section>

        <InteractiveProofGraph
          brief={brief}
          askResponse={presentedAskResponse}
          simulations={simulations}
          proposal={proposal}
          decision={decision}
          ledger={ledger}
          locale={locale}
          onOpenEvidence={openEvidence}
          onFocusTarget={navigateJudgeStage}
        />

        <Section id="sg-simulator" className="sg-stage-wide" eyebrow="02" stage="simulate" title={t('decisionTwin')} hint={t('decisionTwinHint')}>
          <div className="sg-stage-title"><h3>{t('reorderSimulator')}</h3><p>{t('twinPresetsHint')}</p></div>
          <ProductPicker
            id="simulation-product"
            locale={locale}
            selectedProduct={simulationProduct}
            disabled={simulationLoading}
            onSelect={(product) => {
              setSimulationProduct(product);
              setTwinScenarios([]);
              setTwinValidation(null);
              setSelectedScenarioId(null);
              setProposal(null);
              setDecision(null);
            }}
          />
          <form className="sg-scenario-form" onSubmit={runDecisionTwin}>
            <label className="sg-field"><span>{t('scenarioAssumption')} - {t('lookbackDays')}</span><input className="input" type="number" min="1" max="90" step="1" value={lookbackDays} disabled={simulationLoading} onChange={(event) => { setLookbackDays(event.target.value); setTwinScenarios([]); setTwinValidation(null); setSelectedScenarioId(null); setProposal(null); setDecision(null); setSupplierId(''); setSimulationError(''); }} /></label>
            <div className="sg-preset-summary" aria-label={t('twinPresetsHint')}>
              <span>{t('twinNoAction')}</span><span>{t('twinBalanced')}</span><span>{t('twinHighCoverage')}</span>
            </div>
            <button type="submit" className="btn btn-primary" disabled={!writable || simulationLoading}>{simulationLoading ? t('loading') : t('runDecisionTwin')}</button>
          </form>
          {simulationError && <AsyncNotice tone="error">{simulationError}</AsyncNotice>}
          {twinValidation && twinValidation.coherent === false && <AsyncNotice tone="error">{t('twinIncoherent')}</AsyncNotice>}
          {simulationLoading ? <div className="sg-skeleton-stack" aria-label={t('loading')}><i /><i /><i /></div> : (
            <DecisionTwin
              scenarios={twinScenarios}
              locale={locale}
              selectedScenarioId={selectedScenarioId}
              onSelectScenario={selectTwinScenario}
              onOpenEvidence={openEvidence}
              onFocusTarget={navigateJudgeStage}
            />
          )}
          {eligible && writable && (
            <SupplierBridgeControls
              locale={locale}
              suppliers={suppliers}
              supplierId={supplierId}
              supplierLoading={supplierLoading || proposalLoading}
              proposalLoading={proposalLoading}
              onSupplierChange={(event) => { setSupplierId(event.target.value); setProposal(null); setDecision(null); setProposalError(''); }}
              onCreateProposal={createProposal}
            />
          )}
          {proposalError && <AsyncNotice tone="error">{proposalError}</AsyncNotice>}
        </Section>

        <PolicyShield
          brief={brief}
          askResponse={presentedAskResponse}
          simulations={simulations}
          proposal={proposal}
          decision={decision}
          ledger={ledger}
          locale={locale}
          onFocusTarget={navigateJudgeStage}
        />

        <Section id="sg-proposal" className="sg-stage-wide" eyebrow="03" stage="approve" title={t('approveStage')} hint={t('approveStageHint')}>
          <div className="sg-stage-title"><h3>{t('proposalReview')}</h3><p>{t('proposalHint')}</p></div>
          <ProposalCard proposal={proposal} decision={decision} canDecide={decisionAuthority} locale={locale} onOpenEvidence={openEvidence} onDecision={openDecision} />
        </Section>

        {ledgerAuthority && (
          <Section id="sg-ledger" className="sg-stage-wide" title={t('actionLedger')} hint={`${t('recordedHistory')} - ${t('ledgerHint')}`} action={<button type="button" className="btn btn-ghost btn-sm" onClick={loadLedger} disabled={ledgerLoading}>{t('refresh')}</button>}>
            {ledgerError && <AsyncNotice tone="error">{ledgerError}</AsyncNotice>}
            {ledgerLoading ? <div className="sg-skeleton-stack" aria-label={t('loading')}><i /><i /><i /></div> : <LedgerTimeline events={ledger} locale={locale} onOpenEvidence={openEvidence} />}
          </Section>
        )}
      </div>
      <div className="sr-only" aria-live="polite">{briefLoading || askLoading || simulationLoading || proposalLoading || ledgerLoading ? t('loading') : ''}</div>
      <EvidenceDrawer {...evidenceDrawer} locale={locale} onClose={closeEvidence} onRetry={() => openEvidence(evidenceDrawer.id)} />
      <DecisionDialog {...decisionDialog} proposal={proposal} locale={locale} onReasonChange={(reason) => setDecisionDialog((current) => ({ ...current, reason }))} onClose={closeDecision} onConfirm={submitDecision} />
    </div>
  );
}
