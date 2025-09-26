import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';

export type UserProfile = Tables<'profiles'>;

/**
 * A dedicated hook to fetch the current user's complete profile data,
 * including industry_name and wallet_balance.
 * This hook is a robust replacement for useUserProfile.
 */
export const useUserWallet = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // Attempt to fetch the user's profile row.
      let { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If no profile exists for the user, create one to prevent errors.
      if (!data) {
        const initialIndustryName = user.user_metadata?.industry_name ?? 'New Industry';
        const { data: newData, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user.id, industry_name: initialIndustryName, wallet_balance: 0 })
          .select('*')
          .single();
        if (insertError) throw insertError;
        data = newData;
      }

      setProfile(data);
    } catch (err: any) {
      console.error("Error fetching user profile:", err);
      setError("Could not load user profile. Please check your RLS policies.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
};

