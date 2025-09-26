// Path: src/hooks/useDashboardData.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext' // Import useAuth to get the user

export interface DashboardMetrics {
  total_ghg_emissions: number
  last_month_ghg_emissions: number
  available_credits: number
}

export interface MarketData {
  market_price_inr: number
  credit_name: string
}

export function useDashboardData() {
  const { user } = useAuth(); // Get the currently authenticated user
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      // Don't proceed if the user is not available yet
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true)
        setError(null)

        // **THE FIX:** Make this hook robust, just like your other hooks.
        // First, try to fetch the user's existing metrics record.
        let { data: metricsData, error: metricsError } = await supabase
          .from('dashboard_metrics')
          .select('total_ghg_emissions, last_month_ghg_emissions, available_credits')
          .eq('id', user.id)
          .maybeSingle()

        if (metricsError) throw metricsError;

        // If no record exists (which can happen for a brand new user),
        // create a default one to prevent the UI from showing null/0 incorrectly.
        if (!metricsData) {
          const { data: newData, error: insertError } = await supabase
            .from('dashboard_metrics')
            .insert({ 
              id: user.id, 
              available_credits: 0, 
              total_ghg_emissions: 0, 
              last_month_ghg_emissions: 0 
            })
            .select('total_ghg_emissions, last_month_ghg_emissions, available_credits')
            .single();
          if (insertError) throw insertError;
          metricsData = newData;
        }
        
        setMetrics(metricsData);

        // Fetch market data (this part remains the same)
        const { data: marketDataRes, error: marketError } = await supabase
          .from('market_data')
          .select('market_price_inr, credit_name')
          .limit(1)
          .single()

        if (marketError) {
          console.warn('Could not fetch market data:', marketError.message)
        } else {
          setMarketData(marketDataRes)
        }

      } catch (err: any) {
        console.error('Error fetching dashboard data:', err)
        setError('Failed to fetch dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user]) // Re-run the fetch when the user object becomes available

  return { metrics, marketData, loading, error }
}