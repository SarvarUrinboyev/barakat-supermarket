import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProductApi, SavdoGraphApi, SupplierApi } from '../api/endpoints.js';
import { PageHeader } from '../components/ui.jsx';
import { useAuth } from '../context/Auth.jsx';
import { useSettings } from '../context/Settings.jsx';
import { useShop } from '../context/Shop.jsx';
import { IS_DEMO_DATA } from '../config.js';
import {
  ASK_LOCALES,
  boundedProducts,
  buildBridgeRequest,
  buildDecisionRequest,
  canDecideSavdoGraph,
  canReadLedger,
  canReadSavdoGraph,
  canWriteSavdoGraph,
  createDecisionKey,
  isSimulationEligible,
  safeErrorKey,
  sgText,
  validatePeriod,
  validateSimulationInput,
  WORKSPACE_LOCALES,
} from '../features/savdograph/model.js';
import {
  AskResult,
  AsyncNotice,
  BriefResult,
  DecisionDialog,
  EvidenceDrawer,
  LedgerTimeline,
  ProposalCard,
  SimulationResult,
  SupplierBridgeControls,
} from '../features/savdograph/components.jsx';
import { createSupplierLoader } from '../features/savdograph/supplierLoader.js';
import '../styles/savdograph.css';

function isoShift(days, from = new Date()) {
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function localizedError(error, locale) {
  return sgText(locale, safeErrorKey(error));
}

function Section({ id, title, hint, action, children }) {
  return (
    <section className="card sg-section" aria-labelledby={id}>
      <div className="card-head sg-section-head">
        <div><h2 id={id}>{title}</h2>{hint && <p>{hint}</p>}</div>
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
          <span aria-hidden="true">\u2713</span><strong>{selectedProduct.name}</strong>
          <span>SKU: {selectedProduct.barcode || selectedProduct.sku || sgText(locale, 'notAvailable')}</span>
          <span>{sgText(locale, 'currentStock')}: {selectedProduct.quantity ?? sgText(locale, 'notAvailable')} {selectedProduct.unit || ''}</span>
        </div>
      )}
      {results.length > 0 && (
        <ul className="sg-product-results" aria-label={sgText(locale, 'productSearch')}>
          {results.map((product) => (
            <li key={product.id}>
              <div><strong>{product.name}</strong><span>SKU: {product.barcode || product.sku || sgText(locale, 'notAvailable')} \u00b7 {sgText(locale, 'currentStock')}: {product.quantity ?? sgText(locale, 'notAvailable')} {product.unit || ''}</span></div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onSelect(product); setResults([]); }} aria-label={`${sgText(locale, 'select')} ${product.name}`}>{selectedProduct?.id === product.id ? sgText(locale, 'selected') : sgText(locale, 'select')}</button>
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
    <main className="sg-denied" data-testid="savdograph-denied">
      <span className="sg-denied-icon" aria-hidden="true">\u26d4</span>
      <h1>{sgText(locale, 'deniedTitle')}</h1>
      <p>{sgText(locale, 'deniedBody')}</p>
    </main>
  );
}

export function SavdoGraph() {
  const { user } = useAuth();
  const { lang } = useSettings();
  const { activeShopId, isConsolidated, loading: shopsLoading } = useShop();
  const [locale, setLocale] = useState(lang === 'ru' ? 'RU' : 'UZ');
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
  const [askLocale, setAskLocale] = useState('AUTO');
  const [askProduct, setAskProduct] = useState(null);
  const [askResponse, setAskResponse] = useState(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState('');

  const [simulationProduct, setSimulationProduct] = useState(null);
  const [scenario, setScenario] = useState({ lookbackDays: 30, forecastHorizonDays: 7, leadTimeDays: 2, safetyStockDays: 3 });
  const [simulation, setSimulation] = useState(null);
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
  const decisionKeyRef = useRef(null);
  const supplierLoaderRef = useRef(null);
  if (!supplierLoaderRef.current) supplierLoaderRef.current = createSupplierLoader(() => SupplierApi.list());

  const latestTimestamp = brief?.generatedAt || askResponse?.generatedAt || simulation?.generatedAt || proposal?.createdAt;
  const eligible = isSimulationEligible(simulation);

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
    if (!eligible || !singleStore || loader.state !== 'idle') return;
    setSupplierLoading(true);
    loader.load()
      .then(setSuppliers)
      .catch((error) => setProposalError(localizedError(error, locale)))
      .finally(() => setSupplierLoading(false));
  }, [eligible, locale, singleStore]);

  async function generateBrief(event) {
    event.preventDefault();
    if (!validatePeriod(periodStart, periodEnd, 31)) { setBriefError(t('validationPeriod')); return; }
    setBriefLoading(true); setBriefError('');
    try {
      const result = await SavdoGraphApi.createGrossProfitBrief({ periodStart, periodEnd });
      if (!result || !result.analysisRunId || !result.classification) throw new Error('malformed');
      setBrief(result);
    } catch (error) {
      setBriefError(error.message === 'malformed' ? t('malformedResponse') : localizedError(error, locale));
    } finally { setBriefLoading(false); }
  }

  async function askStore(event) {
    event?.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || cleanQuestion.length > 1200) { setAskError(t('validationQuestion')); return; }
    setAskLoading(true); setAskError(''); setAskResponse(null);
    const body = { question: cleanQuestion, locale: askLocale, periodStart, periodEnd };
    if (askProduct?.id) body.productId = Number(askProduct.id);
    try {
      const result = await SavdoGraphApi.ask(body);
      if (!result || !result.status || !result.classification) throw new Error('malformed');
      setAskResponse(result);
    } catch (error) {
      setAskError(error.message === 'malformed' ? t('malformedResponse') : localizedError(error, locale));
    } finally { setAskLoading(false); }
  }

  function setScenarioValue(key, value) {
    setScenario((current) => ({ ...current, [key]: value }));
  }

  async function runSimulation(event) {
    event.preventDefault();
    if (!simulationProduct?.id) { setSimulationError(t('validationProduct')); return; }
    const lookbackEnd = isoShift(1);
    const lookbackStart = isoShift(-Number(scenario.lookbackDays), new Date(`${lookbackEnd}T00:00:00Z`));
    const body = {
      productId: Number(simulationProduct.id), lookbackStart, lookbackEnd,
      leadTimeDays: Number(scenario.leadTimeDays), safetyStockDays: Number(scenario.safetyStockDays),
      forecastHorizonDays: Number(scenario.forecastHorizonDays),
    };
    if (!validateSimulationInput(body)) { setSimulationError(t('validationBounds')); return; }
    setSimulationLoading(true); setSimulationError(''); setSimulation(null); setProposal(null); setDecision(null); setSupplierId('');
    try {
      const result = await SavdoGraphApi.createReorderSimulation(body);
      if (!result || !result.analysisRunId || !result.classification) throw new Error('malformed');
      setSimulation(result);
    } catch (error) {
      setSimulationError(error.message === 'malformed' ? t('malformedResponse') : localizedError(error, locale));
    } finally { setSimulationLoading(false); }
  }

  async function createProposal() {
    if (!eligible) return;
    let body;
    try { body = buildBridgeRequest(supplierId); } catch { setProposalError(t('validationSupplier')); return; }
    setProposalLoading(true); setProposalError('');
    try {
      const result = await SavdoGraphApi.createProposalFromSimulation(Number(simulation.analysisRunId), body);
      if (!result || !result.proposalId || !result.proposalStatus) throw new Error('malformed');
      setProposal(result); setDecision(null); await loadLedger();
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
      if (!result || Number(result.proposalId) !== proposalId || !result.proposalStatus) throw new Error('malformed');
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
  ), [askLoading, askProduct, locale, question, askLocale, periodStart, periodEnd, t]);

  if (!allowed) return <AccessDenied locale={locale} />;

  if (!shopsLoading && !singleStore) {
    return (
      <main className="sg-page">
        <PageHeader title="SavdoGraph AI" desc={t('productPromise')} />
        <div className="sg-denied"><span className="sg-denied-icon" aria-hidden="true">\u25c8</span><h1>{t('chooseStoreTitle')}</h1><p>{t('chooseStoreBody')}</p></div>
      </main>
    );
  }

  return (
    <main className="sg-page" data-testid="savdograph-workspace">
      <PageHeader title="SavdoGraph AI" desc={t('productPromise')}>
        <div className="sg-locale-switch" role="group" aria-label={t('language')}>
          {WORKSPACE_LOCALES.map((code) => <button type="button" key={code} className={locale === code ? 'active' : ''} aria-pressed={locale === code} onClick={() => setLocale(code)}>{code}</button>)}
        </div>
      </PageHeader>

      <section className="sg-command-strip" aria-label={t('safeEnvironment')}>
        <div><span>{t('selectedPeriod')}</span><strong>{periodStart} \u2192 {periodEnd}</strong></div>
        <div><span>{t('timezone')}</span><strong>Asia/Tashkent (UTC+5)</strong></div>
        <div><span>{t('freshness')}</span><strong>{latestTimestamp || t('notGenerated')}</strong></div>
        <div className="sg-safe-indicator"><span aria-hidden="true">\u25c8</span><strong>{t('safeEnvironment')}</strong></div>
      </section>
      {IS_DEMO_DATA && <div className="sg-demo-banner" role="note"><strong>{t('demoData')}</strong><span>{t('demoNotice')}</span></div>}

      <div className="sg-workspace-grid">
        <Section id="sg-brief" title={t('grossProfitBrief')} hint={t('briefHint')}>
          <form className="sg-form-row" onSubmit={generateBrief}>
            <label className="sg-field"><span>{t('periodStart')}</span><input className="input" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} required /></label>
            <label className="sg-field"><span>{t('periodEnd')}</span><input className="input" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} required /></label>
            <div className="sg-timezone-chip">Asia/Tashkent</div>
            <button className="btn btn-primary" type="submit" disabled={!writable || briefLoading}>{briefLoading ? t('loading') : t('generateBrief')}</button>
          </form>
          {briefError && <AsyncNotice tone="error">{briefError}</AsyncNotice>}
          {briefLoading ? <div className="sg-skeleton-stack" aria-label={t('loading')}><i /><i /><i /></div> : <BriefResult brief={brief} locale={locale} onOpenEvidence={openEvidence} />}
        </Section>

        <Section id="sg-ask" title={t('askStore')} hint={t('askHint')}>
          <form onSubmit={askStore}>
            <div className="sg-ask-controls">
              <label className="sg-field sg-grow"><span>{t('question')}</span><textarea className="input" rows="3" maxLength="1200" value={question} onChange={(event) => setQuestion(event.target.value)} /></label>
              <label className="sg-field"><span>{t('answerLocale')}</span><select className="select" value={askLocale} onChange={(event) => setAskLocale(event.target.value)}>{ASK_LOCALES.map((code) => <option key={code}>{code}</option>)}</select></label>
              <button type="submit" className="btn btn-primary" disabled={askLoading}>{askLoading ? t('loading') : t('ask')}</button>
            </div>
            <div className="sg-examples" aria-label={t('examples')}>
              {['uzExample', 'ruExample', 'enExample'].map((key) => <button type="button" key={key} onClick={() => setQuestion(t(key))}>{t(key)}</button>)}
            </div>
          </form>
          {askError && <AsyncNotice tone="error">{askError}</AsyncNotice>}
          {askLoading ? <div className="sg-skeleton-stack" aria-label={t('loading')}><i /><i /><i /></div> : <AskResult response={askResponse} locale={locale} onOpenEvidence={openEvidence} clarificationControl={clarificationControl} />}
        </Section>

        <Section id="sg-simulator" title={t('reorderSimulator')} hint={t('simulatorHint')}>
          <ProductPicker id="simulation-product" locale={locale} selectedProduct={simulationProduct} onSelect={setSimulationProduct} />
          <form className="sg-scenario-form" onSubmit={runSimulation}>
            {[
              ['lookbackDays', 'lookbackDays', 1, 90], ['forecastHorizonDays', 'forecastDays', 1, 180],
              ['leadTimeDays', 'leadTimeDays', 0, 60], ['safetyStockDays', 'safetyStockDays', 0, 90],
            ].map(([key, label, min, max]) => (
              <label className="sg-field" key={key}><span>{t('scenarioAssumption')} \u00b7 {t(label)}</span><input className="input" type="number" min={min} max={max} step="1" value={scenario[key]} onChange={(event) => setScenarioValue(key, event.target.value)} /></label>
            ))}
            <button type="submit" className="btn btn-primary" disabled={!writable || simulationLoading}>{simulationLoading ? t('loading') : t('runSimulation')}</button>
          </form>
          {simulationError && <AsyncNotice tone="error">{simulationError}</AsyncNotice>}
          {simulationLoading ? <div className="sg-skeleton-stack" aria-label={t('loading')}><i /><i /><i /></div> : <SimulationResult simulation={simulation} productName={simulationProduct?.name} locale={locale} onOpenEvidence={openEvidence} />}
          {eligible && (
            <SupplierBridgeControls
              locale={locale}
              suppliers={suppliers}
              supplierId={supplierId}
              supplierLoading={supplierLoading}
              proposalLoading={proposalLoading}
              onSupplierChange={(event) => setSupplierId(event.target.value)}
              onCreateProposal={createProposal}
            />
          )}
          {proposalError && <AsyncNotice tone="error">{proposalError}</AsyncNotice>}
        </Section>

        <Section id="sg-proposal" title={t('proposalReview')} hint={t('proposalHint')}>
          <ProposalCard proposal={proposal} decision={decision} canDecide={decisionAuthority} locale={locale} onOpenEvidence={openEvidence} onDecision={openDecision} />
        </Section>

        {ledgerAuthority && (
          <Section id="sg-ledger" title={t('actionLedger')} hint={`${t('recordedHistory')} \u00b7 ${t('ledgerHint')}`} action={<button type="button" className="btn btn-ghost btn-sm" onClick={loadLedger} disabled={ledgerLoading}>{t('refresh')}</button>}>
            {ledgerError && <AsyncNotice tone="error">{ledgerError}</AsyncNotice>}
            {ledgerLoading ? <div className="sg-skeleton-stack" aria-label={t('loading')}><i /><i /><i /></div> : <LedgerTimeline events={ledger} locale={locale} onOpenEvidence={openEvidence} />}
          </Section>
        )}
      </div>

      <div className="sr-only" aria-live="polite">{briefLoading || askLoading || simulationLoading || proposalLoading || ledgerLoading ? t('loading') : ''}</div>
      <EvidenceDrawer {...evidenceDrawer} locale={locale} onClose={closeEvidence} onRetry={() => openEvidence(evidenceDrawer.id)} />
      <DecisionDialog {...decisionDialog} proposal={proposal} locale={locale} onReasonChange={(reason) => setDecisionDialog((current) => ({ ...current, reason }))} onClose={closeDecision} onConfirm={submitDecision} />
    </main>
  );
}
