import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentData {
  amount: number;
  description: string;
  listing_id?: string;
  credits?: number;
  notes?: Record<string, any>;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id?: string;
  name: string;
  description: string;
  image?: string;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, any>;
  theme: {
    color: string;
  };
  handler: (response: any) => Promise<void>;
  modal: {
    ondismiss: () => void;
  };
}

export const useDirectRazorpay = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Hardcoded Razorpay credentials (test mode)
  const RAZORPAY_KEY_ID = "rzp_test_RM6DorrRQ16RYj";

  const initiatePayment = useCallback(async (paymentData: PaymentData) => {
    if (!user) {
      console.error('[Direct Razorpay] User not authenticated');
      toast({
        title: "Authentication Error",
        description: "Please login to make a payment.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    console.log('[Direct Razorpay] Initiating direct payment:', {
      amount: paymentData.amount,
      description: paymentData.description,
      user: user.email
    });

    try {
      // Wait for Razorpay SDK to load if not immediately available
      if (typeof window.Razorpay === 'undefined') {
        console.log('[Direct Razorpay] Waiting for Razorpay SDK to load...');
        await new Promise((resolve, reject) => {
          let attempts = 0;
          const checkRazorpay = () => {
            attempts++;
            if (typeof window.Razorpay !== 'undefined') {
              console.log('[Direct Razorpay] Razorpay SDK loaded successfully');
              resolve(true);
            } else if (attempts > 10) { // Wait max 5 seconds
              reject(new Error('Razorpay SDK failed to load after 5 seconds'));
            } else {
              setTimeout(checkRazorpay, 500);
            }
          };
          checkRazorpay();
        });
      }

      // Generate a simple order ID (in production, this should come from backend)
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('[Direct Razorpay] Creating direct payment with order ID:', orderId);

      // Direct Razorpay options without backend order creation
      const options: RazorpayOptions = {
        key: RAZORPAY_KEY_ID,
        amount: Math.round(paymentData.amount * 100), // Convert to paise with proper rounding
        currency: "INR",
        name: "CarbonFlow",
        description: paymentData.description,
        prefill: {
          name: user.user_metadata?.full_name || '',
          email: user.email || '',
          contact: user.user_metadata?.phone || ''
        },
        notes: {
          user_id: user.id,
          listing_id: paymentData.listing_id,
          credits: paymentData.credits,
          type: paymentData.notes?.type || 'wallet_topup',
          ...paymentData.notes
        },
        theme: {
          color: "#059669" // CarbonFlow emerald green
        },
        handler: async (response) => {
          console.log('[Direct Razorpay] Payment successful:', response);
          
          try {
            // Direct payment verification and wallet update
            await handlePaymentSuccess(response, paymentData, user.id);
            
            console.log('[Direct Razorpay] Payment processed successfully');
            toast({
              title: "Payment Successful! ✅",
              description: `₹${paymentData.amount.toLocaleString()} has been added to your wallet.`,
            });

            // Reload to refresh user data
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } catch (error: any) {
            console.error('[Direct Razorpay] Payment verification error:', error);
            toast({
              title: "Payment Processing Error",
              description: "Payment successful but there was an issue updating your wallet. Please contact support.",
              variant: "destructive"
            });
          }
        },
        modal: {
          ondismiss: () => {
            console.log('[Direct Razorpay] Payment modal dismissed');
            setIsLoading(false);
          }
        }
      };

      // Load Razorpay and open payment modal
      if (typeof window.Razorpay !== 'undefined') {
        const rzp = new window.Razorpay(options);
        rzp.open();
        console.log('[Direct Razorpay] Payment modal opened successfully');
        setIsLoading(false); // Reset loading state when modal opens
      } else {
        console.error('[Direct Razorpay] Razorpay SDK not available on window object');
        console.log('[Direct Razorpay] Available window properties:', Object.keys(window));
        throw new Error('Razorpay SDK not loaded. Please refresh the page and ensure you have internet connection.');
      }

    } catch (error: any) {
      console.error('[Direct Razorpay] Payment initiation error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  }, [user, toast]);

  // Handle successful payment and update wallet/credits directly
  const handlePaymentSuccess = async (razorpayResponse: any, paymentData: PaymentData, userId: string) => {
    console.log('[Direct Razorpay] Processing payment success:', razorpayResponse);

    try {
      const paymentType = paymentData.notes?.type || 'wallet_topup';
      
      if (paymentType === 'wallet_topup') {
        // Handle wallet top-up
        await handleWalletTopUp(userId, paymentData.amount);
        console.log('[Direct Razorpay] Wallet top-up completed successfully');
      } else if (paymentType === 'credit_purchase') {
        // Handle credit purchase
        await handleCreditPurchase(userId, paymentData);
        console.log('[Direct Razorpay] Credit purchase completed successfully');
      }

      console.log('[Direct Razorpay] Payment processing completed:', {
        userId,
        type: paymentType,
        amount: paymentData.amount,
        credits: paymentData.credits,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[Direct Razorpay] Payment processing error:', error);
      throw error;
    }
  };

  // Handle wallet top-up
  const handleWalletTopUp = async (userId: string, amount: number) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error(`Failed to get user profile: ${profileError.message}`);
    }

    const currentBalance = profile?.wallet_balance || 0;
    const newBalance = currentBalance + amount;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update wallet: ${updateError.message}`);
    }

    console.log('[Direct Razorpay] Wallet updated:', { oldBalance: currentBalance, newBalance, addedAmount: amount });
  };

  // Handle credit purchase
  const handleCreditPurchase = async (userId: string, paymentData: PaymentData) => {
    try {
      // Get current user metrics (available credits)
      const { data: metrics, error: metricsError } = await supabase
        .from('dashboard_metrics')
        .select('available_credits')
        .eq('id', userId)
        .single();

      if (metricsError) {
        throw new Error(`Failed to get user metrics: ${metricsError.message}`);
      }

      const currentCredits = metrics?.available_credits || 0;
      const newCredits = currentCredits + (paymentData.credits || 0);

      // Update available credits
      const { error: updateError } = await supabase
        .from('dashboard_metrics')
        .update({ available_credits: newCredits })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Failed to update credits: ${updateError.message}`);
      }

      // Record the transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          amount: paymentData.amount,
          buyer_id: userId,
          seller_id: paymentData.notes?.seller_id || 'unknown',
          credits: paymentData.credits || 0,
          buyer_industry_name: null, // Will be filled by trigger
          seller_industry_name: paymentData.notes?.seller_industry || null,
          created_at: new Date().toISOString()
        });

      if (transactionError) {
        console.error('[Direct Razorpay] Transaction record error:', transactionError);
        // Don't throw here as the credit update was successful
      }

      console.log('[Direct Razorpay] Credits updated:', { 
        oldCredits: currentCredits, 
        newCredits, 
        addedCredits: paymentData.credits 
      });

    } catch (error) {
      console.error('[Direct Razorpay] Credit purchase error:', error);
      throw error;
    }
  };

  return {
    initiatePayment,
    isLoading
  };
};