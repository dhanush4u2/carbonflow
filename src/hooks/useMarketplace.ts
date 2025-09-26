import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';

// Derive the TradeListing type directly from your database schema.
export type TradeListing = Tables<'open_trades'>;

// This is the unified state for the user's profile, wallet, and credits.
export interface UserMarketplaceProfile {
  industry_name: string | null;
  wallet_balance: number;
  available_credits: number;
}

/**
 * A single, robust hook to manage all marketplace data and actions.
 */
export const useMarketplace = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState<TradeListing[]>([]);
  const [userProfile, setUserProfile] = useState<UserMarketplaceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const APP_FEE_PERCENTAGE = 0.05;

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const [listingsResult, profileResult, metricsResult] = await Promise.all([
        supabase.from('open_trades').select('*').neq('seller_id', user.id),
        supabase.from('profiles').select('industry_name, wallet_balance').eq('id', user.id).single(),
        supabase.from('dashboard_metrics').select('available_credits').eq('id', user.id).maybeSingle(),
      ]);

      if (listingsResult.error) throw listingsResult.error;
      if (profileResult.error) throw profileResult.error;
      if (metricsResult.error) throw metricsResult.error;

      let metrics = metricsResult.data;
      if (!metrics) {
        const { data: newMetrics, error: insertError } = await supabase
          .from('dashboard_metrics')
          .insert({ id: user.id, available_credits: 0 })
          .select('available_credits')
          .single();
        if (insertError) throw insertError;
        metrics = newMetrics;
      }

      setUserProfile({
        industry_name: profileResult.data.industry_name,
        wallet_balance: profileResult.data.wallet_balance ?? 0,
        available_credits: metrics?.available_credits ?? 0,
      });
      setListings(listingsResult.data || []);
    } catch (err: any) {
      console.error("Error fetching marketplace data:", err);
      setError("Could not load marketplace data. Please ensure your profile is complete and check RLS policies.");
      setUserProfile({ industry_name: 'Error', wallet_balance: 0, available_credits: 0 });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sellCredits = async (quantity: number) => {
    if (!user || !userProfile || !userProfile.industry_name) {
      alert("Your profile is incomplete. Please set an industry name.");
      return;
    }
    if (quantity <= 0 || quantity > userProfile.available_credits) {
      alert("Invalid quantity or insufficient credits.");
      return;
    }

    setLoading(true);
    const originalBalance = userProfile.available_credits;
    const newBalance = originalBalance - quantity;

    try {
      await supabase.from('dashboard_metrics').update({ available_credits: newBalance }).eq('id', user.id).throwOnError();
      
      const marketPrice = 2340;
      const totalAmount = quantity * marketPrice;
      await supabase.from('open_trades').insert({
        industry_name: userProfile.industry_name,
        seller_id: user.id,
        no_of_credits: quantity,
        current_market_price: marketPrice,
        total_amount: totalAmount,
      }).throwOnError();
      
      await fetchData();
      alert("Your sell listing has been successfully created!");
    } catch (err: any) {
      console.error("Error selling credits:", err);
      alert("Failed to create sell listing. Reverting changes.");
      await supabase.from('dashboard_metrics').update({ available_credits: originalBalance }).eq('id', user.id);
    } finally {
      setLoading(false);
    }
  };

  const buyCredits = async (listing: TradeListing) => {
    if (!user || !userProfile || !userProfile.industry_name) {
        alert("Your profile is incomplete.");
        return;
    }
    const cost = listing.total_amount;
    if (userProfile.wallet_balance < cost) {
        alert("Insufficient wallet balance to complete this purchase.");
        return;
    }

    setLoading(true);
    const originalBuyerCredits = userProfile.available_credits;
    const originalBuyerWallet = userProfile.wallet_balance;

    try {
      const newBuyerCredits = originalBuyerCredits + listing.no_of_credits;
      const newBuyerWallet = originalBuyerWallet - cost;
      const sellerGets = cost * (1 - APP_FEE_PERCENTAGE);

      // 1. Update buyer's balances
      await supabase.from('dashboard_metrics').update({ available_credits: newBuyerCredits }).eq('id', user.id).throwOnError();
      await supabase.from('profiles').update({ wallet_balance: newBuyerWallet }).eq('id', user.id).throwOnError();
      
      // 2. Update seller's wallet balance
      const { data: sellerProfile, error: sellerError } = await supabase.from('profiles').select('wallet_balance').eq('id', listing.seller_id).single();
      if (sellerError || !sellerProfile) throw new Error("Could not find seller profile.");
      const newSellerWallet = (sellerProfile.wallet_balance ?? 0) + sellerGets;
      await supabase.from('profiles').update({ wallet_balance: newSellerWallet }).eq('id', listing.seller_id).throwOnError();

      // 3. Record transaction
      await supabase.from('transactions').insert({
        seller_industry_name: listing.industry_name,
        buyer_industry_name: userProfile.industry_name,
        amount: cost,
        credits: listing.no_of_credits,
        seller_id: listing.seller_id,
        buyer_id: user.id,
      }).throwOnError();

      // 4. Delete listing
      await supabase.from('open_trades').delete().eq('id', listing.id).throwOnError();
        
      await fetchData();
      alert(`Successfully purchased ${listing.no_of_credits} credits!`);
    } catch (err: any) {
      console.error("Error buying credits:", err);
      alert("Failed to complete purchase. Reverting changes.");
      // Rollback buyer's balances
      await supabase.from('dashboard_metrics').update({ available_credits: originalBuyerCredits }).eq('id', user.id);
      await supabase.from('profiles').update({ wallet_balance: originalBuyerWallet }).eq('id', user.id);
    } finally {
      setLoading(false);
    }
  };

  return { listings, userProfile, loading, error, sellCredits, buyCredits };
};