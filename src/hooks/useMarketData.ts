import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type MarketData = Tables<'market_data'>;

/**
 * A dedicated hook to fetch the latest market data, such as credit price.
 */
export const useMarketData = () => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the most recent market data entry. We assume there's only one, or we take the first.
      const { data, error: fetchError } = await supabase
        .from('market_data')
        .select('*')
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      setMarketData(data);
    } catch (err: any) {
      console.error("Error fetching market data:", err);
      setError("Could not load market data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  return { marketData, loading, error, refetch: fetchMarketData };
};
