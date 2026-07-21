import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerApi } from '../api/endpoints.js';
import { ConfirmDialog, Modal } from '../components/Modal.jsx';
import { PhoneInput } from '../components/PhoneInput.jsx';
import { useToast } from '../components/Toast.jsx';
import { EmptyState, Loader, MetricCard, PageHeader } from '../components/ui.jsx';
import { useSettings, useT } from '../context/Settings.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatMoneyLocalized } from '../lib/format.js';
import { balanceDisplay, customerOwes } from '../lib/customerBalance.js';
import { localizedErrorMessage } from '../lib/localizedError.js';

export { customerOwes };

/**
 * Interprets a customer's PER-CURRENCY balance (Gate C Q3): each currency
 * bucket is goods - payments in that currency, never merged. A positive bucket
 * means the customer owes the shop; negative means the shop holds credit. The
 * `display` renders every non-zero bucket, e.g. "500 000 so'm + $200".
 * Shared with the customer-detail page.
 */
export function balanceInfo(balanceUzs, balanceUsd, language = 'uz') {
  const u = Number(balanceUzs || 0);
  const d = Number(balanceUsd || 0);
  const owes = u > 0.009 || d > 0.009;
  const holdsCredit = !owes && (u < -0.009 || d < -0.009);
  const display = balanceDisplay(u, d, language);
  if (owes) {
    return { label: 'Mijoz qarzi', tone: 'red', display, badge: 'badge-qarzga', owes: true };
  }
  if (holdsCredit) {
    return { label: 'Bizda qolgan balans', tone: 'green', display, badge: 'badge-naqd', owes: false };
  }
  return { label: 'Hisob teng', tone: 'muted', display: formatMoneyLocalized(0, 'UZS', language), badge: 'badge-muted', owes: false };
}

export function Customers() {
  const navigate = useNavigate();
  const t = useT();
  const { lang } = useSettings();
  const { data, loading, error, reload } = useApi(() => CustomerApi.list(), []);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [reminding, setReminding] = useState(false);
  const toast = useToast();

  const customers = data || [];

  const debtorCount = useMemo(
    () => customers.filter(customerOwes).length,
    [customers],
  );

  const remindDebtors = async () => {
    setReminding(true);
    try {
      const r = await CustomerApi.remindDebtors();
      const sent = (r.telegram || 0) + (r.sms || 0);
      if (sent > 0) {
        const parts = [];
        if (r.telegram) parts.push(`${r.telegram} Telegram`);
        if (r.sms) parts.push(`${r.sms} SMS`);
        toast.success(`${sent} ${t('qarzdorga eslatma yuborildi')}: ${parts.join(', ')}`);
      } else if (r.debtors > 0) {
        toast.error(t("Hech kimga yuborilmadi — kanal sozlanmagan (Telegram bot / SMS)"));
      } else {
        toast.success(t('Qarzdor mijoz yo‘q 👍'));
      }
    } catch (err) {
      toast.error(localizedErrorMessage(t, err));
    } finally {
      setReminding(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return customers;
    }
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q)
        || (c.phone && c.phone.toLowerCase().includes(q)),
    );
  }, [customers, search]);

  const summary = useMemo(() => {
    // So'm buckets only (Barakat operates in so'm; a separate USD receivable
    // card is B5 aggregate work). Per-currency balances are never merged.
    let receivable = 0;
    let credit = 0;
    for (const c of customers) {
      const b = Number(c.balanceUzs || 0);
      if (b > 0) {
        receivable += b;
      } else if (b < 0) {
        credit += -b;
      }
    }
    return { count: customers.length, receivable, credit };
  }, [customers]);

  const confirmDelete = async () => {
    try {
      await CustomerApi.remove(modal.item.id);
      toast.success(t("Mijoz o'chirildi"));
      setModal(null);
      reload();
    } catch (err) {
      toast.error(localizedErrorMessage(t, err));
    }
  };

  return (
    <>
      <PageHeader title={t('Mijozlar')} desc={t('Mijozlar bazasi, berilgan tovarlar va qarz / balans')}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/suppliers')}
          title={t('Yetkazib beruvchilar bo\'limiga o\'tish')}
        >
          🏭 {t('Yetkazib beruvchilar')}
        </button>
        <button
          className="btn btn-ghost"
          onClick={remindDebtors}
          disabled={reminding || debtorCount === 0}
          title={t('Qarzi bor barcha mijozlarga eslatma yuborish')}
        >
          {reminding ? `📨 ${t('Yuborilmoqda...')}` : `📨 ${t('Qarzdorlarga eslatma')}`}
          {debtorCount > 0 ? ` (${debtorCount})` : ''}
        </button>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'add' })}>
          + {t('Yangi mijoz')}
        </button>
      </PageHeader>

      <div className="metrics section">
        <MetricCard tone="blue" icon="👥" label={t('Jami mijozlar')} value={summary.count}
                    currency={false} />
        <MetricCard tone="red" icon="📒" label={t('Mijozlar qarzi')} value={summary.receivable} currencyCode="UZS" />
        <MetricCard tone="green" icon="💵" label={t('Bizdagi balans')} value={summary.credit} currencyCode="UZS" />
      </div>

      <div className="card card-pad section">
        <div className="field" style={{ margin: 0, maxWidth: 360 }}>
          <label>{t('Qidiruv')}</label>
          <input
            className="input"
            placeholder={t('Ism yoki telefon raqami...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{t("Mijozlar ro'yxati")}</h2>
          <span className="hint">{filtered.length} {t('ta')}</span>
        </div>
        <Loader loading={loading} error={error} onRetry={reload}>
          {filtered.length === 0 ? (
            <EmptyState
              icon="👥"
              text={t('Mijoz topilmadi')}
              hint={t("Doimiy mijozlarni qo'shing — qarz va sodiqlik shu yerda yuritiladi.")}
              action={(
                <button className="btn btn-primary" onClick={() => setModal({ type: 'add' })}>
                  + {t("Mijoz qo'shish")}
                </button>
              )}
            />
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('Ism')}</th>
                    <th>{t('Telefon')}</th>
                    <th>{t('Manzil')}</th>
                    <th className="num">⭐ {t('Ball')}</th>
                    <th className="num">{t('Holat')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const info = balanceInfo(c.balanceUzs, c.balanceUsd, lang);
                    return (
                      <tr
                        key={c.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/customers/${c.id}`)}
                      >
                        <td className="name-cell">{c.name}</td>
                        <td className="faint mono">{c.phone || '—'}</td>
                        <td className="faint">{c.address || '—'}</td>
                        <td className="num mono">
                          {Number(c.pointsBalance) > 0
                            ? <span style={{ color: '#d97706', fontWeight: 700 }}>
                                {Number(c.pointsBalance).toLocaleString()}
                              </span>
                            : <span className="faint">—</span>}
                        </td>
                        <td className="num">
                          {info.tone === 'muted' ? (
                            <span className="balance-pill zero">
                              <span className="bp-dot" />
                              {t('Teng')}
                            </span>
                          ) : info.tone === 'red' ? (
                            <span className="balance-pill owed">
                              <span className="bp-ico" aria-hidden>▼</span>
                              <span className="bp-label">{t('Qarz')}</span>
                              <b className="mono">{info.display}</b>
                            </span>
                          ) : (
                            <span className="balance-pill credit">
                              <span className="bp-ico" aria-hidden>▲</span>
                              <span className="bp-label">{t('Balans')}</span>
                              <b className="mono">{info.display}</b>
                            </span>
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions">
                            <button
                              className="icon-btn"
                              title={t('Tahrirlash')}
                              onClick={() => setModal({ type: 'edit', item: c })}
                            >
                              ✏️
                            </button>
                            <button
                              className="icon-btn danger"
                              title={t("O'chirish")}
                              onClick={() => setModal({ type: 'delete', item: c })}
                            >
                              🗑
                            </button>
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
        <CustomerFormModal
          initial={modal.type === 'edit' ? modal.item : null}
          onSubmit={async (body) => {
            if (modal.type === 'add') {
              await CustomerApi.create(body);
              toast.success(t("Mijoz qo'shildi"));
            } else {
              await CustomerApi.update(modal.item.id, body);
              toast.success(t('Mijoz yangilandi'));
            }
            reload();
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'delete' && (
        <ConfirmDialog
          title={t("Mijozni o'chirish")}
          message={`"${modal.item.name}" ${t("mijozini va barcha amallarini o'chirmoqchimisiz?")}`}
          confirmLabel={t("O'chirish")}
          onConfirm={confirmDelete}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
}

/** Add / edit dialog for a customer's contact details. */
export function CustomerFormModal({ initial, onSubmit, onClose }) {
  const t = useT();
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [birthday, setBirthday] = useState(initial?.birthday ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError(t('Mijoz ismi kiritilishi shart'));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        note: note.trim() || null,
        birthday: birthday || null,
      });
      onClose();
    } catch (err) {
      setError(localizedErrorMessage(t, err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={initial ? t('Mijozni tahrirlash') : t('Yangi mijoz')}
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
        <label>{t('Ism *')}</label>
        <input className="input" autoFocus value={name}
               onChange={(e) => setName(e.target.value)}
               placeholder={t('Mijozning ism-familiyasi')} />
      </div>
      <div className="field">
        <label>{t('Telefon raqami')}</label>
        <PhoneInput value={phone} onChange={setPhone} />
      </div>
      <div className="field">
        <label>{t('Manzil')}</label>
        <input className="input" value={address}
               onChange={(e) => setAddress(e.target.value)}
               placeholder={t("Shahar, ko'cha, uy")} />
      </div>
      <div className="field">
        <label>{t("Tug'ilgan kun (ixtiyoriy)")}</label>
        <input className="input" type="date" value={birthday || ''}
               onChange={(e) => setBirthday(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('Izoh (ixtiyoriy)')}</label>
        <input className="input" value={note}
               onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
    </Modal>
  );
}
