import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Wallet, Search, AlertCircle, IndianRupee, TrendingUp } from "lucide-react";
import { SellCreditsDialog } from "@/components/marketplace/SellCreditsDialog";
import { CheckoutDialog } from "@/components/marketplace/CheckoutDialog";
import { WalletTopUp } from "@/components/marketplace/WalletTopUp";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { useTradeListings, TradeListing } from "@/hooks/useTradeListings";
import { useTransactions } from "@/hooks/useTransactions";
import { useMarketData } from "@/hooks/useMarketData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function ListingRow({ listing, onBuy, loading, isOwnListing }: { listing: TradeListing; onBuy: (l: TradeListing) => void; loading: boolean; isOwnListing: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-smooth gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{listing.industry_name}</span>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary">Verified</Badge>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>Listed on {new Date(listing.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="flex items-center space-x-4 sm:space-x-6 w-full sm:w-auto">
        <div className="text-left sm:text-center">
          <div className="text-sm text-muted-foreground">Quantity</div>
          <div className="font-medium text-foreground">{listing.no_of_credits.toLocaleString()}</div>
        </div>
        <div className="text-left sm:text-center">
          <div className="text-sm text-muted-foreground">Total Price</div>
          <div className="font-medium text-foreground">₹{listing.total_amount.toLocaleString()}</div>
        </div>
        <Button onClick={() => onBuy(listing)} disabled={loading || isOwnListing} className="w-full sm:w-auto">
          {isOwnListing ? "Your Listing" : "Buy Now"}
        </Button>
      </div>
    </div>
  );
}


export function Marketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { profile, loading: profileLoading, error: profileError, refetch: refetchProfile } = useUserWallet();
  const { metrics, loading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useUserMetrics();
  const { marketData, loading: marketLoading, error: marketError } = useMarketData();
  const { listings, loading: listingsLoading, error: listingsError, sellCredits, fetchListings } = useTradeListings(refetchMetrics, refetchProfile);
  const { refetch: refetchTransactions } = useTransactions();

  const [selectedListing, setSelectedListing] = useState<TradeListing | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const loading = profileLoading || metricsLoading || listingsLoading || marketLoading;
  const combinedError = profileError || metricsError || listingsError || marketError;

  const handleSell = async (quantity: number) => {
    if (profile && metrics && marketData) {
      await sellCredits(quantity, profile, metrics, marketData.market_price_inr || 0);
    }
  };
  
  const handleBuyClick = (listing: TradeListing) => {
    setSelectedListing(listing);
  };
  
  const handleConfirmPurchase = async (listing: TradeListing) => {
    if (!profile) return;

    setIsPurchasing(true);
    try {
      // Debug: Log wallet addresses before sending to backend
      console.log('listing.seller_wallet_address:', listing.seller_wallet_address);
      console.log('profile.wallet_address:', profile.wallet_address);
      const { data, error } = await supabase.functions.invoke('execute-trade', {
        body: { listing, buyerProfile: profile },
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Purchase Successful!",
        description: `Transaction recorded on blockchain. Hash: ${data.transactionHash.slice(0, 20)}...`,
        duration: 5000,
      });

      // Refetch all data to update the UI
      refetchProfile();
      refetchMetrics();
      fetchListings();
      refetchTransactions();
    } catch (err: any) {
      toast({
        title: "Purchase Failed",
        description: err.message || "Could not complete the transaction.",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
      setSelectedListing(null);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Carbon Credit Marketplace</h1>
          <p className="text-muted-foreground">
            Buy and sell verified carbon credits from other industries.
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="outline" disabled className="flex-1 sm:flex-none">
            <Search className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <SellCreditsDialog
            creditBalance={metrics?.available_credits ?? 0}
            onSell={handleSell}
            loading={loading}
          />
        </div>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Credit Balance Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 select-none">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5" />
          <CardContent className="relative p-6 select-none">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                    <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Your Credit Balance</h3>
                    {loading ? (
                      <Skeleton className="h-4 w-32 mt-1" />
                    ) : (
                      <p className="text-sm text-slate-600 dark:text-slate-400">{profile?.industry_name || 'Your Industry'}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                {loading ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {metrics?.available_credits?.toLocaleString() ?? 0}
                  </div>
                )}
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                  Available Credits
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Balance Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 select-none">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5" />
          <CardContent className="relative p-6 select-none">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50">
                    <IndianRupee className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">In-App Wallet</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Available for trading</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                {loading ? (
                  <Skeleton className="h-10 w-24" />
                ) : (
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    ₹{profile?.wallet_balance?.toLocaleString() ?? 0}
                  </div>
                )}
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                  INR Balance
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compact Wallet Top-Up Card */}
        <WalletTopUp 
          currentBalance={profile?.wallet_balance ?? 0}
          onTopUpSuccess={refetchProfile}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Market Price</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-28" /> : <div className="text-2xl font-bold text-foreground">₹{marketData?.market_price_inr?.toLocaleString() ?? 'N/A'}</div>}
            <div className="flex items-center mt-1"><TrendingUp className="h-4 w-4 text-success mr-1" /><span className="text-sm text-success">+5.2%</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Listings</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold text-foreground">{listings.length}</div>}
            <p className="text-xs text-muted-foreground mt-1">active listings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">24h Volume</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">--</div>
            <p className="text-xs text-muted-foreground mt-1">credits traded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Your Trades</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">--</div>
            <p className="text-xs text-muted-foreground mt-1">this month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /> Available Credits for Purchase</CardTitle>
          <CardDescription>Browse listings from other industries on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">{Array.from({ length: 3 }).map((_, idx) => <Skeleton key={idx} className="h-20 w-full" />)}</div>
          ) : combinedError ? (
            <div className="text-center text-destructive py-8"><AlertCircle className="mx-auto h-8 w-8 mb-2" /><p>{combinedError}</p></div>
          ) : listings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8"><ShoppingCart className="mx-auto h-8 w-8 mb-2" /><p>There are no open trade listings available right now.</p></div>
          ) : (
            <div className="space-y-4">
              {listings.map((listing) => (
                <ListingRow key={listing.id} listing={listing} onBuy={handleBuyClick} loading={isPurchasing} isOwnListing={user?.id === listing.seller_id} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <CheckoutDialog 
        isOpen={!!selectedListing}
        onClose={() => setSelectedListing(null)}
        listing={selectedListing}
        onConfirm={handleConfirmPurchase}
        loading={isPurchasing}
      />
    </div>
  );
}