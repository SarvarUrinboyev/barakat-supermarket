import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { ShopSwitcher } from './ShopSwitcher.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { useAuth } from '../context/Auth.jsx';
import { useSettings } from '../context/Settings.jsx';
import { LANGUAGES } from '../i18n/i18n.js';
import { formatDate, formatTime, todayIso } from '../lib/format.js';

/** Warn 4 days before the subscription cuts off. */
const WARNING_DAYS = 4;

const PAGE_TITLES = {
  '/dashboard': 'Boshqaruv',
  '/management': 'Menejment',
  '/home-expenses': "Do'kon xarajatlari",
  '/payments': "To'lov",
  '/orders': 'Buyurtmalar',
  '/warehouse': 'Ombor',
  '/customers': 'Mijozlar',
  '/suppliers': 'Yetkazib beruvchilar',
  '/debt': 'Qarz',
  '/calculator': 'Kalkulyator',
  '/shift-history': 'Smena tarixi',
  '/shift-close': 'Smena yopish',
  '/admin': 'Super-admin',
  '/shops': "Do'konlar",
};

/** Resolves the topbar title, treating nested routes by their prefix. */
function resolveTitle(pathname) {
  if (pathname.startsWith('/warehouse')) {
    return 'Ombor';
  }
  if (pathname.startsWith('/customers')) {
    return 'Mijozlar';
  }
  if (pathname.startsWith('/suppliers')) {
    return 'Yetkazib beruvchilar';
  }
  return PAGE_TITLES[pathname] || 'Boshqaruv';
}

/** App shell: fixed sidebar, sticky topbar and the routed page. */
export function Layout({ shift }) {
  const { pathname } = useLocation();
  const { theme, toggleTheme, lang, setLang, t } = useSettings();
  const { user } = useAuth();
  const title = resolveTitle(pathname);
  const showSubWarning = user
    && user.subscriptionExpires
    && user.daysUntilBlock <= WARNING_DAYS
    && user.daysUntilBlock >= 0;

  return (
    <div className="app-shell">
      <Sidebar shift={shift} />
      <div className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="bc-base">{t('Platforma')}</span>
            <span className="bc-sep">/</span>
            <span className="bc-page">
              <span className="bc-dot" />
              {t(title)}
            </span>
          </div>
          <ShopSwitcher />
          <div className="right">
            <select
              className="lang-select"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              title={t('Til')}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <button
              className="icon-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? t("Yorug' mavzu") : t("Qorong'i mavzu")}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <span className="date">📅 {formatDate(todayIso())}</span>
            {shift ? (
              <span className="shift-pill open">
                <span className="dot" />
                {t('Smena ochiq')} &middot; {formatTime(shift.openedAt)}
              </span>
            ) : (
              <span className="shift-pill closed">
                <span className="dot" />
                {t('Smena yopiq')}
              </span>
            )}
          </div>
        </header>
        {showSubWarning && (
          <div className="sub-warning">
            <span className="sub-warning-ico">⏰</span>
            <span>
              <b>{t('Obuna muddati tugashiga')} {user.daysUntilBlock}{' '}
                {t('kun qoldi')}.</b>{' '}
              {t('To\'lov muddati')}: {user.subscriptionExpires}.{' '}
              {t('To\'lamasangiz akkaunt avtomatik bloklanadi.')}
            </span>
          </div>
        )}
        <main className="content">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
