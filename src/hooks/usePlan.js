import { useCallback, useEffect, useState } from 'react';
import api, { getShopFromUrl } from '../services/api';

/**
 * usePlan
 *
 * Loads the shop's current plan from /billing/status and tells the UI which
 * features are unlocked, so locked buttons/settings can be disabled.
 * (The backend enforces the same rules - this is only for the UI.)
 *
 * Features: draft_order | sync | pricing_settings | templates
 * While loading, `can()` returns false so locked controls never flash as enabled.
 */
export default function usePlan() {
  const [plan, setPlan] = useState({ loading: true, key: 'free', name: 'Free', features: [] });
  const shop = getShopFromUrl();

  const load = useCallback(async () => {
    try {
      const response = await api.get('/billing/status');
      const data = response.data?.data ?? response.data ?? {};
      setPlan({
        loading: false,
        key: data.plan_key || 'free',
        name: data.plan_name || 'Free',
        features: Array.isArray(data.features) ? data.features : [],
      });
    } catch {
      setPlan((p) => ({ ...p, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (shop) load();
    else setPlan((p) => ({ ...p, loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  const can = (feature) => !plan.loading && plan.features.includes(feature);

  return { ...plan, can, refetch: load };
}
