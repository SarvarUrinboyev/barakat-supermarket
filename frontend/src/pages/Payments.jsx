import { useMemo, useState } from 'react';
import { CustomerApi, PaymentApi, SupplierApi } from '../api/endpoints.js';
import { DateRangeFilter, rangeForPreset } from '../components/DateRangeFilter.jsx';
import { ConfirmDialog, Modal } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { TreasurySection } from '../components/TreasurySection.jsx';
import {
  EmptyState, Loader, PageHeader,
} from '../components/ui.jsx';
import { useT } from '../context/Settings.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatDate, formatMoney, todayIso } from '../lib/format.js';

const CATEGORIES = [
  ['CUSTOMER', "Mijoz to'lovi"],
  ['SUPPLIER', 'Yetkazib beruvchiga'],
  ['SALARY', 'Ish haqi'],
  ['TAX', 'Soliq'],
  ['OTHER', 'Boshqa'],
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES);

/**
 * The four user-facing payment methods. UZS / USD cash collapse the currency
 * choice into one tap; P2P / Transfer leave the currency selectable.
 */
const QUICK_METHODS = [
  { key: 'UZS_CASH', label: "UZS (so'm)", icon: '💴', method: 'NAQD', currency: 'UZS' },
  { key: 'USD_CASH', label: 'USD (dollar)', icon: '💵', method: 'NAQD', currency: 'USD' },
  { key: 'P2P',      label: 'Karta (P2P)', icon: '💳', method: 'P2P', currency: null },
  { key: 'TRANSFER', label: 'Transfer',    icon: '🏦', method: 'TRANSFER', currency: null },
];

/** Map a (method, currency) pair back to one of the four quick-method keys. */
function matchQuickKey(method, currency) {
  if (method === 'P2P') return 'P2P';
  if (method === 'TRANSFER') return 'TRANSFER';
  if (currency === 'USD') return 'USD_CASH';
  return 'UZS_CASH';
}

/** Origin badges for virtual rows from other tables (expenses, customer ledger). */
const SOURCE_TAG = {
  PAYMENT:      null,
  EXPENSE:      { label: 'XARAJAT',  title: 'Xarajatlar sahifasidan',       cls: 'expense' },
  HOME_EXPENSE: { label: "DO'KON",   title: "Do'kon xarajatlari sahifasidan", cls: 'home' },
  CUSTOMER:     { label: 'MIJOZ',    title: 'Mijoz to\'lovi (ledger)',      cls: 'customer' },
};

/** Friendly label for a (method, currency) pair, used in the journal table. */
function methodLabel(method, currency) {
  if (method === 'P2P') return 'Karta (P2P)';
  if (method === 'TRANSFER') return 'Transfer';
  if (method === 'NAQD') return currency === 'USD' ? 'USD (dollar)' : "UZS (so'm)";
  // legacy values kept for old data
  if (method === 'KASSA') return 'Kassa';
  if (method === 'KARTA') return 'Karta';
  if (method === 'ARALASH') return 'Aralash';
  return method;
}

/** "To'lov" - the payment journal: every money movement in and out. */
export function Payments() {
  const t = useT();
  const [range, setRange] = useState({ preset: 'month', ...rangeForPreset('month') });
  const [modal, setModal] = useState(null);
  const toast = useToast();

  const { data, loading, error, reload } = useApi(
    () => PaymentApi.list({ from: range.from, to: range.to }),
    [range.from, range.to],
  );

  const rows = data ? data.payments : [];

  const confirmDelete = async () => {
    try {
      await PaymentApi.remove(modal.item.id);
      toast.success(t("To'lov o'chirildi"));
      setModal(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader title={t("To'lov")} desc={t("To'lovlar jurnali — barcha pul harakatlari")} />

      <DateRangeFilter value={range} onChange={setRange} />

      {data && (
        <>
          <div className="metrics-2 section">
            <DirectionCard
              tone="green" icon="📥" label={t('Kirim')}
              onClick={() => setModal({ type: 'add', presetDirection: 'INCOMING' })}
            />
            <DirectionCard
              tone="red" icon="📤" label={t('Chiqim')}
              onClick={() => setModal({ type: 'add', presetDirection: 'OUTGOING' })}
            />
          </div>

          <TreasurySection
            from={range.from} to={range.to}
            eyebrow="G'AZNA TAHLILI"
          />
        </>
      )}

      <div className="card">
        <div className="card-head">
          <h2>{t("To'lovlar jurnali")}</h2>
          <span className="hint">{rows.length} {t('ta yozuv')}</span>
        </div>
        <Loader loading={loading} error={error} onRetry={reload}>
          {rows.length === 0 ? (
            <EmptyState icon="💰" text={t("Bu davrda to'lov yozuvi yo'q")} />
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('Sana')}</th>
                    <th>{t("Yo'nalish")}</th>
                    <th>{t('Turi')}</th>
                    <th>{t('Kim')}</th>
                    <th>{t('Usul')}</th>
                    <th className="num">{t('Summa')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const incoming = p.direction === 'INCOMING';
                    const src = p.source || 'PAYMENT';
                    const isNative = src === 'PAYMENT';
                    const sourceTag = SOURCE_TAG[src];
                    const rowKey = `${src}-${p.id}`;
                    return (
                      <tr key={rowKey}>
                        <td className="nowrap faint">{formatDate(p.date)}</td>
                        <td>
                          <span className={`badge ${incoming ? 'badge-naqd' : 'badge-qarzga'}`}>
                            {incoming ? `📥 ${t('Kirim')}` : `📤 ${t('Chiqim')}`}
                          </span>
                        </td>
                        <td>
                          {CATEGORY_LABEL[p.category] ? t(CATEGORY_LABEL[p.category]) : p.category}
                          {sourceTag && (
                            <span
                              className={`src-tag src-${sourceTag.cls}`}
                              title={t(sourceTag.title)}
                            >
                              {t(sourceTag.label)}
                            </span>
                          )}
                        </td>
                        <td className="name-cell">{p.party || '—'}</td>
                        <td className="faint">{t(methodLabel(p.method, p.currency))}</td>
                        <td className={`num ${incoming ? 'amount-pos' : 'amount-neg'}`}>
                          {incoming ? '+' : '−'}{formatMoney(p.amount, p.currency)}
                        </td>
                        <td>
                          <div className="row-actions">
                            {isNative ? (
                              <>
                                <button className="icon-btn" title={t('Tahrirlash')}
                                        onClick={() => setModal({ type: 'edit', item: p })}>
                                  ✏️
                                </button>
                                <button className="icon-btn danger" title={t("O'chirish")}
                                        onClick={() => setModal({ type: 'delete', item: p })}>
                                  🗑
                                </button>
                              </>
                            ) : (
                              <span className="faint" style={{ fontSize: 11 }}>
                                {t('Manba sahifasidan tahrirlang')}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Loader>
      </div>

      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <PaymentFormModal
          initial={modal.type === 'edit' ? modal.item : null}
          presetDirection={modal.presetDirection}
          onSubmit={async (body) => {
            if (modal.type === 'add') {
              await PaymentApi.create(body);
              toast.success(t("To'lov qo'shildi"));
            } else {
              await PaymentApi.update(modal.item.id, body);
              toast.success(t("To'lov yangilandi"));
            }
            reload();
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'delete' && (
        <ConfirmDialog
          title={t("To'lovni o'chirish")}
          message={t("Bu to'lov yozuvini o'chirmoqchimisiz?")}
          confirmLabel={t("O'chirish")}
          onConfirm={confirmDelete}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------- card helpers (native ccy) */

/** KIRIM / CHIQIM clickable filled card — just the label, centered. */
function DirectionCard({ tone, icon, label, onClick }) {
  const t = useT();
  const ariaLabel = tone === 'green'
    ? t("Yangi kirim qo'shish")
    : t("Yangi chiqim qo'shish");
  return (
    <div
      role="button"
      tabIndex={0}
      className="metric-click-wrap"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      aria-label={ariaLabel}
    >
      <div className={`metric tone-${tone} metric-filled metric-action`}>
        <span className="m-action-ico" aria-hidden>{icon}</span>
        <span className="m-action-label">{label}</span>
        <span className="m-action-hint">{t('Bosing — yangi yozuv qo\'shish')}</span>
      </div>
    </div>
  );
}

/**
 * "Kim" field with an autocomplete dropdown.
 *
 * <ul>
 *   <li>CUSTOMER → registered customer list (with phone + outstanding debt).</li>
 *   <li>SUPPLIER → registered supplier list (with phone) merged with any
 *       past supplier names from the payment journal so older free-text
 *       entries still surface.</li>
 *   <li>Other categories → distinct past party names only.</li>
 * </ul>
 */
function PartyPicker({ value, onChange, category }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { data: customers } = useApi(() => CustomerApi.list(), []);
  const { data: suppliers } = useApi(() => SupplierApi.list(), []);
  const { data: pastParties } = useApi(
    () => PaymentApi.parties(category),
    [category],
  );

  const matches = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (category === 'CUSTOMER') {
      if (!customers) return [];
      return customers
        .filter((c) => !q || c.name.toLowerCase().includes(q)
          || (c.phone && c.phone.toLowerCase().includes(q)))
        .slice(0, 6)
        .map((c) => ({
          id: `cust-${c.id}`,
          name: c.name,
          meta: c.phone || '',
          debt: Number(c.balance) > 0.009 ? Number(c.balance) : 0,
          source: 'CUSTOMER',
        }));
    }
    if (category === 'SUPPLIER') {
      const seen = new Set();
      const items = [];
      (suppliers || []).forEach((s) => {
        const matchQ = !q || s.name.toLowerCase().includes(q)
          || (s.phone && s.phone.toLowerCase().includes(q));
        if (!matchQ) return;
        items.push({
          id: `sup-${s.id}`,
          name: s.name,
          meta: s.phone || '',
          source: 'SUPPLIER',
        });
        seen.add(s.name.toLowerCase());
      });
      (pastParties || []).forEach((name) => {
        if (seen.has(name.toLowerCase())) return;
        if (q && !name.toLowerCase().includes(q)) return;
        items.push({ id: `past-${name}`, name, source: 'PAST' });
      });
      return items.slice(0, 8);
    }
    if (!pastParties || pastParties.length === 0) return [];
    return pastParties
      .filter((name) => !q || name.toLowerCase().includes(q))
      .slice(0, 6)
      .map((name) => ({ id: `past-${name}`, name, source: 'PAST' }));
  }, [customers, suppliers, pastParties, value, category]);

  const placeholderForCategory = () => {
    if (category === 'CUSTOMER') {
      return t('Mijoz ismi (mavjudlardan tanlash mumkin)');
    }
    if (category === 'SUPPLIER') {
      return t("Yetkazib beruvchi ismi (ro'yxatdan tanlang yoki yozing)");
    }
    if (category === 'SALARY') {
      return t('Ishchi ismi (avval kiritilganlardan tanlash mumkin)');
    }
    return t('Mijoz / yetkazib beruvchi / ishchi ismi');
  };

  return (
    <div className="field" style={{ position: 'relative' }}>
      <label>{t('Kim (ixtiyoriy)')}</label>
      <input
        className="input"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholderForCategory()}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <div className="party-suggestions">
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              className="party-suggest"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(m.name);
                setOpen(false);
              }}
            >
              <span className="ps-name">{m.name}</span>
              {m.source === 'SUPPLIER' && (
                <span className="ps-tag ps-tag-reg">{t('Ro\'yxatda')}</span>
              )}
              {m.source === 'PAST' && (
                <span className="ps-tag ps-tag-past">{t("Avval kiritilgan")}</span>
              )}
              {m.meta && <span className="ps-meta mono">{m.meta}</span>}
              {m.debt > 0 && (
                <span className="ps-debt">
                  {t('Qarz')}: ${m.debt.toFixed(2)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentFormModal({ initial, presetDirection, onSubmit, onClose }) {
  const t = useT();
  const [direction, setDirection] = useState(
    initial?.direction ?? presetDirection ?? 'INCOMING',
  );
  const [category, setCategory] = useState(initial?.category ?? 'CUSTOMER');
  const [party, setParty] = useState(initial?.party ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? '');
  // Single state for the 4 quick payment-method options. UZS/USD cash also
  // sets the currency in one go; P2P/Transfer keep the user-selected currency.
  const [quickKey, setQuickKey] = useState(
    matchQuickKey(initial?.method, initial?.currency ?? 'UZS'),
  );
  const [altCurrency, setAltCurrency] = useState(initial?.currency ?? 'UZS');
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const picked = QUICK_METHODS.find((q) => q.key === quickKey) ?? QUICK_METHODS[0];
  const method = picked.method;
  const currency = picked.currency ?? altCurrency;
  const showCurrencyToggle = picked.currency == null;
  const curLabel = currency === 'UZS' ? "so'm" : 'USD';
  const isIncoming = direction === 'INCOMING';

  const submit = async () => {
    if (!amount || Number(amount) <= 0) {
      setError(t("Summa musbat bo'lishi kerak"));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        direction,
        category,
        method,
        date,
        currency,
        party: party.trim() || null,
        amount: Number(amount),
        note: note.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={
        initial
          ? t("To'lovni tahrirlash")
          : (isIncoming ? t('Yangi kirim') : t('Yangi chiqim'))
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            {t('Bekor qilish')}
          </button>
          <button
            className={`btn ${isIncoming ? 'btn-green' : 'btn-red'}`}
            onClick={submit}
            disabled={busy}
          >
            {busy
              ? t('Saqlanmoqda...')
              : (isIncoming ? t('Kirim qo\'shish') : t('Chiqim qo\'shish'))}
          </button>
        </>
      }
    >
      <div className="field">
        <label>{t("Yo'nalish")}</label>
        <div className="chip-row chip-row-direction">
          <button
            type="button"
            className={`chip ${isIncoming ? 'active chip-green' : ''}`}
            onClick={() => setDirection('INCOMING')}
          >
            📥 {t('Kirim')}
          </button>
          <button
            type="button"
            className={`chip ${!isIncoming ? 'active chip-red' : ''}`}
            onClick={() => setDirection('OUTGOING')}
          >
            📤 {t('Chiqim')}
          </button>
        </div>
      </div>

      <div className="field">
        <label>{t("To'lov usuli")}</label>
        <div className="pay-method-grid">
          {QUICK_METHODS.map((q) => (
            <button
              key={q.key}
              type="button"
              className={`pay-method ${quickKey === q.key ? 'active' : ''}`}
              onClick={() => setQuickKey(q.key)}
            >
              <span className="pm-ico">{q.icon}</span>
              <span className="pm-label">{t(q.label)}</span>
            </button>
          ))}
        </div>
      </div>

      {showCurrencyToggle && (
        <div className="field">
          <label>{t('Valyuta')}</label>
          <div className="chip-row">
            <button type="button" className={`chip ${altCurrency === 'UZS' ? 'active' : ''}`}
                    onClick={() => setAltCurrency('UZS')}>{t("so'm")}</button>
            <button type="button" className={`chip ${altCurrency === 'USD' ? 'active' : ''}`}
                    onClick={() => setAltCurrency('USD')}>USD</button>
          </div>
        </div>
      )}

      <div className="field">
        <label>{t("To'lov turi")}</label>
        <select className="select" value={category}
                onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map(([key, label]) => (
            <option key={key} value={key}>{t(label)}</option>
          ))}
        </select>
      </div>

      <PartyPicker
        value={party}
        onChange={setParty}
        category={category}
      />

      <div className="form-row">
        <div className="field">
          <label>{t('Summa')} ({curLabel})</label>
          <input className="input" type="number" autoFocus value={amount}
                 onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </div>
        <div className="field">
          <label>{t('Sana')}</label>
          <input className="input" type="date" value={date}
                 onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>{t('Izoh (ixtiyoriy)')}</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
    </Modal>
  );
}
