import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Define a type for the data we expect to fetch.
interface MonthlyEmissions {
  current_year_emissions: number;
  target_emissions: number;
}

/**
 * A custom hook to fetch the most recent monthly emissions data
 * for the currently authenticated user.
 */
export const useMonthlyEmissions = () => {
  const { user } = useAuth(); // Get the current user from your auth context.
  
  const [emissionsData, setEmissionsData] = useState<MonthlyEmissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmissions = async () => {
      // Don't run the query if there's no user.
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('monthly_emissions_history') // 1. Specify the table name.
          .select('current_year_emissions, target_emissions') // 2. Select the desired columns.
          .eq('user_id', user.id) // 3. Filter to match the current user's ID.
          .order('month', { ascending: false }) // 4. Order by month to get the latest first.
          .limit(1) // 5. Limit to only one record (the most recent).
          .single(); // 6. Expect a single object, not an array.

        if (error) {
          throw error;
        }

        if (data) {
          setEmissionsData(data);
        }
      } catch (err: any) {
        console.error("Error fetching monthly emissions:", err);
        setError("Could not fetch emissions data.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmissions();
  }, [user]); // Rerun the effect if the user object changes (e.g., on login/logout).

  return { emissionsData, loading, error };
};
