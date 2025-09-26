import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * A dedicated hook to manage fetching and updating user profile settings.
 */
export const useSettings = (initialIndustryName: string | null | undefined) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [industryName, setIndustryName] = useState(initialIndustryName || '');
  const [loading, setLoading] = useState(false);

  const updateProfile = useCallback(async () => {
    if (!user || !industryName) {
      toast({
        title: "Error",
        description: "Industry name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update({ industry_name: industryName })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your industry profile has been updated.",
      });
    } catch (err: any) {
      console.error("Error updating profile:", err);
      toast({
        title: "Update Failed",
        description: "Could not update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, industryName, toast]);

  return { industryName, setIndustryName, updateProfile, loading };
};
