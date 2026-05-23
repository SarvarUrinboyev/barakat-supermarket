import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerApi, DebtApi } from '../api/endpoints.js';
import { ConfirmDialog, Modal } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { useT } from '../context/Settings.jsx';
import { EmptyState, Loader } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatDate, money, todayIso, usd } from '../lib/format.js';

const SIDES = {
  MY: {
    title: 'Mening qarzlarim',
    subtitle: 'Yetkazib beruvchilar / supplier debts',
    nameField: 'name',
    nameLabel: 'Kimdan olindi',
    tone: 'liab',
    api: {
      create: DebtApi.myCreate,
      update: DebtApi.myUpdate,
      remove: DebtApi.myRemove,
      pay: DebtApi.myPay,
      add: DebtApi.myAdd,
      history: DebtApi.myHistory,
    },
  },
  CUST: {
    title: 'Bizdan qarzlar',
    subtitle: 'Mijozlar / debitorlar',
    nameField: 'customerName',
    nameLabel: 'Mijoz ismi',
    tone: 'recv',
    api: {
      create: DebtApi.custCreate,
      update: DebtApi.custUpdate,
      remove: DebtApi.custRemove,
      pay: DebtApi.custPay,
      add: DebtApi.custAdd,
      history: DebtApi.custHistory,
    },
  },
};

/** Helper: chooses a quick "round payment" suggestion based on the remaining amount. */
function quickAmount(remaining) {
  const n = Number(remaining) || 0;
  if (n >= 200) return 100;
  if (n >= 50) return 25;
  if (n >= 20) return 10;
  if (n >= 5) return 5;
  return Math.max(1, Math.round(n));
}

export function Debt() {
  // Load the standalone debt ledger AND the customer list in parallel — customers
  // with a positive balance are merged into "Bizdan qarzlar" as virtual entries
  // so the user sees the whole picture in one place.
  const { data, loading, error, reload } = useApi(
    () => Promise.all([DebtApi.summary(), CustomerApi.list()]),
    [],
  );
  const [modal, setModal] = useState(null);
  const toast = useToast();
  const t = useT();
  const navigate = useNavigate();
  const close = () => setModal(null);

  const confirmDelete = async () => {
    try {
      await SIDES[modal.side].api.remove(modal.item.id);
      toast.success(t("Qarz o'chirildi"));
      close();
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Quick-pay action used by the "+50$ To'lash" and "To'liq yopish" buttons.
  const quickPay = async (side, item, amount) => {
    try {
      await SIDES[side].api.pay(item.id, { amount, date: todayIso(), note: null });
      toast.success(t("To'lov qabul qilindi"));
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <Loader loading={loading} error={error} onRetry={reload}>
        {data && (() => {
          const [summary, customers] = data;
          // Build virtual "Bizdan qarz" entries from customers that currently owe us.
          const customerDebts = (customers || [])
            .filter((c) => Number(c.balance) > 0.009)
            .map((c) => ({
              id: `cust-${c.id}`,
              customerId: c.id,
              source: 'CUSTOMER',
              date: null,
              customerName: c.name,
              productName: c.phone || null,
              originalAmount: c.balance,
              paidAmount: 0,
              remainingAmount: c.balance,
              paidPercent: 0,
              paid: false,
              note: c.address || null,
            }));
          const customerDebtsTotal = customerDebts
            .reduce((acc, d) => acc + Number(d.remainingAmount), 0);
          const allReceivables = [...customerDebts, ...summary.customerDebts];
          const totalReceivable = Number(summary.customerDebtTotal) + customerDebtsTotal;
          return (
            <>
              <DebtHero
                receivable={totalReceivable}
                liability={summary.myDebtTotal}
                onAdd={(side) => setModal({ type: 'add', side })}
              />
              <div className="debt-lists">
                <DebtColumn
                  side="CUST"
                  debts={allReceivables}
                  setModal={setModal}
                  quickPay={quickPay}
                  onOpenCustomer={(id) => navigate(`/customers/${id}`)}
                />
                <DebtColumn
                  side="MY"
                  debts={summary.myDebts}
                  setModal={setModal}
                  quickPay={quickPay}
                  onOpenCustomer={() => {}}
                />
              </div>
            </>
          );
        })()}
      </Loader>

      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <DebtFormModal
          side={modal.side}
          initial={modal.item}
          onSubmit={async (body) => {
            const api = SIDES[modal.side].api;
            if (modal.type === 'add') {
              await api.create(body);
              toast.success(t("Qarz qo'shildi"));
            } else {
              await api.update(modal.item.id, body);
              toast.success(t('Qarz yangilandi'));
            }
            reload();
          }}
          onClose={close}
        />
      )}

      {(modal?.type === 'pay' || modal?.type === 'addamount') && (
        <PaymentModal
          mode={modal.type}
          item={modal.item}
          onSubmit={async (body) => {
            const api = SIDES[modal.side].api;
            if (modal.type === 'pay') {
              await api.pay(modal.item.id, body);
              toast.success(t("To'lov qabul qilindi"));
            } else {
              await api.add(modal.item.id, body);
              toast.success(t("Qarzga qo'shildi"));
            }
            reload();
          }}
          onClose={close}
        />
      )}

      {modal?.type === 'history' && (
        <HistoryModal side={modal.side} item={modal.item} onClose={close} />
      )}

      {modal?.type === 'delete' && (
        <ConfirmDialog
          title={t("Qarzni o'chirish")}
          message={t("Bu qarz yozuvini o'chirmoqchimisiz?")}
          confirmLabel={t("O'chirish")}
          onConfirm={confirmDelete}
          onCancel={close}
        />
      )}
    </>
  );
}

/* ----------------------------------------------------------- hero / stats */

function DebtHero({ receivable, liability, onAdd }) {
  const t = useT();
  const recv = Number(receivable) || 0;
  const liab = Number(liability) || 0;
  let healthPct = 100;
  let rating;
  if (liab === 0 && recv === 0) {
    healthPct = 100;
    rating = t("Bo'sh");
  } else if (liab === 0) {
    healthPct = 100;
    rating = t("A'LO (Xavfsiz)");
  } else {
    const sum = recv + liab;
    healthPct = sum > 0 ? Math.round((recv / sum) * 100) : 0;
    if (healthPct >= 75) rating = t("A'LO (Xavfsiz)");
    else if (healthPct >= 45) rating = t("O'rtacha");
    else rating = t("Xavfli");
  }

  return (
    <>
      <div className="debt-head section">
        <div className="dh-title">
          <span className="dh-ico" aria-hidden>⚖️</span>
          <div>
            <h1>{t('Qarz Daftari & Audit')}</h1>
            <div className="dh-sub">
              {t("Mijozlar debitorligi, ta'minotchilar majburiyatlari va risk tahlili")}
            </div>
          </div>
        </div>
        <div className="dh-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => onAdd('MY')}>
            + {t('Mening qarzim')}
          </button>
          <button className="btn btn-primary" onClick={() => onAdd('CUST')}>
            + {t('Yangi Qarz Yozuvi')}
          </button>
        </div>
      </div>

      <div className="debt-stats section">
        <div className="debt-stat recv">
          <div className="ds-head">
            <span className="ds-eyebrow recv">{t('Bizdan Qarzlar')}</span>
            <span className="ds-emoji" aria-hidden>📈</span>
          </div>
          <div className="ds-label">{t('JAMI KUTILAYOTGAN TUSHUM')}</div>
          <div className="ds-value mono">{usd(recv)}</div>
          <div className="ds-glow" />
        </div>

        <div className="debt-stat liab">
          <div className="ds-head">
            <span className="ds-eyebrow liab">{t('Mening Qarzlarim')}</span>
            <span className="ds-emoji" aria-hidden>📉</span>
          </div>
          <div className="ds-label">{t('JAMI MAJBURIYATLAR')}</div>
          <div className="ds-value mono">{usd(liab)}</div>
          <div className="ds-glow" />
        </div>

        <div className="debt-stat health">
          <HealthGauge percent={healthPct} />
          <div>
            <div className="ds-eyebrow muted">{t("MOLIYAVIY SOG'LOMLIK")}</div>
            <div className="ds-health-title">{t('Kredit risk reytingi')}</div>
            <div className="ds-health-rating">
              {t('Holat:')} <strong>{rating}</strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function HealthGauge({ percent }) {
  const value = Math.max(0, Math.min(100, percent));
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  let color = '#10b981';
  if (value < 45) color = '#ef4444';
  else if (value < 75) color = '#f59e0b';
  return (
    <div className="health-ring">
      <svg viewBox="0 0 70 70" width="70" height="70">
        <circle cx="35" cy="35" r={r} fill="none"
                stroke="var(--border)" strokeWidth="6" />
        <circle cx="35" cy="35" r={r} fill="none"
                stroke={color} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${dash} ${c}`}
                transform="rotate(-90 35 35)" />
      </svg>
      <span className="health-pct mono">{value}%</span>
    </div>
  );
}

/* ----------------------------------------------------------- list column */

function DebtColumn({ side, debts, setModal, quickPay, onOpenCustomer }) {
  const cfg = SIDES[side];
  const t = useT();
  const activeCount = debts.filter((d) => !d.paid).length;
  return (
    <div className="debt-col">
      <div className="debt-col-head">
        <div className={`dch-title ${cfg.tone}`}>
          <span className="dch-dot" />
          {t(cfg.title)}
        </div>
        <div className="dch-meta">
          {debts.length} {t("yozuv")} · {activeCount} {t('faol')}
        </div>
      </div>
      {debts.length === 0 ? (
        <EmptyState icon="📒" text={t("Bu yo'nalishda faol qarz yo'q")} />
      ) : (
        <div className="debt-stack">
          {debts.map((d) => (
            <DebtCard key={d.id} side={side} debt={d} setModal={setModal}
                      quickPay={quickPay} onOpenCustomer={onOpenCustomer} />
          ))}
        </div>
      )}
    </div>
  );
}

function DebtCard({ side, debt, setModal, quickPay, onOpenCustomer }) {
  const t = useT();
  const cfg = SIDES[side];
  const name = debt[cfg.nameField];
  const pct = Math.max(0, Math.min(100, Number(debt.paidPercent) || 0));
  const closed = !!debt.paid;
  const isCustomerLedger = debt.source === 'CUSTOMER';
  const statusClass = closed ? 'closed' : (cfg.tone === 'recv' ? 'active-recv' : 'active-liab');
  const statusText = closed ? t('Yopilgan') : (isCustomerLedger ? t('Mijoz') : t('Faol'));
  const quick = quickAmount(debt.remainingAmount);

  return (
    <div className={`debt-card ${closed ? 'is-closed' : ''} ${isCustomerLedger ? 'is-customer' : ''}`}>
      <div className="dc-head">
        <div>
          <h4>
            {name}
            {isCustomerLedger && <span className="dc-source-tag">{t('MIJOZ LEDGER')}</span>}
          </h4>
          <div className="dc-meta">
            {debt.productName ? <span>{debt.productName}</span> : null}
            {debt.productName && debt.date ? <span className="dot-sep" /> : null}
            {debt.date ? <span>{formatDate(debt.date)}</span> : null}
            {!debt.date && !debt.productName && isCustomerLedger && (
              <span>{t('Tovar ledger balansi')}</span>
            )}
          </div>
        </div>
        <span className={`dc-status ${statusClass}`}>{statusText}</span>
      </div>

      <div className="dc-progress">
        <div className="dc-progress-meta mono">
          <span>{t("To'langan qism")}: {pct}%</span>
          <span>{t('Qoldiq')}: <b>{usd(debt.remainingAmount)}</b></span>
        </div>
        <div className={`dc-progress-bar ${closed ? 'closed' : cfg.tone}`}>
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="dc-foot">
        <div>
          <span className="dc-foot-label">{t('Umumiy summa')}</span>
          <span className="dc-foot-val muted mono">{usd(debt.originalAmount)}</span>
        </div>
        <div className="right">
          <span className="dc-foot-label">{t("To'langan")}</span>
          <span className="dc-foot-val mono">{usd(debt.paidAmount)}</span>
        </div>
      </div>

      {!closed && isCustomerLedger && (
        <div className="dc-actions">
          <button
            className="btn-debt solid"
            onClick={() => onOpenCustomer(debt.customerId)}
          >
            {t('Tafsilot → Mijoz sahifasi')}
          </button>
          <span className="dc-hint">
            {t("To'lov qabul qilish: mijoz sahifasidan")}
          </span>
        </div>
      )}
      {!closed && !isCustomerLedger && (
        <div className="dc-actions">
          <button
            className="btn-debt outline"
            onClick={() => quickPay(side, debt, Math.min(quick, Number(debt.remainingAmount)))}
            title={t("Tezkor to'lov")}
          >
            +{quick}$ {t("To'lash")}
          </button>
          <button
            className="btn-debt solid"
            onClick={() => quickPay(side, debt, Number(debt.remainingAmount))}
          >
            {t("To'liq yopish")}
          </button>
          <button
            className="btn-debt icon"
            title={t("To'lov")}
            onClick={() => setModal({ type: 'pay', side, item: debt })}
          >💵</button>
          <button
            className="btn-debt icon"
            title={t("Qo'shish")}
            onClick={() => setModal({ type: 'addamount', side, item: debt })}
          >＋</button>
          <button
            className="btn-debt icon"
            title={t('Tarix')}
            onClick={() => setModal({ type: 'history', side, item: debt })}
          >🕘</button>
          <button
            className="btn-debt icon"
            title={t('Tahrirlash')}
            onClick={() => setModal({ type: 'edit', side, item: debt })}
          >✏️</button>
          <button
            className="btn-debt icon danger"
            title={t("O'chirish")}
            onClick={() => setModal({ type: 'delete', side, item: debt })}
          >🗑</button>
        </div>
      )}
      {closed && (
        <div className="dc-actions">
          <button
            className="btn-debt icon"
            title={t('Tarix')}
            onClick={() => setModal({ type: 'history', side, item: debt })}
          >🕘 {t('Tarix')}</button>
          <button
            className="btn-debt icon"
            title={t('Tahrirlash')}
            onClick={() => setModal({ type: 'edit', side, item: debt })}
          >✏️</button>
          <button
            className="btn-debt icon danger"
            title={t("O'chirish")}
            onClick={() => setModal({ type: 'delete', side, item: debt })}
          >🗑</button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- form modal */

function DebtFormModal({ side, initial, onSubmit, onClose }) {
  const cfg = SIDES[side];
  const [name, setName] = useState(initial?.[cfg.nameField] ?? '');
  const [productName, setProductName] = useState(initial?.productName ?? '');
  const [amount, setAmount] = useState(initial?.originalAmount ?? '');
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = useT();

  const submit = async () => {
    if (!name.trim()) {
      setError(`${t(cfg.nameLabel)} ${t('kiritilishi shart')}`);
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError(t("Summa musbat bo'lishi kerak"));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        [cfg.nameField]: name.trim(),
        productName: productName.trim() || null,
        originalAmount: Number(amount),
        date,
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
      title={initial ? t('Qarzni tahrirlash') : `${t('Yangi qarz')} · ${t(cfg.title)}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            {t('Bekor qilish')}
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? t('Saqlanmoqda...') : t('Saqlash')}
          </button>
        </>
      }
    >
      <div className="field">
        <label>{t(cfg.nameLabel)}</label>
        <input className="input" autoFocus value={name}
               onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('Tovar / sabab (ixtiyoriy)')}</label>
        <input className="input" value={productName}
               onChange={(e) => setProductName(e.target.value)} />
      </div>
      <div className="form-row">
        <div className="field">
          <label>{t('Summa (USD)')}</label>
          <input className="input" type="number" value={amount}
                 onChange={(e) => setAmount(e.target.value)} />
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

function PaymentModal({ mode, item, onSubmit, onClose }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = useT();
  const isPay = mode === 'pay';
  const value = Number(amount) || 0;
  const overpay = isPay && value > Number(item.remainingAmount);

  const submit = async () => {
    if (!amount || value <= 0) {
      setError(t("Summani to'g'ri kiriting"));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ amount: value, date, note: null });
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isPay ? t("Qarzni to'lash") : t("Qarzga qo'shish")}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            {t('Bekor qilish')}
          </button>
          <button
            className={`btn ${isPay ? 'btn-green' : 'btn-primary'}`}
            onClick={submit}
            disabled={busy}
          >
            {busy ? t('Saqlanmoqda...') : isPay ? t("To'lash") : t("Qo'shish")}
          </button>
        </>
      }
    >
      <p className="muted" style={{ marginBottom: 12 }}>
        {t('Qoldiq:')} <b>{usd(item.remainingAmount)}</b>
      </p>
      <div className="form-row">
        <div className="field">
          <label>{t('Summa (USD)')}</label>
          <input className="input" type="number" autoFocus value={amount}
                 onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('Sana')}</label>
          <input className="input" type="date" value={date}
                 onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      {overpay && (
        <div
          className="badge badge-karta"
          style={{ padding: '8px 12px', display: 'block', borderRadius: 8 }}
        >
          ⚠️ {t("Diqqat: to'lov summasi qoldiqdan oshib ketdi.")}
        </div>
      )}
      {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</div>}
    </Modal>
  );
}

function HistoryModal({ side, item, onClose }) {
  const { data, loading, error } = useApi(() => SIDES[side].api.history(item.id), [item.id]);
  const t = useT();
  return (
    <Modal title={t('Qarz tarixi')} onClose={onClose}>
      <Loader loading={loading} error={error}>
        {data && data.length === 0 && <EmptyState icon="🕘" text={t("Tarix bo'sh")} />}
        {data && data.length > 0 && (
          <table className="tbl">
            <thead>
              <tr>
                <th>{t('Sana')}</th>
                <th>{t('Amal')}</th>
                <th className="num">{t('Summa')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((h) => (
                <tr key={h.id}>
                  <td>{formatDate(h.paymentDate)}</td>
                  <td>
                    {h.entryType === 'PAYMENT' ? (
                      <span className="badge badge-naqd">{t("To'lov")}</span>
                    ) : (
                      <span className="badge badge-karta">{t("Qo'shildi")}</span>
                    )}
                  </td>
                  <td className="num">{money(h.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Loader>
    </Modal>
  );
}
