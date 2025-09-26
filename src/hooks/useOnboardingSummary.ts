// Path: src/hooks/useOnboardingSummary.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';

// Define a specific type for the data this hook will return
export type OnboardingSummary = Tables<'onboarding_submissions'>;

/**
 * A dedicated hook to fetch the user's initial onboarding submission and AI analysis.
 */
export const useOnboardingSummary = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<OnboardingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOnboardingSummary = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // Fetch the most recent onboarding submission for the current user
      const { data, error: fetchError } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(); // We only expect one result

      if (fetchError && fetchError.code !== 'PGRST116') { // Ignore error for no rows found
        throw fetchError;
      }
      
      setSummary(data);

    } catch (err: any) {
      console.error("Error fetching onboarding summary:", err);
      setError("Could not load onboarding assessment data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOnboardingSummary();
  }, [fetchOnboardingSummary]);

  return { summary, loading, error };
};