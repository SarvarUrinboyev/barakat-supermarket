import { useState } from 'react';
import { money, PAYMENT_LABELS, todayIso } from '../lib/format.js';
import { useT } from '../context/Settings.jsx';
import { Modal } from './Modal.jsx';

/**
 * Add / edit dialog for a market or shop expense.
 * `allowCredit` adds the QARZGA option (market expenses only).
 * Each expense carries its own currency (UZS by default).
 * `onSubmit(body)` must return a promise.
 */
export function ExpenseFormModal({ title, initial, allowCredit, onSubmit, onClose }) {
  const t = useT();
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [currency, setCurrency] = useState(initial?.currency ?? 'UZS');
  const [paymentType, setPaymentType] = useState(initial?.paymentType ?? 'NAQD');
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [cash, setCash] = useState(initial?.cashAmount ?? '');
  const [naqd, setNaqd] = useState(initial?.naqdAmount ?? '');
  const [card, setCard] = useState(initial?.cardAmount ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const types = allowCredit
    ? ['NAQD', 'KASSA', 'KARTA', 'ARALASH', 'QARZGA']
    : ['NAQD', 'KASSA', 'KARTA', 'ARALASH'];
  const curLabel = currency === 'UZS' ? "so'm" : 'USD';

  const submit = async () => {
    const total = Number(amount);
    if (!name.trim()) {
      setError(t('Nomi kiritilishi shart'));
      return;
    }
    if (!total || total <= 0) {
      setError(t("Summa musbat bo'lishi kerak"));
      return;
    }
    const body = {
      name: name.trim(),
      amount: total,
      paymentType,
      date,
      currency,
      note: note.trim() || null,
    };
    if (paymentType === 'ARALASH') {
      body.cashAmount = Number(cash) || 0;
      body.naqdAmount = Number(naqd) || 0;
      body.cardAmount = Number(card) || 0;
      const sum = body.cashAmount + body.naqdAmount + body.cardAmount;
      // 1-tiyin float tolerance — see Orders.jsx for rationale.
      if (Math.abs(sum - total) > 0.01) {
        setError(`${t("Aralash bo'laklar yig'indisi")} (${money(sum)}) ${t('summaga')} (${money(total)}) ${t('teng emas')}`);
        return;
      }
    }
    setBusy(true);
    try {
      await onSubmit(body);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={title}
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
        <label>{t('Nomi')}</label>
        <input
          className="input"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('Masalan: ijara, svet, internet')}
        />
      </div>

      <div className="field">
        <label>{t('Valyuta')}</label>
        <div className="chip-row">
          <button
            type="button"
            className={`chip ${currency === 'UZS' ? 'active' : ''}`}
            onClick={() => setCurrency('UZS')}
          >
            so'm
          </button>
          <button
            type="button"
            className={`chip ${currency === 'USD' ? 'active' : ''}`}
            onClick={() => setCurrency('USD')}
          >
            USD
          </button>
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label>{t('Summa')} ({curLabel})</label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="field">
          <label>{t('Sana')}</label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label>{t("To'lov turi")}</label>
        <div className="chip-row">
          {types.map((pt) => (
            <button
              key={pt}
              type="button"
              className={`chip ${paymentType === pt ? 'active' : ''}`}
              onClick={() => setPaymentType(pt)}
            >
              {t(PAYMENT_LABELS[pt])}
            </button>
          ))}
        </div>
      </div>

      {paymentType === 'ARALASH' && (
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="field">
            <label>{t('Kassa')}</label>
            <input className="input" type="number" value={cash}
                   onChange={(e) => setCash(e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label>{t('Naqd')}</label>
            <input className="input" type="number" value={naqd}
                   onChange={(e) => setNaqd(e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label>{t('Karta')}</label>
            <input className="input" type="number" value={card}
                   onChange={(e) => setCard(e.target.value)} placeholder="0" />
          </div>
        </div>
      )}

      <div className="field">
        <label>{t('Izoh (ixtiyoriy)')}</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {error && <div className="err" style={{ color: 'var(--red)' }}>{error}</div>}
    </Modal>
  );
}
