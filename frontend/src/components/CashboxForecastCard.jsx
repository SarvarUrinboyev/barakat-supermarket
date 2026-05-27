import { AiApi } from '../api/endpoints.js';
import { Loader } from './ui.jsx';
import { useT } from '../context/Settings.jsx';
import { useApi } from '../hooks/useApi.js';
import { money } from '../lib/format.js';

/**
 * 7-day cashbox projection — each day shown as a bar whose height is
 * proportional to the projected revenue. Bars include the day-of-week
 * label so weekend lift is visible at a glance.
 */
export function CashboxForecastCard() {
  const t = useT();
  const { data, loading, error, reload } = useApi(() => AiApi.cashboxForecast(), []);
  if (loading || error || !data || !data.daily?.length) {
    return (
      <div className="card section">
        <div className="card-head">
          <h2>🔮 {t('Keyingi 7 kun prognozi')}</h2>
        </div>
        <Loader loading={loading} error={error} onRetry={reload}>
          <div className="empty" style={{ padding: 24 }}>{t('Ma\'lumot yetarli emas (oxirgi 30 kun sotuv kerak)')}</div>
        </Loader>
      </div>
    );
  }
  const max = data.daily.reduce((m, d) => Math.max(m, Number(d.projectedRevenueUzs) || 0), 1);
  return (
    <div className="card section">
      <div className="card-head">
        <h2>🔮 {t('Keyingi 7 kun prognozi')}</h2>
        <span className="hint">
          {t('Jami')}: <strong>{money(data.projectedNext7DaysTotal)} so'm</strong> ·
          ~{data.projectedNext7DaysCount} {t('savdo')}
        </span>
      </div>
      <div className="card-pad">
        <p className="faint" style={{ fontSize: 12, marginBottom: 12 }}>
          {t("Oxirgi 30 kunlik mean × weekday adjustment. Real natija o'zgarishi mumkin.")}
        </p>
        <div className="forecast-grid">
          {data.daily.map((d, i) => {
            const pct = Math.max(8, Math.round((Number(d.projectedRevenueUzs) / max) * 100));
            return (
              <div key={i} className="forecast-day">
                <div className="forecast-bar-track">
                  <div className="forecast-bar" style={{ height: `${pct}%` }} />
                </div>
                <div className="forecast-value">{money(d.projectedRevenueUzs)}</div>
                <div className="forecast-wd faint">{weekdayShort(d.weekday)}</div>
                <div className="forecast-date faint">{d.date.slice(5)}</div>
              </div>
            );
          })}
        </div>
        <div className="forecast-meta faint" style={{ marginTop: 12, fontSize: 12 }}>
          {t("O'rtacha kunlik")}: {money(data.meanDailyRevenue)} so'm · {data.meanDailySalesCount} {t('savdo')}
        </div>
      </div>
    </div>
  );
}

function weekdayShort(w) {
  return ({
    MONDAY: 'Du', TUESDAY: 'Se', WEDNESDAY: 'Ch', THURSDAY: 'Pa',
    FRIDAY: 'Ju', SATURDAY: 'Sh', SUNDAY: 'Ya',
  })[w] || w.slice(0, 2);
}
