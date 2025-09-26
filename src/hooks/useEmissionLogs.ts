import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';

export type EmissionLog = Tables<'emission_monitoring_logs'>;

const IOT_DEVICE_USER_ID = 'b1671c5b-7463-4b07-9479-9d4163df1cb5';

/**
 * A robust hook to fetch logs and update credits in real-time.
 */
export const useEmissionLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<EmissionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('emission_monitoring_logs')
          .select('*')
          .eq('user_id', IOT_DEVICE_USER_ID)
          .order('created_at', { ascending: true })
          .limit(100);

        if (fetchError) throw fetchError;
        setLogs(data || []);
      } catch (err: any) {
        setError("Could not load initial emission data.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    const channel = supabase
      .channel(`realtime-emissions-chart`)
      .on<EmissionLog>(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'emission_monitoring_logs', 
          filter: `user_id=eq.${IOT_DEVICE_USER_ID}`
        },
        async (payload) => {
          // Append the new log to the chart data
          setLogs((currentLogs) => [...currentLogs, payload.new]);

          // **THE FIX - PART 1: Calculate new credits with the slower rate**
          // We divide by 10,000 instead of 1,000 to "add another zero"
          const newCredits = (payload.new.emission_value_tco2e * 1000) / 10000;

          if (newCredits > 0) {
            // **THE FIX - PART 2: Call the database function to update the main balance**
            const { error: rpcError } = await supabase.rpc('increment_credits', {
              user_uuid: IOT_DEVICE_USER_ID,
              new_credits: newCredits,
            });

            if (rpcError) {
              console.error("Error updating credits:", rpcError);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [user]);

  return { logs, loading, error };
};

