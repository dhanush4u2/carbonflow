import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';

export type UserMetrics = Tables<'dashboard_metrics'>;

/**
 * A dedicated hook to fetch the current user's metrics,
 * specifically their available_credits from the dashboard_metrics table.
 */
export const useUserMetrics = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // Attempt to fetch the user's metrics row.
      let { data, error: fetchError } = await supabase
        .from('dashboard_metrics')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If no row exists, create one with default values to ensure stability.
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('dashboard_metrics')
          .insert({ 
            id: user.id, 
            available_credits: 0, 
            total_ghg_emissions: 0, 
            last_month_ghg_emissions: 0 
          })
          .select('*')
          .single();
        if (insertError) throw insertError;
        data = newData;
      }
      setMetrics(data);
    } catch (err: any) {
      console.error("Error fetching user metrics:", err);
      setError("Could not load user metrics.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Return a 'refetch' function so other components can trigger a data refresh after a trade.
  return { metrics, loading, error, refetch: fetchMetrics };
};
