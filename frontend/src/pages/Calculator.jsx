import { useEffect, useState } from 'react';
import { ExchangeRateApi } from '../api/endpoints.js';
import { Loader, PageHeader } from '../components/ui.jsx';
import { useT } from '../context/Settings.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatDate, money } from '../lib/format.js';

const OPS = {
  '+': (a, b) => a + b,
  '−': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => a / b,
};

/** Turns a JS number into a clean display string. */
function fmt(n) {
  if (!Number.isFinite(n)) {
    return 'Xato';
  }
  return String(Math.round(n * 1e8) / 1e8);
}

/** A single calculator key. */
function CalcBtn({ label, cls = '', onClick }) {
  return (
    <button type="button" className={`calc-btn ${cls}`} onClick={onClick}>
      {label}
    </button>
  );
}

/** Kalkulyator page: a calculator plus a live USD/UZS converter. */
export function Calculator() {
  const t = useT();
  return (
    <>
      <PageHeader title={t('Kalkulyator')} desc={t('Hisob-kitob va valyuta konvertori')} />
      <div className="grid grid-2">
        <CalcPad />
        <ConverterCard />
      </div>
    </>
  );
}

function CalcPad() {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState(null);
  const [op, setOp] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [expr, setExpr] = useState('');

  const isError = display === 'Xato';

  const clearAll = () => {
    setDisplay('0');
    setAcc(null);
    setOp(null);
    setWaiting(false);
    setExpr('');
  };

  const digit = (d) => {
    if (isError || waiting) {
      setDisplay(d);
      setWaiting(false);
      return;
    }
    if (display === '0') {
      setDisplay(d);
      return;
    }
    if (display.replace(/[-.]/g, '').length >= 12) {
      return;
    }
    setDisplay(display + d);
  };

  const dot = () => {
    if (isError || waiting) {
      setDisplay('0.');
      setWaiting(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const chooseOp = (next) => {
    if (isError) {
      return;
    }
    const current = parseFloat(display);
    if (acc !== null && op && !waiting) {
      const result = OPS[op](acc, current);
      setDisplay(fmt(result));
      setAcc(Number.isFinite(result) ? result : null);
      setExpr(`${fmt(result)} ${next}`);
    } else {
      setAcc(current);
      setExpr(`${fmt(current)} ${next}`);
    }
    setOp(next);
    setWaiting(true);
  };

  const equals = () => {
    if (isError || op === null || acc === null) {
      return;
    }
    const current = parseFloat(display);
    const result = OPS[op](acc, current);
    setExpr(`${fmt(acc)} ${op} ${fmt(current)} =`);
    setDisplay(fmt(result));
    setAcc(null);
    setOp(null);
    setWaiting(true);
  };

  const backspace = () => {
    if (isError || waiting) {
      return;
    }
    if (display.length <= 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const toggleSign = () => {
    if (isError || display === '0') {
      return;
    }
    setDisplay(display.startsWith('-') ? display.slice(1) : `-${display}`);
  };

  const percent = () => {
    if (isError) {
      return;
    }
    setDisplay(fmt(parseFloat(display) / 100));
    setWaiting(true);
  };

  // Keyboard support. No dependency array: the listener is rebound every
  // render so the handlers always read the current state.
  useEffect(() => {
    const onKey = (e) => {
      // Ignore keystrokes while a form field (e.g. the converter) is focused.
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        return;
      }
      const k = e.key;
      if (k >= '0' && k <= '9') {
        digit(k);
      } else if (k === '.' || k === ',') {
        dot();
      } else if (k === '+') {
        chooseOp('+');
      } else if (k === '-') {
        chooseOp('−');
      } else if (k === '*') {
        chooseOp('×');
      } else if (k === '/') {
        e.preventDefault();
        chooseOp('÷');
      } else if (k === 'Enter' || k === '=') {
        e.preventDefault();
        equals();
      } else if (k === 'Backspace') {
        backspace();
      } else if (k === 'Escape') {
        clearAll();
      } else if (k === '%') {
        percent();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="card card-pad">
      <div className="calc-screen">
        <div className="calc-expr">{expr || ' '}</div>
        <div className="calc-main">{display}</div>
      </div>
      <div className="calc-grid">
        <CalcBtn label="C" cls="fn" onClick={clearAll} />
        <CalcBtn label="⌫" cls="fn" onClick={backspace} />
        <CalcBtn label="%" cls="fn" onClick={percent} />
        <CalcBtn label="÷" cls={`op ${op === '÷' ? 'active' : ''}`}
                 onClick={() => chooseOp('÷')} />
        <CalcBtn label="7" onClick={() => digit('7')} />
        <CalcBtn label="8" onClick={() => digit('8')} />
        <CalcBtn label="9" onClick={() => digit('9')} />
        <CalcBtn label="×" cls={`op ${op === '×' ? 'active' : ''}`}
                 onClick={() => chooseOp('×')} />
        <CalcBtn label="4" onClick={() => digit('4')} />
        <CalcBtn label="5" onClick={() => digit('5')} />
        <CalcBtn label="6" onClick={() => digit('6')} />
        <CalcBtn label="−" cls={`op ${op === '−' ? 'active' : ''}`}
                 onClick={() => chooseOp('−')} />
        <CalcBtn label="1" onClick={() => digit('1')} />
        <CalcBtn label="2" onClick={() => digit('2')} />
        <CalcBtn label="3" onClick={() => digit('3')} />
        <CalcBtn label="+" cls={`op ${op === '+' ? 'active' : ''}`}
                 onClick={() => chooseOp('+')} />
        <CalcBtn label="±" cls="fn" onClick={toggleSign} />
        <CalcBtn label="0" onClick={() => digit('0')} />
        <CalcBtn label="." onClick={dot} />
        <CalcBtn label="=" cls="eq" onClick={equals} />
      </div>
    </div>
  );
}

function ConverterCard() {
  const t = useT();
  const { data, loading, error, reload } = useApi(() => ExchangeRateApi.get(), []);
  const [usdAmount, setUsdAmount] = useState('');
  const [uzsAmount, setUzsAmount] = useState('');

  const rate = data && data.available ? Number(data.rate) : null;

  const onUsd = (value) => {
    setUsdAmount(value);
    if (rate && value !== '' && !Number.isNaN(Number(value))) {
      setUzsAmount(String(Math.round(Number(value) * rate)));
    } else {
      setUzsAmount('');
    }
  };

  const onUzs = (value) => {
    setUzsAmount(value);
    if (rate && value !== '' && !Number.isNaN(Number(value))) {
      setUsdAmount((Number(value) / rate).toFixed(2));
    } else {
      setUsdAmount('');
    }
  };

  return (
    <div className="card">
      <div className="card-head"><h2>{t('Valyuta konvertori')}</h2></div>
      <div className="card-pad">
        <Loader loading={loading} error={error} onRetry={reload}>
          {data && (
            <>
              <div
                className="card card-pad"
                style={{ borderLeft: '4px solid var(--blue)', marginBottom: 18 }}
              >
                {data.available ? (
                  <span>
                    <b style={{ fontSize: 16 }}>
                      1 USD = {money(Math.round(rate))} {t("so'm")}
                    </b>
                    <span className="faint">
                      {' '}&middot; {t('Markaziy bank')} &middot; {formatDate(data.date)}
                    </span>
                  </span>
                ) : (
                  <span className="faint">
                    {t("Internetga ulanib bo'lmadi — kursni keyinroq ko'ring")}
                  </span>
                )}
              </div>

              <div className="field">
                <label>{t('AQSh dollari (USD)')}</label>
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  value={usdAmount}
                  onChange={(e) => onUsd(e.target.value)}
                  placeholder="0"
                  disabled={!rate}
                  style={{ fontSize: 17, fontWeight: 700 }}
                />
              </div>
              <div style={{ textAlign: 'center', color: 'var(--text-faint)', margin: '2px 0' }}>
                ⇅
              </div>
              <div className="field">
                <label>{t("So'm (UZS)")}</label>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  value={uzsAmount}
                  onChange={(e) => onUzs(e.target.value)}
                  placeholder="0"
                  disabled={!rate}
                  style={{ fontSize: 17, fontWeight: 700 }}
                />
              </div>
              <div className="field-hint">
                {t("Telefon narxlari dollarda — mijozga so'mdagi summasini tez ayting.")}
              </div>
            </>
          )}
        </Loader>
      </div>
    </div>
  );
}
