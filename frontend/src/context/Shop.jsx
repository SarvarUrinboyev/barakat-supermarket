import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ShopApi } from '../api/endpoints.js';
import { useAuth } from './Auth.jsx';

const ShopCtx = createContext(null);
const ACTIVE_SHOP_KEY = 'savdopro.activeShopId';

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
    return stored ? Number(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const setActiveShopId = useCallback((id) => {
    setActiveShopIdState(id);
    if (id) localStorage.setItem(ACTIVE_SHOP_KEY, String(id));
    else localStorage.removeItem(ACTIVE_SHOP_KEY);
  }, []);

  const reload = useCallback(async () => {
    if (!user) {
      setShops([]);
      return;
    }
    setLoading(true);
    try {
      const list = await ShopApi.list();
      setShops(list);
      // Pick a sensible default if the stored shop is gone or unset.
      const stored = Number(localStorage.getItem(ACTIVE_SHOP_KEY));
      const stillExists = list.some((s) => s.id === stored);
      if (!stillExists) {
        const main = list.find((s) => s.main) || list[0];
        setActiveShopId(main ? main.id : null);
      }
    } catch (_err) {
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, [user, setActiveShopId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const activeShop = useMemo(
    () => shops.find((s) => s.id === activeShopId) || null,
    [shops, activeShopId],
  );

  const value = {
    shops,
    activeShop,
    activeShopId,
    setActiveShopId,
    loading,
    reload,
  };
  return <ShopCtx.Provider value={value}>{children}</ShopCtx.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopCtx);
  if (!ctx) throw new Error('useShop() outside <ShopProvider>');
  return ctx;
}
