import { useState } from 'react';
import { ShiftApi } from '../api/endpoints.js';
import { useT } from '../context/Settings.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatDate, todayIso } from '../lib/format.js';

/** Full-screen gate shown when no shift is open. */
export function ShiftOpen({ onOpened }) {
  const [cash, setCash] = useState('');
  const [openedBy, setOpenedBy] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const t = useT();

  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(cash);
    if (cash === '' || Number.isNaN(amount) || amount < 0) {
      toast.error(t("Ertalabgi balansni to'g'ri kiriting"));
      return;
    }
    setBusy(true);
    try {
      await ShiftApi.open({ startingCash: amount, openedBy: openedBy.trim() || null });
      toast.success(t('Smena ochildi'));
      onOpened();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <div className="gate-card">
        <div className="g-logo">S</div>
        <h1>SavdoPRO</h1>
        <div className="g-sub">
          {formatDate(todayIso())} &middot; {t('Yangi smenani boshlash')}
        </div>
        <form onSubmit={submit}>
          <div className="field" style={{ textAlign: 'left' }}>
            <label>{t('Ertalabgi balans (USD)')}</label>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              autoFocus
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder={t('Masalan: 2000000')}
            />
            <div className="field-hint">{t('Ertalab kassaga olib kelgan naqd pul.')}</div>
          </div>
          <div className="field" style={{ textAlign: 'left' }}>
            <label>{t('Kim ochmoqda (ixtiyoriy)')}</label>
            <input
              className="input"
              value={openedBy}
              onChange={(e) => setOpenedBy(e.target.value)}
              placeholder={t('Ism')}
            />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? t('Ochilmoqda...') : `🔓  ${t('SMENA OCHISH')}`}
          </button>
        </form>
      </div>
    </div>
  );
}
