import { useCallback, useEffect, useState } from 'react';
import { getQuotes } from '../services/api';

export default function useQuote() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getQuotes();
      const quotes = response?.data?.data || response?.data || [];
      setData(Array.isArray(quotes) ? quotes: [] );
    } catch (err) {
      setError(err);
      setData([]);
    } finally { setLoading(false);}
  }, []);

  useEffect(() => { fetchData();}, [fetchData]);

  return {data, loading, error, fetchData,};
}