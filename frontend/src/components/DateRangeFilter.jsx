import { shiftIso, todayIso } from '../lib/format.js';
import { useT } from '../context/Settings.jsx';

function isoOf(date) {
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Resolves a named preset into a concrete {from, to} ISO range. */
export function rangeForPreset(preset) {
  const today = todayIso();
  switch (preset) {
    case 'yesterday': {
      const y = shiftIso(-1);
      return { from: y, to: y };
    }
    case 'week': {
      const d = new Date();
      const mondayOffset = (d.getDay() + 6) % 7;
      return { from: shiftIso(-mondayOffset), to: today };
    }
    case 'month': {
      const d = new Date();
      return { from: isoOf(new Date(d.getFullYear(), d.getMonth(), 1)), to: today };
    }
    case 'all':
      return { from: '2000-01-01', to: today };
    case 'today':
    default:
      return { from: today, to: today };
  }
}

const PRESETS = [
  ['today', 'Bugun'],
  ['yesterday', 'Kecha'],
  ['week', 'Bu hafta'],
  ['month', 'Bu oy'],
  ['all', 'Hammasi'],
];

/** Quick preset chips plus a custom from/to date range. */
export function DateRangeFilter({ value, onChange }) {
  const t = useT();
  return (
    <div
      className="card card-pad section flex-between"
      style={{ flexWrap: 'wrap', gap: 12 }}
    >
      <div className="chip-row">
        {PRESETS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`chip ${value.preset === key ? 'active' : ''}`}
            onClick={() => onChange({ preset: key, ...rangeForPreset(key) })}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <div className="flex gap-8" style={{ alignItems: 'center' }}>
        <input
          className="input"
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, preset: 'custom', from: e.target.value })}
        />
        <span className="faint">—</span>
        <input
          className="input"
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, preset: 'custom', to: e.target.value })}
        />
      </div>
    </div>
  );
}
