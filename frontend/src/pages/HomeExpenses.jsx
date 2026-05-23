import { useMemo, useState } from 'react';
import { HomeExpenseApi } from '../api/endpoints.js';
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

/**
 * "Do'kon xarajatlari" - shop running costs. The route, API and table are
 * still named home-expenses; only the user-facing wording is the shop.
 */
export function HomeExpenses() {
  const [range, setRange] = useState({ preset: 'month', ...rangeForPreset('month') });
  const [displayCurrency, setDisplayCurrency] = useStickyState('barakat.cur.shop', 'UZS');
  const [modal, setModal] = useState(null);
  const toast = useToast();
  const rate = useExchangeRate();
  const t = useT();

  const { data, loading, error, reload } = useApi(
    () => HomeExpenseApi.list({ from: range.from, to: range.to }),
    [range.from, range.to],
  );

  const rows = data || [];
  const total = useMemo(
    () => rows.reduce(
      (sum, e) => sum + convertMoney(e.amount, e.currency, displayCurrency, rate),
      0,
    ),
    [rows, displayCurrency, rate],
  );

  const confirmDelete = async () => {
    try {
      await HomeExpenseApi.remove(modal.item.id);
      toast.success(t("Do'kon xarajati o'chirildi"));
      setModal(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader title={t("Do'kon xarajatlari")} desc={t("Do'kon faoliyati uchun xarajatlar")}>
        <CurrencyToggle value={displayCurrency} onChange={setDisplayCurrency} />
        <button className="btn btn-ghost" onClick={() => setModal({ type: 'bulk' })}>
          📋 {t("Ko'p kiritish")}
        </button>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'add' })}>
          + {t("Qo'shish")}
        </button>
      </PageHeader>

      <DateRangeFilter value={range} onChange={setRange} />

      <div className="section" style={{ maxWidth: 320 }}>
        <MetricCard tone="orange" icon="🏪" label={t("Jami do'kon xarajati")} value={total}
                    currencyCode={displayCurrency} />
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{t("Do'kon xarajatlari ro'yxati")}</h2>
          <span className="hint">{rows.length} {t('ta yozuv')}</span>
        </div>
        <Loader loading={loading} error={error} onRetry={reload}>
          {rows.length === 0 ? (
            <EmptyState icon="🏪" text={t("Bu sana oralig'ida do'kon xarajati topilmadi")} />
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('Sana')}</th>
                    <th>{t('Nomi')}</th>
                    <th>{t("To'lov turi")}</th>
                    <th className="num">{t('Summa')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id}>
                      <td className="nowrap faint">{formatDate(e.date)}</td>
                      <td className="name-cell">{e.name}</td>
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
          title={t("Yangi do'kon xarajati")}
          onSubmit={async (body) => {
            await HomeExpenseApi.create(body);
            toast.success(t("Do'kon xarajati qo'shildi"));
            reload();
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'edit' && (
        <ExpenseFormModal
          title={t("Do'kon xarajatini tahrirlash")}
          initial={modal.item}
          onSubmit={async (body) => {
            await HomeExpenseApi.update(modal.item.id, body);
            toast.success(t("Do'kon xarajati yangilandi"));
            reload();
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'bulk' && (
        <BulkImportModal api={HomeExpenseApi} onDone={reload} onClose={() => setModal(null)} />
      )}

      {modal?.type === 'delete' && (
        <ConfirmDialog
          title={t("Do'kon xarajatini o'chirish")}
          message={`"${modal.item.name}" ${t("yozuvini o'chirmoqchimisiz?")}`}
          confirmLabel={t("O'chirish")}
          onConfirm={confirmDelete}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
}
