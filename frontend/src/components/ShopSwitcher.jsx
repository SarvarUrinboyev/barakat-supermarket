import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/Auth.jsx';
import { useShop, ALL_SHOPS } from '../context/Shop.jsx';
import { useT } from '../context/Settings.jsx';

/**
 * Topbar dropdown that shows the currently active shop and lets the
 * user switch to any other shop in their account. Hidden when the
 * account has just one shop (no point picking).
 */
export function ShopSwitcher() {
  const t = useT();
  const { user } = useAuth();
  const { shops, activeShop, isConsolidated, setActiveShopId } = useShop();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const canConsolidate = shops.length > 1
    && (user?.role === 'ACCOUNT_OWNER' || user?.role === 'SUPER_ADMIN');

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!shops || shops.length === 0) return null;
  // Show the switcher even with one shop — owner needs an entry point
  // to manage shops. We just collapse the dropdown to a non-interactive
  // pill when there's only one.
  const single = shops.length === 1;

  const pick = (id) => {
    setActiveShopId(id);
    setOpen(false);
    // Force every page to re-fetch with the new active shop. Simplest
    // way for Phase 1C-1 is a full reload; in 1C-2 we'll wire a smarter
    // invalidation through React Query / SWR.
    window.location.reload();
  };

  return (
    <div className={`shop-switcher ${open ? 'open' : ''} ${isConsolidated ? 'consolidated' : ''}`} ref={ref}>
      <button
        type="button"
        className="shop-switcher-button"
        onClick={() => !single && setOpen(!open)}
        title={t("Faol do'kon")}
      >
        <span className="ss-ico">{isConsolidated ? '🌐' : '🏪'}</span>
        <span className="ss-name">
          {isConsolidated
            ? t("Hamma do'konlar")
            : (activeShop ? activeShop.name : t("Do'kon tanlanmagan"))}
        </span>
        {isConsolidated && (
          <span className="ss-main-tag" style={{
            color: '#22d3ee',
            background: 'rgba(34, 211, 238, .12)',
            borderColor: 'rgba(34, 211, 238, .35)',
          }}>{shops.length}</span>
        )}
        {!isConsolidated && activeShop?.main && (
          <span className="ss-main-tag">{t('ASOSIY')}</span>
        )}
        {!single && <span className="ss-chev">▾</span>}
      </button>
      {open && !single && (
        <div className="shop-switcher-menu">
          <div className="ss-menu-head">{t("Do'konni tanlang")}</div>
          {canConsolidate && (
            <button
              type="button"
              className={`ss-menu-item ss-menu-all ${isConsolidated ? 'active' : ''}`}
              onClick={() => pick(ALL_SHOPS)}
            >
              <span className="ss-menu-ico">🌐</span>
              <span className="ss-menu-name">
                <b>{t("Hamma do'konlar")}</b>
                <span className="ss-menu-hint">
                  {t('Jami balans va sotuvlarni jamlaydi')}
                </span>
              </span>
              {isConsolidated && <span className="ss-check">✓</span>}
            </button>
          )}
          {shops.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`ss-menu-item ${s.id === activeShop?.id ? 'active' : ''}`}
              onClick={() => pick(s.id)}
            >
              <span className="ss-menu-ico">🏪</span>
              <span className="ss-menu-name">{s.name}</span>
              {s.main && <span className="ss-main-tag">{t('ASOSIY')}</span>}
              {s.id === activeShop?.id && <span className="ss-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
