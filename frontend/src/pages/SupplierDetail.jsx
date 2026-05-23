import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SupplierApi } from '../api/endpoints.js';
import { ConfirmDialog } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { EmptyState, Loader, MetricCard } from '../components/ui.jsx';
import { useT } from '../context/Settings.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatDate, formatMoney } from '../lib/format.js';
import { SupplierFormModal } from './Suppliers.jsx';

/** Supplier detail: contact + payment history + CSV export. */
export function SupplierDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi(() => SupplierApi.detail(id), [id]);

  return (
    <Loader loading={loading} error={error} onRetry={reload}>
      {data && <Detail key={id} data={data} reload={reload} />}
    </Loader>
  );
}

function Detail({ data, reload }) {
  const navigate = useNavigate();
  const t = useT();
  const toast = useToast();
  const [modal, setModal] = useState(null);

  const supplier = data.supplier;
  const payments = data.payments;

  const remove = async () => {
    try {
      await SupplierApi.remove(supplier.id);
      toast.success(t("Yetkazib beruvchi o'chirildi"));
      navigate('/suppliers');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const exportCsv = () => {
    const header = ['Sana', 'Yo\'nalish', 'Usul', 'Valyuta', 'Summa', 'Izoh'].join(',');
    const lines = payments.map((p) => [
      formatDate(p.date),
      p.direction === 'INCOMING' ? 'Kirim' : 'Chiqim',
      p.method || '',
      p.currency || 'UZS',
      Number(p.amount).toFixed(2),
      `"${(p.note || '').replace(/"/g, '""')}"`,
    ].join(','));
    const csv = '﻿' + [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${supplier.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_tarix.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
            color: 'var(--text-faint)',
          }}>
            <Link to="/suppliers" style={{ color: 'inherit' }}>
              {t('YETKAZIB BERUVCHILAR')}
            </Link>
            {'  /  '}
            {supplier.name.toUpperCase()}
          </div>
          <h1>{supplier.name}</h1>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => navigate('/suppliers')}>
            {t('Orqaga')}
          </button>
          <button className="btn btn-ghost" onClick={() => setModal({ type: 'edit' })}>
            ✏️ {t('Tahrirlash')}
          </button>
          <button
            className="btn btn-ghost"
            onClick={exportCsv}
            disabled={payments.length === 0}
            title={t('Tarixni CSV ko\'rinishida yuklab olish')}
          >
            ⬇ CSV
          </button>
        </div>
      </div>

      <div className="metrics section">
        <MetricCard tone="green" icon="💸" label={t("To'langan jami")}
                    value={supplier.paidTotal} />
        <MetricCard tone="blue" icon="📋" label={t('Yozuvlar soni')}
                    value={payments.length} currency={false} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <h2>{t("To'lov tarixi")}</h2>
          </div>
          {payments.length === 0 ? (
            <EmptyState
              icon="💰"
              text={t("Hali to'lov yo'q — To'lov sahifasida yetkazib beruvchiga to'lov yarating")}
            />
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('Sana')}</th>
                    <th>{t("Yo'nalish")}</th>
                    <th>{t('Usul')}</th>
                    <th className="num">{t('Summa')}</th>
                    <th>{t('Izoh')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="faint">{formatDate(p.date)}</td>
                      <td>
                        {p.direction === 'INCOMING' ? (
                          <span className="badge badge-naqd">📥 {t('Kirim')}</span>
                        ) : (
                          <span className="badge badge-qarzga">📤 {t('Chiqim')}</span>
                        )}
                      </td>
                      <td className="faint">{p.method}</td>
                      <td className={`num mono ${p.direction === 'INCOMING' ? 'amount-pos' : 'amount-neg'}`}>
                        {p.direction === 'INCOMING' ? '+' : '−'}
                        {formatMoney(p.amount, p.currency)}
                      </td>
                      <td className="faint">{p.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="list-stack">
          <div className="card">
            <div className="card-head">
              <h2>{t("Yetkazib beruvchi ma'lumotlari")}</h2>
            </div>
            <div className="card-pad">
              <InfoRow label={t('Ism')} value={supplier.name} />
              <InfoRow label={t('Telefon')} value={supplier.phone || '—'} />
              <InfoRow label={t('Manzil')} value={supplier.address || '—'} />
              <InfoRow label={t('Izoh')} value={supplier.note || '—'} last />
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--red)' }}
            onClick={() => setModal({ type: 'delete' })}
          >
            🗑 {t("Yetkazib beruvchini o'chirish")}
          </button>
        </div>
      </div>

      {modal?.type === 'edit' && (
        <SupplierFormModal
          initial={supplier}
          onSubmit={async (body) => {
            await SupplierApi.update(supplier.id, body);
            toast.success(t('Yangilandi'));
            reload();
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'delete' && (
        <ConfirmDialog
          title={t("Yetkazib beruvchini o'chirish")}
          message={t("Bu yetkazib beruvchini o'chirmoqchimisiz?")}
          confirmLabel={t("O'chirish")}
          onConfirm={remove}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
}

function InfoRow({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 12,
      padding: '9px 0', borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <span className="faint" style={{ fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 13, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
