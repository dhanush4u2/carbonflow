import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MonthlyReductionData {
  percentageChange: number;
  status: 'increase' | 'decrease' | 'neutral';
}

/**
 * A custom hook to fetch the last two months of emissions data
 * and calculate the percentage reduction or increase.
 */
export const useMonthlyReduction = () => {
  const { user } = useAuth();
  const [reductionData, setReductionData] = useState<MonthlyReductionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReductionData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch the two most recent months' data for the current user
        const { data, error } = await supabase
          .from('monthly_emissions_history')
          .select('month, current_year_emissions')
          .eq('user_id', user.id)
          .order('month', { ascending: false })
          .limit(2);

        if (error) throw error;

        if (data && data.length === 2) {
          const latestMonth = data[0];
          const previousMonth = data[1];

          const currentEmissions = latestMonth.current_year_emissions || 0;
          const previousEmissions = previousMonth.current_year_emissions || 0;

          if (previousEmissions > 0) {
            const change = ((currentEmissions - previousEmissions) / previousEmissions) * 100;
            setReductionData({
              percentageChange: Math.abs(change),
              status: change < 0 ? 'decrease' : 'increase',
            });
          } else {
            // Cannot calculate percentage if previous month was zero
            setReductionData({ percentageChange: 0, status: 'neutral' });
          }
        } else {
          // Not enough data to compare
          setReductionData({ percentageChange: 0, status: 'neutral' });
        }
      } catch (err: any) {
        console.error("Error fetching monthly reduction data:", err);
        setError("Could not calculate monthly change.");
        setReductionData({ percentageChange: 0, status: 'neutral' });
      } finally {
        setLoading(false);
      }
    };

    fetchReductionData();
  }, [user]);

  return { reductionData, loading, error };
};
