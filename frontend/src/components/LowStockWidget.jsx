import { Link } from 'react-router-dom';
import { ProductApi } from '../api/endpoints.js';
import { useT } from '../context/Settings.jsx';
import { useApi } from '../hooks/useApi.js';

/**
 * Dashboard banner that surfaces products at or below their low-stock
 * threshold. Renders nothing when everything is fine, so a healthy
 * warehouse doesn't waste vertical space.
 *
 * Shows up to 5 items inline + a count chip + a CTA to /warehouse?status=low.
 */
export function LowStockWidget() {
  const t = useT();
  const { data, loading } = useApi(() => ProductApi.lowStock(), []);
  if (loading || !data || data.length === 0) return null;

  const zero = data.filter((p) => p.quantity === 0);
  const low = data.filter((p) => p.quantity > 0);

  return (
    <div
      className="card card-pad section"
      style={{ borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.06)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 24 }}>⚠️</span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {t('Past stok ogohlantirishi')}
          </div>
          <div className="faint" style={{ fontSize: 13, marginTop: 2 }}>
            <strong style={{ color: '#dc2626' }}>{zero.length}</strong> {t('tugagan')},{' '}
            <strong style={{ color: '#f59e0b' }}>{low.length}</strong> {t('tugash arafasida')}
          </div>
        </div>
        <Link to="/warehouse" className="btn btn-ghost" style={{ flex: '0 0 auto' }}>
          {t('Omborni tekshirish')} →
        </Link>
      </div>

      <div
        style={{
          marginTop: 12,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        {data.slice(0, 8).map((p) => (
          <Link
            key={p.id}
            to={`/warehouse/${p.id}`}
            className="badge"
            style={{
              background: p.quantity === 0 ? 'rgba(220, 38, 38, 0.12)' : 'rgba(245, 158, 11, 0.18)',
              color: p.quantity === 0 ? '#991b1b' : '#92400e',
              border: '1px solid currentColor',
              fontSize: 12,
              textDecoration: 'none',
              padding: '4px 10px',
            }}
            title={`${t('Qoldiq')}: ${p.quantity} / ${t('Pol')}: ${p.lowStockThreshold ?? '—'}`}
          >
            {p.name}: <strong>{p.quantity}</strong>
          </Link>
        ))}
        {data.length > 8 && (
          <span className="faint" style={{ fontSize: 12, alignSelf: 'center' }}>
            +{data.length - 8} {t('boshqa')}
          </span>
        )}
      </div>
    </div>
  );
}
