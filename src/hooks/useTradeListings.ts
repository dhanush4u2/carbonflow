import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from './useUserWallet';
import { UserMetrics } from './useUserMetrics';

export interface TradeListing {
  sell_id: string; 
  created_at: string;
  industry_name: string | null;
  no_of_credits: number;
  current_market_price: number;
  total_amount: number;
  user_id: string; 
}

export const useTradeListings = (refetchMetrics: () => void, refetchProfile: () => void) => {
    const { user } = useAuth();
    const [listings, setListings] = useState<TradeListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const APP_FEE_PERCENTAGE = 0.02;
    const GST_PERCENTAGE = 0.12;

    const fetchListings = useCallback(async () => {
        if (!user) { setLoading(false); return; }
        try {
            setLoading(true);
            setError(null);
            const { data, error: fetchError } = await supabase
                .from('open_trades')
                .select('sell_id, created_at, industry_name, no_of_credits, current_market_price, total_amount, user_id');
            if (fetchError) throw fetchError;
            const typedData = data as TradeListing[];
            setListings(typedData || []);
        } catch (err: any) {
            console.error("Error fetching listings:", err);
            setError("Could not load trade listings.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchListings(); }, [fetchListings]);

    // CRITICAL FIX: The function now accepts the live market price as an argument.
    const sellCredits = async (quantity: number, sellerProfile: UserProfile, sellerMetrics: UserMetrics, marketPrice: number) => {
        if (!user || !sellerProfile.industry_name) {
             alert("Your profile is incomplete."); return;
        }
        setLoading(true);
        const originalCredits = sellerMetrics.available_credits ?? 0;
        const newCredits = originalCredits - quantity;
        try {
            await supabase.from('dashboard_metrics').update({ available_credits: newCredits }).eq('id', user.id).throwOnError();
            
            // The totalAmount is now calculated with the live market price.
            const totalAmount = quantity * marketPrice;
            await supabase.from('open_trades').insert({
                industry_name: sellerProfile.industry_name, 
                user_id: user.id,
                no_of_credits: quantity, 
                current_market_price: marketPrice, 
                total_amount: totalAmount,
            }).throwOnError();
            refetchMetrics();
            fetchListings();
            alert("Sell listing created!");
        } catch (err: any) {
            console.error("Error selling credits:", err);
            alert("Failed to create sell listing. Reverting changes.");
            await supabase.from('dashboard_metrics').update({ available_credits: originalCredits }).eq('id', user.id);
        } finally {
            setLoading(false);
        }
    };

    const buyCredits = async (listing: TradeListing, buyerProfile: UserProfile, buyerMetrics: UserMetrics) => {
        // ... (buyCredits logic remains the same)
         if (!user) return;
        const subtotal = listing.total_amount;
        const commission = subtotal * APP_FEE_PERCENTAGE;
        const gst = (subtotal + commission) * GST_PERCENTAGE;
        const totalPayable = subtotal + commission + gst;

        if ((buyerProfile.wallet_balance ?? 0) < totalPayable) {
            alert("Insufficient wallet balance."); return;
        }
        setLoading(true);
        const originalBuyerCredits = buyerMetrics.available_credits ?? 0;
        const originalBuyerWallet = buyerProfile.wallet_balance ?? 0;
        try {
            const newBuyerCredits = originalBuyerCredits + listing.no_of_credits;
            const newBuyerWallet = originalBuyerWallet - totalPayable;
            const sellerGets = subtotal;

            const { data: sellerProfileData, error: sellerErr } = await supabase.from('profiles').select('wallet_balance').eq('id', listing.user_id).single();
            if(sellerErr || !sellerProfileData) throw new Error("Could not find seller profile to transfer funds.");
            const newSellerWallet = (sellerProfileData.wallet_balance ?? 0) + sellerGets;
            
            await supabase.from('dashboard_metrics').update({ available_credits: newBuyerCredits }).eq('id', user.id).throwOnError();
            await supabase.from('profiles').update({ wallet_balance: newBuyerWallet }).eq('id', user.id).throwOnError();
            await supabase.from('profiles').update({ wallet_balance: newSellerWallet }).eq('id', listing.user_id).throwOnError();
            
            await supabase.from('transactions').insert({
                seller_industry_name: listing.industry_name, 
                buyer_industry_name: buyerProfile.industry_name,
                amount: totalPayable, 
                credits: listing.no_of_credits, 
                seller_id: listing.user_id, 
                buyer_id: user.id,
            }).throwOnError();
            
            await supabase.from('open_trades').delete().eq('sell_id', listing.sell_id).throwOnError();
            
            refetchMetrics();
            refetchProfile();
            fetchListings();
            alert("Purchase successful!");
        } catch (err: any) {
            console.error("Error during buyCredits:", err);
            alert("Failed to complete purchase. Reverting your balances.");
            await supabase.from('dashboard_metrics').update({ available_credits: originalBuyerCredits }).eq('id', user.id);
            await supabase.from('profiles').update({ wallet_balance: originalBuyerWallet }).eq('id', user.id);
        } finally {
            setLoading(false);
        }
    };

    return { listings, loading, error, sellCredits, buyCredits };
};

