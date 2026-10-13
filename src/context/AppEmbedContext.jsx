import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api, { getShopFromUrl } from '../services/api';

/**
 * App embed ON/OFF status ek j jagyae thi (nav menu, route guard ane Dashboard badhu same value vaape).
 *
 * status:
 *   'idle' | 'loading'  - haju check thatu chhe
 *   'on'                - theme ma app embed on chhe
 *   'off'               - theme ma app embed on nathi  -> baki app LOCK
 *   'unknown'           - status jani shakyo nahi (scope nathi, billing pending, network error...)
 *                         -> LOCK NAHI (nahi to merchant potani jate bahar nikli na shake)
 */
const AppEmbedContext = createContext({
  status: 'idle',
  locked: false,
  checking: false,
  refresh: async () => {},
});

export const useAppEmbed = () => useContext(AppEmbedContext);

// Je pages par status check karvo j nathi
const SKIP_PATHS = ['/login'];
// Focus / tab-switch par vadhu var check na thay te mate (ms). Button thi "check again" hamesha force thay chhe.
const THROTTLE_MS = 10000;

export function AppEmbedProvider({ children }) {
  const { pathname } = useLocation();
  const shop = getShopFromUrl();
  const cacheKey = `quoteapp:embed:${shop}`;

  // Pehla "on" thayelo hoy to session ma yaad rakhiye, jethi page par spinner/flash na aave
  const [status, setStatus] = useState(() => {
    try {
      return sessionStorage.getItem(cacheKey) === 'on' ? 'on' : 'idle';
    } catch {
      return 'idle';
    }
  });
  const inFlight = useRef(false);
  const lastCheck = useRef(0);
  const skip = !shop || SKIP_PATHS.includes(pathname);

  const refresh = useCallback(
    async (force = true) => {
      if (!shop || inFlight.current) return;
      if (!force && Date.now() - lastCheck.current < THROTTLE_MS) return;

      inFlight.current = true;
      lastCheck.current = Date.now();
      setStatus((s) => (s === 'idle' ? 'loading' : s));

      try {
        // validateStatus: 402/401 par axios interceptor redirect na kare (billing pending hoy to pan app kholay)
        const res = await api.get('/dashboard/app-embed', { validateStatus: () => true, timeout: 15000 });
        const value = res.status === 200 ? res.data?.data?.status : null;
        const next = value === 'on' || value === 'off' ? value : 'unknown';

        setStatus(next);
        try {
          if (next === 'on') sessionStorage.setItem(cacheKey, 'on');
          else sessionStorage.removeItem(cacheKey);
        } catch {
          /* storage block hoy to ignore */
        }
      } catch {
        setStatus('unknown');
      } finally {
        inFlight.current = false;
      }
    },
    [shop, cacheKey]
  );

  useEffect(() => {
    if (skip) return undefined;

    refresh(false);
    // Merchant theme editor ma toggle kari ne app par pacha aave tyare auto re-check
    const onFocus = () => refresh(false);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh(false);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [skip, refresh]);

  const value = useMemo(
    () => ({
      status,
      locked: status === 'off',
      checking: status === 'idle' || status === 'loading',
      refresh,
    }),
    [status, refresh]
  );

  return <AppEmbedContext.Provider value={value}>{children}</AppEmbedContext.Provider>;
}