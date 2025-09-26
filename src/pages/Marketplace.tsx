import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Wallet, Search, AlertCircle, IndianRupee, TrendingUp } from "lucide-react";
import { SellCreditsDialog } from "@/components/marketplace/SellCreditsDialog";
import { CheckoutDialog } from "@/components/marketplace/CheckoutDialog";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { useTradeListings, TradeListing } from "@/hooks/useTradeListings";
import { useMarketData } from "@/hooks/useMarketData";
import { useAuth } from "@/contexts/AuthContext";

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
  const { profile, loading: profileLoading, error: profileError, refetch: refetchProfile } = useUserWallet();
  const { metrics, loading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useUserMetrics();
  const { marketData, loading: marketLoading, error: marketError } = useMarketData();
  const { listings, loading: listingsLoading, error: listingsError, sellCredits, buyCredits } = useTradeListings(refetchMetrics, refetchProfile);
  
  const [selectedListing, setSelectedListing] = useState<TradeListing | null>(null);
  
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
    if (profile && metrics) {
      await buyCredits(listing, profile, metrics);
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
      
      {/* This section contains the restored UI for credit and wallet balances */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Credit Balance Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary"><Wallet className="h-6 w-6 text-primary-foreground" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Your Credit Balance</h3>
                  {loading ? <Skeleton className="h-4 w-32 mt-1" /> : <p className="text-muted-foreground">{profile?.industry_name || 'Your Industry'}</p>}
                </div>
              </div>
              <div className="text-right">
                {loading ? <Skeleton className="h-9 w-24" /> : <div className="text-3xl font-bold text-foreground">{metrics?.available_credits?.toLocaleString() ?? 0}</div>}
                <div className="text-sm text-muted-foreground">Available Credits</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Balance Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-secondary"><IndianRupee className="h-6 w-6 text-secondary-foreground" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">In-App Wallet</h3>
                  <p className="text-muted-foreground">Available for trading</p>
                </div>
              </div>
              <div className="text-right">
                {loading ? <Skeleton className="h-9 w-32" /> : <div className="text-3xl font-bold text-foreground">₹{profile?.wallet_balance?.toLocaleString() ?? 0}</div>}
                <div className="text-sm text-muted-foreground">INR Balance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Overview Section */}
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

      {/* Marketplace Listings Card */}
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
                <ListingRow key={listing.sell_id} listing={listing} onBuy={handleBuyClick} loading={loading} isOwnListing={user?.id === listing.user_id} />
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
        loading={loading}
      />
    </div>
  );
}
