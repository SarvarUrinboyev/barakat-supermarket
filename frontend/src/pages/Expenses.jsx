import { useMemo, useState } from 'react';
import { ExpenseApi, HomeExpenseApi } from '../api/endpoints.js';
import { BulkImportModal } from '../components/BulkImportModal.jsx';
import { DateRangeFilter, rangeForPreset } from '../components/DateRangeFilter.jsx';
import { ExpenseFormModal } from '../components/ExpenseFormModal.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { useT } from '../context/Settings.jsx';
import {
  CurrencyToggle, EmptyState, Loader, MetricCard, PageHeader, PaymentBadge,
} from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { useExchangeRate } from '../hooks/useExchangeRate.js';
import { useStickyState } from '../hooks/useStickyState.js';
import { convertMoney, formatDate, formatMoney } from '../lib/format.js';

export function Expenses() {
  const [range, setRange] = useState({ preset: 'today', ...rangeForPreset('today') });
  const [displayCurrency, setDisplayCurrency] = useStickyState('barakat.cur.expenses', 'UZS');
  const [modal, setModal] = useState(null);
  const toast = useToast();
  const rate = useExchangeRate();
  const t = useT();

  const { data, loading, error, reload } = useApi(
    () =>
      Promise.all([
        ExpenseApi.list({ from: range.from, to: range.to }),
        HomeExpenseApi.list({ from: range.from, to: range.to }),
      ]).then(([market, home]) => [
        ...market.map((e) => ({ ...e, kind: 'MARKET' })),
        ...home.map((e) => ({ ...e, kind: 'HOME' })),
      ]),
    [range.from, range.to],
  );

  const rows = useMemo(
    () =>
      (data || [])
        .slice()
        .sort((a, b) => `${b.date}#${b.id}`.localeCompare(`${a.date}#${a.id}`)),
    [data],
  );

  const totals = useMemo(() => {
    const acc = { all: 0, kassa: 0, naqd: 0, karta: 0 };
    for (const e of rows) {
      acc.all += convertMoney(e.amount, e.currency, displayCurrency, rate);
      acc.kassa += convertMoney(e.cashAmount, e.currency, displayCurrency, rate);
      acc.naqd += convertMoney(e.naqdAmount, e.currency, displayCurrency, rate);
      acc.karta += convertMoney(e.cardAmount, e.currency, displayCurrency, rate);
    }
    return acc;
  }, [rows, displayCurrency, rate]);

  const apiFor = (kind) => (kind === 'HOME' ? HomeExpenseApi : ExpenseApi);

  const confirmDelete = async () => {
    const item = modal.item;
    try {
      await apiFor(item.kind).remove(item.id);
      toast.success(t("Xarajat o'chirildi"));
      setModal(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader title={t('Xarajatlar')} desc={t("Market va do'kon xarajatlarini birgalikda ko'rish")}>
        <CurrencyToggle value={displayCurrency} onChange={setDisplayCurrency} />
        <button className="btn btn-ghost" onClick={() => setModal({ type: 'bulk' })}>
          📋 {t("Ko'p kiritish")}
        </button>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'add' })}>
          + {t("Qo'shish")}
        </button>
      </PageHeader>

      <DateRangeFilter value={range} onChange={setRange} />

      <div
        className="section"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}
      >
        <MetricCard tone="red" icon="🧾" label={t('Jami xarajat')} value={totals.all}
                    currencyCode={displayCurrency} />
        <MetricCard tone="amber" icon="🏦" label={t('Kassadan')} value={totals.kassa}
                    currencyCode={displayCurrency} />
        <MetricCard tone="green" icon="💵" label={t('Naqddan')} value={totals.naqd}
                    currencyCode={displayCurrency} />
        <MetricCard tone="blue" icon="💳" label={t('Kartadan')} value={totals.karta}
                    currencyCode={displayCurrency} />
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{t("Xarajatlar ro'yxati")}</h2>
          <span className="hint">{rows.length} {t('ta yozuv')}</span>
        </div>
        <Loader loading={loading} error={error} onRetry={reload}>
          {rows.length === 0 ? (
            <EmptyState icon="🧾" text={t("Bu sana oralig'ida xarajat topilmadi")} />
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('Sana')}</th>
                    <th>{t('Nomi')}</th>
                    <th>{t("Bo'lim")}</th>
                    <th>{t("To'lov turi")}</th>
                    <th className="num">{t('Summa')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={`${e.kind}-${e.id}`}>
                      <td className="nowrap faint">{formatDate(e.date)}</td>
                      <td className="name-cell">{e.name}</td>
                      <td>
                        <span className={`badge badge-${e.kind === 'HOME' ? 'home' : 'market'}`}>
                          {e.kind === 'HOME' ? t("Do'kon") : t('Market')}
                        </span>
                      </td>
                      <td>
                        <PaymentBadge type={e.paymentType} />
                      </td>
                      <td className="num">{formatMoney(e.amount, e.currency)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            title={t('Tahrirlash')}
                            onClick={() => setModal({ type: 'edit', item: e })}
                          >
                            ✏️
                          </button>
                          <button
                            className="icon-btn danger"
                            title={t("O'chirish")}
                            onClick={() => setModal({ type: 'delete', item: e })}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Loader>
      </div>

      {modal?.type === 'add' && (
        <ExpenseFormModal
          title={t('Yangi xarajat')}
          allowCredit
          onSubmit={async (body) => {
            await ExpenseApi.create(body);
            toast.success(t("Xarajat qo'shildi"));
            reload();
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'edit' && (
        <ExpenseFormModal
          title={t('Xarajatni tahrirlash')}
          initial={modal.item}
          allowCredit={modal.item.kind !== 'HOME'}
          onSubmit={async (body) => {
            await apiFor(modal.item.kind).update(modal.item.id, body);
            toast.success(t('Xarajat yangilandi'));
            reload();
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'bulk' && (
        <BulkImportModal
          api={ExpenseApi}
          onDone={reload}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'delete' && (
        <ConfirmDialog
          title={t("Xarajatni o'chirish")}
          message={`"${modal.item.name}" ${t("xarajatini o'chirmoqchimisiz?")}`}
          confirmLabel={t("O'chirish")}
          onConfirm={confirmDelete}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
}
