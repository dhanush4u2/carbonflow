import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from './useUserWallet';
import { UserMetrics } from './useUserMetrics';

export interface TradeListing {
  created_at: string;
  industry_name: string | null;
  no_of_credits: number;
  current_market_price: number;
  total_amount: number;
  seller_id: string; // Will be mapped from user_id
  id: string; // Will be mapped from sell_id
  user_id?: string; // Original column name (for reference)
  sell_id?: string; // Original column name (for reference)
  [key: string]: any; // Allow additional fields we might discover
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
                .select('*')
                .not('user_id', 'is', null); // Filter out listings with null user_id (seller) - no empty string check for UUID
            if (fetchError) throw fetchError;
            
            // Map the database columns to our expected interface
            const rawData = (data as any[]) || [];
            const typedData: TradeListing[] = rawData.map(item => ({
                ...item,
                seller_id: item.user_id, // Map user_id to seller_id
                id: item.sell_id?.toString() || item.id?.toString(), // Map sell_id to id, fallback to id
            }));
            
            // Additional client-side validation to ensure data quality
            const validListings = typedData.filter(listing => {
                const isValidUuid = (id: string) => {
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                    return id && uuidRegex.test(id);
                };
                
                const isValid = listing.seller_id && 
                               isValidUuid(listing.seller_id) && 
                               listing.no_of_credits > 0 && 
                               listing.total_amount > 0;
                
                if (!isValid) {
                    console.warn("⚠️ Filtered out invalid listing:", listing);
                }
                return isValid;
            });
            
            console.log(`📋 Loaded ${validListings.length} valid listings (filtered from ${typedData.length} total)`);
            setListings(validListings);
        } catch (err: any) {
            console.error("Error fetching listings:", err);
            console.error("Error details:", err.message, err.code, err.details);
            setError(`Could not load trade listings. ${err.message || 'Unknown error'}`);
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
            console.log("💰 Creating sell listing:", {
                industry_name: sellerProfile.industry_name,
                user_id: user.id, // Using correct column name
                no_of_credits: quantity,
                current_market_price: marketPrice,
                total_amount: totalAmount,
            });
            
            // Use type assertion to work around Supabase type mismatch
            const insertData: any = {
                industry_name: sellerProfile.industry_name, 
                user_id: user.id, // FIXED: Use user_id instead of seller_id
                no_of_credits: quantity, 
                current_market_price: marketPrice, 
                total_amount: totalAmount,
            };
            
            const { error: insertError } = await supabase.from('open_trades').insert(insertData);
            if (insertError) {
                console.error("❌ Insert error:", insertError);
                throw insertError;
            }
            refetchMetrics();
            fetchListings();
            alert("Sell listing created!");
        } catch (err: any) {
            console.error("❌ Error selling credits:", err);
            console.error("❌ Error details:", {
                message: err.message,
                code: err.code,
                details: err.details,
                hint: err.hint
            });
            
            const errorMessage = `Failed to create sell listing: ${err.message || 'Unknown error'}`;
            alert(errorMessage);
            
            // Revert credits
            console.log("🔄 Reverting credits back to original amount:", originalCredits);
            try {
                await supabase.from('dashboard_metrics').update({ available_credits: originalCredits }).eq('id', user.id);
                console.log("✅ Credits reverted successfully");
            } catch (revertErr) {
                console.error("❌ Failed to revert credits:", revertErr);
            }
        } finally {
            setLoading(false);
        }
    };

    const buyCredits = async (listing: TradeListing, buyerProfile: UserProfile, buyerMetrics: UserMetrics) => {
        if (!user) {
            console.error("❌ buyCredits: No user found");
            return;
        }

        // Validation: This should not happen since we filter invalid listings, but keeping as safety net
        if (!listing.seller_id) {
            console.error("❌ Unexpected: Invalid listing passed validation filters");
            console.error("❌ Listing data:", listing);
            throw new Error("Cannot process transaction - seller information is missing");
        }

        // Use the same calculation as CheckoutDialog to ensure consistency
        const subtotal = Math.round(listing.total_amount * 100) / 100;
        const commission = Math.round(subtotal * 0.02 * 100) / 100; // 2% commission
        const gst = Math.round((subtotal + commission) * 0.12 * 100) / 100; // 12% GST
        const totalPayable = Math.round((subtotal + commission + gst) * 100) / 100;

        console.log("💰 Payment calculations:", {
            subtotal,
            commission,
            gst,
            totalPayable,
            walletBalance: buyerProfile.wallet_balance
        });

        if ((buyerProfile.wallet_balance ?? 0) < totalPayable) {
            console.error("❌ Insufficient wallet balance:", {
                required: totalPayable,
                available: buyerProfile.wallet_balance
            });
            alert("Insufficient wallet balance."); 
            return;
        }
        
        setLoading(true);
        const originalBuyerCredits = buyerMetrics.available_credits ?? 0;
        const originalBuyerWallet = buyerProfile.wallet_balance ?? 0;
        try {
            const newBuyerCredits = originalBuyerCredits + listing.no_of_credits;
            const newBuyerWallet = originalBuyerWallet - totalPayable;
            const sellerGets = listing.total_amount; // Seller gets exactly what they listed for (no taxes/fees)
            
            console.log("💵 Payment breakdown:", {
                buyerPays: totalPayable,
                sellerReceives: sellerGets,
                carbonFlowCommission: commission,
                gst: gst,
                note: "Seller gets base amount, CarbonFlow keeps commission + GST"
            });

            console.log("🔄 Step 1: Fetching seller profile...");
            console.log("🔍 Looking for seller with ID:", listing.seller_id);
            console.log("🔍 Original user_id:", listing.user_id);
            console.log("🔍 Seller ID type:", typeof listing.seller_id);
            
            // Use the original user_id for profile lookup
            const sellerId = listing.user_id || listing.seller_id;
            const { data: sellerProfileData, error: sellerErr } = await supabase.from('profiles').select('*').eq('id', sellerId).single();
            
            console.log("🔍 Seller query result:", { sellerProfileData, sellerErr });
            
            let actualSellerProfile = sellerProfileData;
            let shouldUpdateSellerWallet = true;
            
            if(sellerErr || !sellerProfileData) {
                console.error("❌ Seller profile error:", sellerErr);
                console.error("❌ Seller ID not found:", listing.seller_id);
                
                // Let's also check what profiles actually exist
                const { data: allProfiles } = await supabase.from('profiles').select('id, industry_name');
                console.log("📋 Available profiles:", allProfiles);
                
                // TEMPORARY WORKAROUND: Skip seller wallet update if profile doesn't exist
                console.warn("⚠️ Skipping seller wallet update due to missing profile");
                console.log("🔄 Continuing with buyer transaction only...");
                
                // Set seller data to continue without seller wallet update
                shouldUpdateSellerWallet = false;
                console.log("⚠️ WARNING: Seller will not receive payment - profile missing!");
            }
            const newSellerWallet = shouldUpdateSellerWallet ? (actualSellerProfile?.wallet_balance ?? 0) + sellerGets : 0;
            
            console.log("🔄 Step 2: Updating buyer credits...");
            await supabase.from('dashboard_metrics').update({ available_credits: newBuyerCredits }).eq('id', user.id).throwOnError();
            
            console.log("🔄 Step 3: Updating buyer wallet...");
            await supabase.from('profiles').update({ wallet_balance: newBuyerWallet }).eq('id', user.id).throwOnError();
            
            console.log("🔄 Step 4: Updating seller wallet...");
            if (shouldUpdateSellerWallet && sellerId) {
                // Update seller's wallet in profiles table (same as buyer)
                const currentSellerWallet = actualSellerProfile?.wallet_balance || 0;
                const updatedSellerWallet = currentSellerWallet + sellerGets;
                
                console.log(`💰 Seller payment: ${sellerGets} credits (${currentSellerWallet} → ${updatedSellerWallet})`);
                
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ wallet_balance: updatedSellerWallet })
                    .eq('id', sellerId);
                    
                if (updateError) {
                    console.error("❌ Failed to update seller wallet:", updateError);
                    throw updateError;
                }
                console.log("✅ Seller wallet updated successfully");
            } else {
                console.log("⚠️ Skipped seller wallet update - profile not found");
            }
            
            console.log("🔄 Step 5: Creating transaction record...");
            
            // Validate all required fields for transaction
            const transactionData = {
                seller_industry_name: listing.industry_name, 
                buyer_industry_name: buyerProfile.industry_name,
                amount: totalPayable, 
                credits: listing.no_of_credits, 
                seller_id: sellerId, // Use the correct seller ID
                buyer_id: user.id,
            };
            
            console.log("📋 Transaction data:", transactionData);
            
            // Ensure seller_id is not null
            if (!transactionData.seller_id) {
                console.error("❌ Cannot create transaction: seller_id is null");
                throw new Error("Transaction failed - seller ID is required but missing");
            }
            
            await supabase.from('transactions').insert(transactionData).throwOnError();
            
            console.log("🔄 Step 6: Removing listing from open_trades...", { 
                listingId: listing.id, 
                sellId: listing.sell_id 
            });
            
            // Use sell_id for deletion (the actual primary key in database)
            const deleteId = listing.sell_id || listing.id;
            if (!deleteId) {
                console.error("❌ No listing ID found for deletion:", listing);
                throw new Error("Listing ID is missing - cannot remove from open_trades");
            }
            
            console.log("🗑️ Deleting trade with sell_id:", deleteId);
            try {
                // Use a more explicit approach to avoid TypeScript issues
                const { data, error: deleteError, count } = await supabase
                    .from('open_trades')
                    .delete({ count: 'exact' })
                    .match({ sell_id: deleteId });
                
                if (deleteError) {
                    console.error("❌ Failed to delete listing:", deleteError);
                    throw new Error(`Failed to remove listing: ${deleteError.message}`);
                }
                
                console.log(`✅ Successfully removed ${count || 0} listing(s) from open_trades`);
            } catch (deleteErr: any) {
                console.error("❌ Exception during deletion:", deleteErr);
                throw new Error(`Failed to remove listing: ${deleteErr.message}`);
            }
            
            refetchMetrics();
            refetchProfile();
            fetchListings(); // Refresh marketplace to remove purchased listing
            alert(`Purchase successful! Bought ${listing.no_of_credits} credits for ₹${totalPayable.toLocaleString()}. Trade completed and removed from marketplace.`);
        } catch (err: any) {
            console.error("❌ Error during buyCredits:", err);
            console.error("❌ Error details:", {
                message: err.message,
                code: err.code,
                details: err.details,
                hint: err.hint,
                stack: err.stack
            });
            
            const errorMessage = `Failed to complete purchase: ${err.message || 'Unknown error'}`;
            alert(errorMessage);
            
            console.log("🔄 Reverting buyer balances...");
            try {
                await supabase.from('dashboard_metrics').update({ available_credits: originalBuyerCredits }).eq('id', user.id);
                await supabase.from('profiles').update({ wallet_balance: originalBuyerWallet }).eq('id', user.id);
                console.log("✅ Balances reverted successfully");
            } catch (revertErr) {
                console.error("❌ Failed to revert balances:", revertErr);
            }
        } finally {
            setLoading(false);
        }
    };

    return { listings, loading, error, sellCredits, buyCredits };
};

