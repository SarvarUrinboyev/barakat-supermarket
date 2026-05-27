import { AiApi } from '../api/endpoints.js';
import { useT } from '../context/Settings.jsx';
import { useApi } from '../hooks/useApi.js';

/**
 * Surfaces anomalies the backend detector flagged today. Renders nothing
 * when the list is empty — a healthy shop shouldn't see this widget.
 */
export function AnomalyBanner() {
  const t = useT();
  const { data } = useApi(() => AiApi.anomalies(), []);
  const rows = data || [];
  if (rows.length === 0) return null;
  return (
    <div className="anomaly-banner">
      {rows.map((a, i) => (
        <div key={i} className={`anomaly-row sev-${a.severity}`}>
          <span className="anomaly-ico">{iconFor(a.severity)}</span>
          <span className="anomaly-msg">{a.message}</span>
        </div>
      ))}
    </div>
  );
}

function iconFor(sev) {
  if (sev === 'critical') return '🚨';
  if (sev === 'warn') return '⚠️';
  return 'ℹ️';
}
