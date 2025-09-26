import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';

// Derive the Transaction type directly from your database schema.
export type Transaction = Tables<'transactions'>;

/**
 * A dedicated hook to fetch the 3 most recent transactions for the current user.
 */
export const useTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // Fetch the 3 most recent transactions where the user is either the buyer or the seller.
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*') // We can use '*' because the type is now correctly derived.
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(3); // Fetches only the 3 most recent transactions

      if (fetchError) throw fetchError;

      setTransactions(data || []);
    } catch (err: any) {
      console.error("Error fetching transactions:", err);
      setError("Could not load transaction history.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, loading, error };
};

