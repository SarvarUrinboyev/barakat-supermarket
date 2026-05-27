import { useCallback, useState } from 'react';
import { useRealtime } from '../hooks/useRealtime.js';
import { useT } from '../context/Settings.jsx';
import { money } from '../lib/format.js';

/**
 * Dashboard widget — live tail of POS sales as they happen.
 * Subscribes to /topic/sales and keeps the last 8 events in memory.
 *
 * Renders nothing until the first event arrives (so a fresh shift
 * doesn't show an empty box).
 */
export function LiveSalesFeed() {
  const t = useT();
  const [feed, setFeed] = useState([]);
  const handler = useCallback((ev) => {
    setFeed((prev) => [{ ...ev, _key: `${ev.saleId}-${Date.now()}` }, ...prev].slice(0, 8));
  }, []);
  useRealtime('/topic/sales', handler);

  if (feed.length === 0) return null;
  return (
    <div className="card section">
      <div className="card-head">
        <h2>🔴 {t('Live — Kassa operatsiyalari')}</h2>
        <span className="hint">{feed.length}</span>
      </div>
      <div className="card-pad" style={{ paddingTop: 8 }}>
        <div className="live-feed">
          {feed.map((ev) => (
            <div key={ev._key} className="live-feed-row">
              <span className="live-dot" />
              <span className="mono faint">#{ev.saleId}</span>
              <span className="badge" style={{ marginLeft: 8 }}>{ev.paymentMethod}</span>
              <span style={{ flex: 1, marginLeft: 8, color: '#16a34a', fontWeight: 600 }}>
                + {money(ev.totalUzs)} so'm
              </span>
              <span className="faint mono" style={{ fontSize: 11 }}>
                {formatTime(ev.at)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
