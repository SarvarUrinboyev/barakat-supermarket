import { useMemo } from 'react';
import { PaymentApi } from '../api/endpoints.js';
import { useT } from '../context/Settings.jsx';
import { useApi } from '../hooks/useApi.js';
import { money, usd } from '../lib/format.js';

/**
 * "Mavjud pul mablag'lari" — net per-method totals (incoming − outgoing)
 * shown in their NATIVE currencies. Used on both the Payments and
 * Management pages so the same numbers appear in both places.
 *
 * If {@code from} / {@code to} are omitted the whole journal is fetched.
 */
export function TreasurySection({ from, to, title, eyebrow }) {
  const t = useT();
  const params = from && to ? { from, to } : {};
  const { data } = useApi(() => PaymentApi.list(params), [from, to]);
  const rows = data ? data.payments : [];

  const buckets = useMemo(() => computeTreasury(rows), [rows]);

  const netUZS = (buckets.UZS_CASH.UZS) + (buckets.P2P.UZS) + (buckets.TRANSFER.UZS);
  const netUSD = (buckets.USD_CASH.USD) + (buckets.P2P.USD) + (buckets.TRANSFER.USD);

  return (
    <div className="treasury section">
      <div className="treasury-head">
        {eyebrow && <span className="t-eyebrow">{t(eyebrow)}</span>}
        {title && <h3 style={{ fontSize: 14, fontWeight: 800 }}>{t(title)}</h3>}
        <div className="t-net mono">
          {t('Jami:')}{' '}
          <DualNet uzs={netUZS} usd={netUSD} />
        </div>
      </div>
      <div className="treasury-grid">
        <TreasuryCard tone="green" icon="💴" label={t("UZS (so'm)")}
                      sub={t('Naqd pul')}
                      uzs={buckets.UZS_CASH.UZS} usd={0} />
        <TreasuryCard tone="emerald" icon="💵" label={t('USD (dollar)')}
                      sub={t("Valyuta g'aznasi")}
                      uzs={0} usd={buckets.USD_CASH.USD} />
        <TreasuryCard tone="blue" icon="💳" label={t('Karta (P2P)')}
                      sub={t("Plastik o'tkazmalar")}
                      uzs={buckets.P2P.UZS} usd={buckets.P2P.USD} />
        <TreasuryCard tone="purple" icon="🏦" label={t('Transfer')}
                      sub={t('Bank hisobi (yuridik)')}
                      uzs={buckets.TRANSFER.UZS} usd={buckets.TRANSFER.USD} />
      </div>
    </div>
  );
}

/** Per-method net totals kept in native UZS / USD. Exported for reuse. */
export function computeTreasury(rows) {
  const empty = () => ({ UZS: 0, USD: 0 });
  const buckets = {
    UZS_CASH: empty(), USD_CASH: empty(),
    P2P: empty(), TRANSFER: empty(),
  };
  rows.forEach((p) => {
    const sign = p.direction === 'INCOMING' ? 1 : -1;
    const amount = sign * Number(p.amount);
    const cur = p.currency === 'USD' ? 'USD' : 'UZS';
    let key;
    if (p.method === 'P2P') key = 'P2P';
    else if (p.method === 'TRANSFER') key = 'TRANSFER';
    else if (cur === 'USD') key = 'USD_CASH';
    else key = 'UZS_CASH';
    buckets[key][cur] += amount;
  });
  return buckets;
}

function TreasuryCard({ tone, icon, label, sub, uzs, usd: usdAmt }) {
  const hasUZS = Math.abs(uzs) > 0.0001;
  const hasUSD = Math.abs(usdAmt) > 0.0001;
  return (
    <div className={`treasury-card tone-${tone}`}>
      <div className="tc-head">
        <span className="tc-eyebrow">{label}</span>
        <span className="tc-ico" aria-hidden>{icon}</span>
      </div>
      <div className="tc-sub">{sub}</div>
      <div className="tc-value-stack">
        {!hasUZS && !hasUSD && <span className="tc-line muted mono">0</span>}
        {hasUZS && (
          <span className={`tc-line mono ${uzs < 0 ? 'amount-neg' : ''}`}>
            {money(uzs)} <span className="tc-cur">so'm</span>
          </span>
        )}
        {hasUSD && (
          <span className={`tc-line mono ${usdAmt < 0 ? 'amount-neg' : ''}`}>
            {usd(usdAmt)} <span className="tc-cur">USD</span>
          </span>
        )}
      </div>
      <div className="tc-bar"><span /></div>
    </div>
  );
}

function DualNet({ uzs, usd: usdAmt }) {
  const hasUZS = Math.abs(uzs) > 0.0001;
  const hasUSD = Math.abs(usdAmt) > 0.0001;
  if (!hasUZS && !hasUSD) return <b>0</b>;
  return (
    <>
      {hasUZS && (
        <b className={uzs < 0 ? 'amount-neg' : 'amount-pos'}>
          {uzs > 0 ? '+' : ''}{money(uzs)} so'm
        </b>
      )}
      {hasUZS && hasUSD && <span className="t-net-sep"> · </span>}
      {hasUSD && (
        <b className={usdAmt < 0 ? 'amount-neg' : 'amount-pos'}>
          {usdAmt > 0 ? '+' : ''}{usd(usdAmt)}
        </b>
      )}
    </>
  );
}
