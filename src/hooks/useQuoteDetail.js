import {useCallback,useEffect,useState,} from 'react';
import { getQuoteById } from '../services/api';

export default function useQuoteDetail(Id) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQuote = useCallback(async () => {
    if (!Id) {
      setLoading(false);
      setError(new Error('Quote ID is missing'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await getQuoteById(Id);
      const quoteData = response?.data?.data ||response?.data || null;
      setQuote(quoteData);
    } catch (err) {
      setError(err);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [Id]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  return { quote, loading, error, fetchQuote,};
}