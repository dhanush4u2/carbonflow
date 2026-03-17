import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { Separator } from "@/components/ui/separator";
  import { Badge } from "@/components/ui/badge";
  import { CreditCard, Shield, Check } from "lucide-react";
  import { TradeListing, useTradeListings } from "@/hooks/useTradeListings";
  import { useDirectRazorpay } from "@/hooks/useDirectRazorpay";
  import { useToast } from "@/hooks/use-toast";
  import { useUserWallet } from "@/hooks/useUserWallet";
  import { useUserMetrics } from "@/hooks/useUserMetrics";
  
  // Define the structure for the checkout calculation
  interface CheckoutDetails {
    subtotal: number;
    commission: number;
    gst: number;
    total: number;
  }
  
  interface CheckoutDialogProps {
    listing: TradeListing | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (listing: TradeListing) => void;
    loading: boolean;
  }
  
  export function CheckoutDialog({ listing, isOpen, onClose, onConfirm, loading }: CheckoutDialogProps) {
    const { initiatePayment, isLoading: razorpayLoading } = useDirectRazorpay();
    const { profile, refetch: refetchProfile } = useUserWallet();
    const { metrics, refetch: refetchMetrics } = useUserMetrics();
    const { buyCredits, loading: walletPaymentLoading } = useTradeListings(refetchMetrics, refetchProfile);
    const { toast } = useToast();
    
    if (!listing) return null;
  
    // Calculate all costs associated with the purchase
    const calculateCheckout = (): CheckoutDetails => {
      const subtotal = Math.round(listing.total_amount * 100) / 100; // Round to 2 decimals
      const commission = Math.round(subtotal * 0.02 * 100) / 100; // CarbonFlow's 2% commission
      const gst = Math.round((subtotal + commission) * 0.12 * 100) / 100; // 12% GST on subtotal + commission
      const total = Math.round((subtotal + commission + gst) * 100) / 100; // Final total rounded
      return { subtotal, commission, gst, total };
    };
  
    const details = calculateCheckout();
    const isProcessing = loading || razorpayLoading || walletPaymentLoading;

    // Handle payment via Razorpay
    const handleRazorpayPayment = async () => {
      try {
        console.log('🛒 Starting Razorpay payment for credit purchase:', details);
        
        toast({
          title: "Processing Payment",
          description: "Redirecting to Razorpay payment gateway...",
        });

        await initiatePayment({
          amount: details.total,
          description: `Purchase ${listing.no_of_credits} carbon credits from ${listing.industry_name}`,
          listing_id: listing.seller_id, // Use seller_id instead of listing.id
          credits: listing.no_of_credits,
          notes: {
            type: 'credit_purchase',
            seller_id: listing.seller_id,
            seller_industry: listing.industry_name,
            credits: listing.no_of_credits,
            subtotal: details.subtotal,
            commission: details.commission,
            gst: details.gst,
            total: details.total,
          }
        });

        // Payment initiation successful - dialog will close after payment
        toast({
          title: "Payment Gateway Opened!",
          description: "Complete the payment to purchase carbon credits.",
        });
        
        // Close dialog after initiating payment
        setTimeout(() => {
          onClose();
        }, 1000);
      } catch (error) {
        console.error('❌ Razorpay payment error:', error);
        toast({
          title: "Payment Failed",
          description: "There was an issue processing your payment.",
          variant: "destructive",
        });
      }
    };
  
    // Handle wallet payment method with proper balance deduction
    const handleWalletPayment = async () => {
      if (!profile || !metrics) {
        toast({
          title: "Error",
          description: "User profile or metrics not loaded. Please try again.",
          variant: "destructive",
        });
        return;
      }

      try {
        toast({
          title: "Processing Purchase",
          description: "Deducting from wallet and adding credits to your account...",
        });

        await buyCredits(listing, profile, metrics);
        
        toast({
          title: "Purchase Successful!",
          description: `Successfully purchased ${listing.no_of_credits} credits for ₹${details.total.toLocaleString()}`,
        });

        // Close dialog after successful purchase
        onClose();
      } catch (error) {
        console.error('❌ Wallet payment error:', error);
        toast({
          title: "Payment Failed",
          description: "There was an issue processing your wallet payment.",
          variant: "destructive",
        });
      }
    };
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              Review the transaction details below before confirming your purchase.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Seller</span>
              <span className="font-medium">{listing.industry_name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Credits to Purchase</span>
              <span className="font-medium">{listing.no_of_credits.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
               <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{details.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
               <div className="flex justify-between">
                <span className="text-muted-foreground">CarbonFlow Commission (2%)</span>
                <span>₹{details.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
               <div className="flex justify-between">
                <span className="text-muted-foreground">GST (12%)</span>
                <span>₹{details.gst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <Separator />
             <div className="flex justify-between text-lg font-bold">
              <span>Total Payable</span>
              <span>₹{details.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            {/* Payment Methods Section */}
            <div className="space-y-3 mt-4">
              <h4 className="font-semibold text-sm">Choose Payment Method</h4>
              
              {/* Razorpay Payment Option */}
              <div className="space-y-2">
                <Button 
                  onClick={handleRazorpayPayment} 
                  disabled={isProcessing}
                  className="w-full flex items-center gap-2"
                  variant="default"
                >
                  <CreditCard className="h-4 w-4" />
                  {isProcessing ? "Processing..." : "Pay with Razorpay"}
                  <Badge variant="outline" className="ml-auto">
                    <Shield className="h-3 w-3 mr-1" />
                    Secure
                  </Badge>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Pay securely with cards, UPI, netbanking & wallets
                </p>
              </div>
              
              {/* Wallet Payment Option */}
              <div className="space-y-2">
                <Button 
                  onClick={handleWalletPayment} 
                  disabled={isProcessing}
                  variant="outline"
                  className="w-full flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {walletPaymentLoading ? "Processing..." : "Pay from Wallet Balance"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Use your existing CarbonFlow wallet balance
                </p>
              </div>
            </div>

            {/* Error handling is now done through toast notifications */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  