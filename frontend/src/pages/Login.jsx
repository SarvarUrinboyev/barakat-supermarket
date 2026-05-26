import { useState } from 'react';
import { useAuth } from '../context/Auth.jsx';
import { useT } from '../context/Settings.jsx';

/**
 * Centered login form rendered when no session token is present.
 * Posts to {@code /api/auth/login}; on success the AuthProvider stores
 * the JWT and re-renders the app shell.
 *
 * Server URL is baked in (licenseClient.js DEFAULT_URL → nip.io VPS).
 * The "Server sozlamalari" toggle is intentionally removed so ordinary
 * users never see — or accidentally break — the server address.
 */
export function Login() {
  const { login } = useAuth();
  const t = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [twofaRequired, setTwofaRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!username.trim() || !password) {
      setError(t('Login va parolni kiriting'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password, twofaRequired ? totpCode.trim() : undefined);
    } catch (err) {
      const msg = err.message || t('Login muvaffaqiyatsiz');
      // If the server signals 2FA is required, show the TOTP field.
      if (/totp|2fa|ikki|kod/i.test(msg)) {
        setTwofaRequired(true);
      }
      setError(msg);
    } finally {
      // Always release the spinner so the button is never stuck.
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <defs>
              <linearGradient id="loginBrand" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            {/* Rounded-square frame. */}
            <rect width="40" height="40" rx="9" fill="url(#loginBrand)" />
            {/* Three bars — shortest to tallest, last one is the brand-green accent. */}
            <rect x="9" y="23.5" width="6.25" height="8.3" rx="1.7"
                  fill="#ffffff" opacity="0.42" />
            <rect x="16.9" y="19" width="6.25" height="12.65" rx="1.7"
                  fill="#ffffff" opacity="0.62" />
            <rect x="24.7" y="13.6" width="6.25" height="18.1" rx="1.7" fill="#22c55e" />
            {/* Trend line + arrow head, sitting on top of the bars. */}
            <path d="M12.2 20.5 L20 15.8 L28.1 10.9" fill="none"
                  stroke="#ffffff" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24.7 10.9 L28.1 10.9 L28.1 14.4" fill="none"
                  stroke="#ffffff" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
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

        {twofaRequired && (
          <div className="field">
            <label>{t('2FA kodi (6 raqam)')}</label>
            <input
              className="input"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
            />
          </div>
        )}

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
      </form>
    </div>
  );
}
