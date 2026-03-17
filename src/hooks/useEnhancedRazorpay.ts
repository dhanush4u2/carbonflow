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
  order_id: string;
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

export const useEnhancedRazorpay = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const initiatePayment = useCallback(async (paymentData: PaymentData) => {
    if (!user) {
      console.error('[Enhanced Razorpay] User not authenticated');
      toast({
        title: "Authentication Error",
        description: "Please login to make a payment.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    console.log('[Enhanced Razorpay] Initiating payment:', {
      amount: paymentData.amount,
      description: paymentData.description,
      user: user.email
    });

    try {
      // Enhanced order creation with better error handling
      const receiptId = `CF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('[Enhanced Razorpay] Calling Edge Function with body:', {
        amount: paymentData.amount * 100,
        currency: "INR",
        receipt: receiptId,
        notes: {
          user_id: user.id,
          listing_id: paymentData.listing_id,
          credits: paymentData.credits,
          type: paymentData.notes?.type || 'wallet_topup',
          description: paymentData.description,
          ...paymentData.notes
        }
      });

      // Test if Edge Functions work at all
      console.log('[Enhanced Razorpay] Testing basic Edge Function connectivity...');
      try {
        const testResponse = await supabase.functions.invoke('test-function');
        console.log('[Enhanced Razorpay] Test function response:', testResponse);
      } catch (testError) {
        console.error('[Enhanced Razorpay] Test function failed:', testError);
      }

      const response = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: paymentData.amount * 100, // Convert to paise
          currency: "INR",
          receipt: receiptId,
          notes: {
            user_id: user.id,
            listing_id: paymentData.listing_id,
            credits: paymentData.credits,
            type: paymentData.notes?.type || 'wallet_topup',
            description: paymentData.description,
            ...paymentData.notes
          }
        }
      });

      console.log('[Enhanced Razorpay] Full Edge Function response:', response);
      console.log('[Enhanced Razorpay] Response data:', response.data);
      console.log('[Enhanced Razorpay] Response error:', response.error);
      
      const { data, error } = response;

      // Check for Edge Function specific errors
      if (error) {
        console.error('[Enhanced Razorpay] Order creation failed with error:', error);
        if (error.message?.includes('Failed to send a request')) {
          throw new Error('Edge Function is not responding. Please check Supabase configuration.');
        }
        throw new Error(error.message || 'Failed to create payment order');
      }

      // Check if the function returned an error response
      if (data?.error) {
        console.error('[Enhanced Razorpay] Order creation failed with function error:', data.error);
        throw new Error(data.error || 'Failed to create payment order');
      }

      if (!data?.order) {
        console.error('[Enhanced Razorpay] No order data received:', data);
        throw new Error('Invalid order response from server');
      }

      console.log('[Enhanced Razorpay] Order created successfully:', data.order.id);

      // Enhanced Razorpay options with CarbonFlow branding
      const options: RazorpayOptions = {
        key: data.key_id,
        amount: data.order.amount,
        currency: data.order.currency,
        order_id: data.order.id,
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
          ...paymentData.notes
        },
        theme: {
          color: "#059669" // CarbonFlow emerald green
        },
        handler: async (response) => {
          console.log('[Enhanced Razorpay] Payment successful:', response.razorpay_payment_id);
          
          try {
            // Enhanced payment verification
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                user_id: user.id,
                listing_id: paymentData.listing_id,
                credits: paymentData.credits
              }
            });

            if (verifyError) {
              console.error('[Enhanced Razorpay] Verification failed:', verifyError);
              throw new Error(verifyError.message || 'Payment verification failed');
            }

            console.log('[Enhanced Razorpay] Payment verified successfully');
            toast({
              title: "Payment Successful! ✅",
              description: "Your payment has been processed successfully.",
            });

            // Reload to refresh user data
            window.location.reload();
          } catch (error: any) {
            console.error('[Enhanced Razorpay] Verification error:', error);
            toast({
              title: "Verification Error",
              description: error.message || "Payment verification failed. Please contact support.",
              variant: "destructive"
            });
          }
        },
        modal: {
          ondismiss: () => {
            console.log('[Enhanced Razorpay] Payment modal dismissed');
            setIsLoading(false);
          }
        }
      };

      // Load Razorpay and open payment modal
      if (typeof window.Razorpay !== 'undefined') {
        const rzp = new window.Razorpay(options);
        rzp.open();
        console.log('[Enhanced Razorpay] Payment modal opened successfully');
        setIsLoading(false); // Reset loading state when modal opens
      } else {
        throw new Error('Razorpay SDK not loaded');
      }

    } catch (error: any) {
      console.error('[Enhanced Razorpay] Payment initiation error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  }, [user, toast]);

  return {
    initiatePayment,
    isLoading
  };
};