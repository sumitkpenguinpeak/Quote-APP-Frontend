import { useCallback, useEffect, useState } from 'react';
import api, { getShopFromUrl } from '../services/api';

/**
 * useShop
 *
 * Reusable data-fetching hook that calls a given API endpoint (scoped to
 * the current shop) and exposes { data, loading, error, refetch }. Used by
 * the Dashboard and Billing pages to avoid duplicating fetch boilerplate.
 */
export default function useShop(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const shop = getShopFromUrl();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(endpoint);
      setData(response.data.data ?? response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (shop) {
      fetchData();
    } else {
      setLoading(false);
      setError('Missing shop parameter.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, shop]);

  return { data, loading, error, refetch: fetchData, shop };
}
