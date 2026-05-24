import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ShopApi } from '../api/endpoints.js';
import { useAuth } from './Auth.jsx';

const ShopCtx = createContext(null);
const ACTIVE_SHOP_KEY = 'savdopro.activeShopId';
/** Sentinel that activates the consolidated "Hamma do'konlar" view. */
export const ALL_SHOPS = 'ALL';

/**
 * Tracks the list of shops in the current account and which one is
 * selected ("active") in the topbar switcher. The active shop is
 * persisted in localStorage so the desktop opens on the same shop
 * the user worked on last.
 *
 * Data isolation by shop_id is Phase 1C-2 — for now the switcher is
 * visible but every screen still shows account-wide data. The chosen
 * shop id is already sent to the backend as the X-Shop-Id header so
 * the server can start filtering when the migration is in place.
 */
export function ShopProvider({ children }) {
  const { user } = useAuth();
  const [shops, setShops] = useState([]);
  const [activeShopId, setActiveShopIdState] = useState(() => {
    const stored = localStorage.getItem(ACTIVE_SHOP_KEY);
    if (!stored) return null;
    if (stored === ALL_SHOPS) return ALL_SHOPS;
    const n = Number(stored);
    return Number.isFinite(n) ? n : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setActiveShopId = useCallback((id) => {
    setActiveShopIdState(id);
    if (id === ALL_SHOPS) {
      localStorage.setItem(ACTIVE_SHOP_KEY, ALL_SHOPS);
    } else if (id) {
      localStorage.setItem(ACTIVE_SHOP_KEY, String(id));
    } else {
      localStorage.removeItem(ACTIVE_SHOP_KEY);
    }
  }, []);

  const reload = useCallback(async () => {
    if (!user) {
      setShops([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await ShopApi.list();
      setShops(list);
      // Keep "ALL" if user previously chose the consolidated view AND
      // they still own multiple shops; otherwise fall back to the main shop.
      const stored = localStorage.getItem(ACTIVE_SHOP_KEY);
      if (stored === ALL_SHOPS && list.length > 1) {
        setActiveShopId(ALL_SHOPS);
      } else {
        const num = Number(stored);
        const stillExists = list.some((s) => s.id === num);
        if (!stillExists) {
          const main = list.find((s) => s.main) || list[0];
          setActiveShopId(main ? main.id : null);
        }
      }
    } catch (err) {
      // Surface the error so ShopSwitcher / banners can show why the list
      // is empty. Don't blank the shops list — keep the last good list so
      // a transient blip doesn't yank the active shop out from under the
      // user mid-session.
      setError(err?.message || 'Do\'konlar ro\'yxatini yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  }, [user, setActiveShopId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const activeShop = useMemo(
    () => (activeShopId === ALL_SHOPS
      ? null
      : (shops.find((s) => s.id === activeShopId) || null)),
    [shops, activeShopId],
  );
  const isConsolidated = activeShopId === ALL_SHOPS;

  const value = {
    shops,
    activeShop,
    activeShopId,
    isConsolidated,
    setActiveShopId,
    loading,
    error,
    reload,
  };
  return <ShopCtx.Provider value={value}>{children}</ShopCtx.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopCtx);
  if (!ctx) throw new Error('useShop() outside <ShopProvider>');
  return ctx;
}
