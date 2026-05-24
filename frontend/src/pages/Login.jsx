import { useState } from 'react';
import { getLicenseUrl, setLicenseUrl } from '../api/licenseClient.js';
import { useAuth } from '../context/Auth.jsx';
import { useT } from '../context/Settings.jsx';

/**
 * Centered login form rendered when no session token is present.
 * Posts to {@code /api/auth/login}; on success the AuthProvider stores
 * the JWT and re-renders the app shell.
 */
export function Login() {
  const { login } = useAuth();
  const t = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState(() => getLicenseUrl());
  const [showServerCfg, setShowServerCfg] = useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!username.trim() || !password) {
      setError(t('Login va parolni kiriting'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || t('Login muvaffaqiyatsiz'));
    } finally {
      // Always release the spinner — even on the rare success-without-
      // navigate path (e.g. login succeeds upstream but the subsequent
      // /me 401s before the App re-renders) we'd otherwise leave the
      // Kirish button stuck in the disabled "Tekshirilmoqda…" state.
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <defs>
              <linearGradient id="loginBrand" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="55%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="40" height="40" rx="11" fill="url(#loginBrand)" />
            <path d="M11 16 H29 L27.5 30.5 Q27 33.5 24 33.5 H16 Q13 33.5 12.5 30.5 Z"
                  fill="rgba(255,255,255,0.95)" />
            <path d="M15.5 16.5 V12.5 a4.5 4.5 0 0 1 9 0 V16.5"
                  fill="none" stroke="rgba(255,255,255,0.95)"
                  strokeWidth="2.4" strokeLinecap="round" />
            <path d="M17.5 26.5 L20 24 L22.5 26.5" fill="none"
                  stroke="#047857" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" />
            <line x1="20" y1="24" x2="20" y2="29.5" stroke="#047857"
                  strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <div>
            <h1>SavdoPRO <span className="brand-tag">POS</span></h1>
            <p>{t('Avtomatlashtirilgan boshqaruv tizimi')}</p>
          </div>
        </div>

        <h2 className="login-title">{t('Tizimga kirish')}</h2>
        <p className="login-sub">
          {t('Akkauntingiz uchun login va parolni kiriting')}
        </p>

        <div className="field">
          <label>{t('Login')}</label>
          <input
            className="input"
            autoFocus
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
          />
        </div>

        <div className="field">
          <label>{t('Parol')}</label>
          <div className="password-input">
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? t("Yashirish") : t("Ko'rsatish")}
              aria-label={showPassword ? t("Yashirish") : t("Ko'rsatish")}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {error && (
          <div className="login-error">⚠️ {error}</div>
        )}

        <button
          type="submit"
          className="btn btn-primary login-submit"
          disabled={busy}
        >
          {busy ? t('Tekshirilmoqda...') : t('Kirish')}
        </button>

        <p className="login-foot muted">
          {t('Parol unutilgan bo\'lsa super-admin bilan bog\'laning')}
        </p>

        <button
          type="button"
          className="login-server-toggle"
          onClick={() => setShowServerCfg(!showServerCfg)}
        >
          ⚙️ {t('Server sozlamalari')}
        </button>
        {showServerCfg && (
          <div className="login-server-cfg">
            <label>{t('License Server URL')}</label>
            <input
              className="input"
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:9090"
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                let url = serverUrl.trim();
                // Saving "localhost:9090" without a scheme produces a
                // relative-path fetch ("/localhost:9090/api/...") that
                // silently 404s — coerce to a real URL up front.
                if (url && !/^https?:\/\//i.test(url)) {
                  url = 'http://' + url;
                }
                setLicenseUrl(url || null);
                setServerUrl(url);
                setError('');
                setShowServerCfg(false);
              }}
            >
              {t('Saqlash')}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
