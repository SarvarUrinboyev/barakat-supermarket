import { useEffect, useState } from 'react';
import { AdminApi } from '../api/endpoints.js';
import { EmptyState, Loader, PageHeader } from '../components/ui.jsx';
import { useT } from '../context/Settings.jsx';

/**
 * Super-admin audit log viewer.
 *
 * Reverse-chronological list of every super-admin write action
 * (account create / update / block, password reset, user CRUD, module
 * toggle). The table is paginated server-side; the panel keeps the
 * full history in a single scrollable card with a "Load more" button.
 *
 * Backend: GET /api/admin/audit?page=N&size=50 (already exists).
 */
export function AuditLog() {
  const t = useT();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [doneAll, setDoneAll] = useState(false);

  const fetchPage = async (p, mode = 'append') => {
    setLoading(true);
    setError(null);
    try {
      const batch = await AdminApi.auditList(p, 50);
      setRows((prev) => (mode === 'reset' ? batch : [...prev, ...batch]));
      setPage(p);
      if (!batch || batch.length < 50) setDoneAll(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPage(0, 'reset');
  }, []);

  return (
    <>
      <PageHeader
        title={t('Audit log')}
        desc={t('Super-admin amallar tarixi — append-only, oxirgisi tepada')}
      >
        <button
          className="btn btn-ghost"
          onClick={() => { setDoneAll(false); void fetchPage(0, 'reset'); }}
          disabled={loading}
        >
          ↻ {t('Yangilash')}
        </button>
      </PageHeader>

      <div className="card section">
        <Loader loading={loading && rows.length === 0} error={error}
                onRetry={() => fetchPage(0, 'reset')}>
          {rows.length === 0 ? (
            <EmptyState icon="📜" text={t("Audit log bo'sh")} />
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('Vaqt')}</th>
                    <th>{t('Kim')}</th>
                    <th>{t('Amal')}</th>
                    <th>{t('Obyekt')}</th>
                    <th>{t('Tafsilot')}</th>
                    <th>{t('IP')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="faint mono" style={{ whiteSpace: 'nowrap' }}>
                        {formatTimestamp(r.createdAt)}
                      </td>
                      <td><strong>{r.actorName}</strong></td>
                      <td>
                        <span className={`badge ${actionBadge(r.action)}`}>
                          {r.action}
                        </span>
                      </td>
                      <td>
                        <span className="faint">{r.targetType}</span>{' '}
                        {r.targetLabel || `#${r.targetId ?? '—'}`}
                      </td>
                      <td className="faint" style={{ fontSize: 12, maxWidth: 320 }}>
                        {r.detail || '—'}
                      </td>
                      <td className="faint mono" style={{ fontSize: 11 }}>
                        {r.clientIp || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Loader>

        {!doneAll && rows.length > 0 && (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <button
              className="btn btn-ghost"
              onClick={() => fetchPage(page + 1, 'append')}
              disabled={loading}
            >
              {loading ? t('Yuklanmoqda...') : t('Yana yuklash')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function formatTimestamp(iso) {
  if (!iso) return '—';
  // YYYY-MM-DDTHH:mm:ss(.fff) → "DD.MM HH:mm:ss"
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  return m ? `${m[3]}.${m[2]} ${m[4]}:${m[5]}:${m[6]}` : iso;
}

function actionBadge(action) {
  if (!action) return '';
  const a = String(action).toUpperCase();
  if (a.endsWith('_DELETE')) return 'badge-qarzga';
  if (a.endsWith('_BLOCK')) return 'badge-aralash';
  if (a.endsWith('_CREATE')) return 'badge-naqd';
  if (a.includes('PASSWORD') || a.includes('RESET')) return 'badge-aralash';
  return '';
}
