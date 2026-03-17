import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  RAZORPAY_CONFIG, 
  loadRazorpayScript, 
  generateReceiptId, 
  convertToPaise 
} from '@/lib/razorpay';
import type { 
  RazorpayOptions, 
  RazorpayResponse, 
  CreateOrderRequest,
  PaymentVerificationRequest 
} from '@/types/razorpay.d';

interface PaymentData {
  amount: number;
  description: string;
  listing_id?: string;
  credits?: number;
  notes?: Record<string, any>;
}

interface UseRazorpayReturn {
  isLoading: boolean;
  error: string | null;
  initiatePayment: (paymentData: PaymentData) => Promise<boolean>;
  createOrder: (orderData: CreateOrderRequest) => Promise<string | null>;
  verifyPayment: (verificationData: PaymentVerificationRequest) => Promise<boolean>;
}

export const useRazorpay = (): UseRazorpayReturn => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Razorpay order via Supabase Edge Function
  const createOrder = useCallback(async (orderData: CreateOrderRequest): Promise<string | null> => {
    try {
      setError(null);
      
      // Call Supabase Edge Function to create Razorpay order
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: orderData
      });

      if (error) throw error;
      
      return data.order_id;
    } catch (err: any) {
      console.error('Error creating Razorpay order:', err);
      setError(err.message || 'Failed to create payment order');
      return null;
    }
  }, []);

  // Verify payment via Supabase Edge Function
  const verifyPayment = useCallback(async (verificationData: PaymentVerificationRequest): Promise<boolean> => {
    try {
      setError(null);
      
      // Call Supabase Edge Function to verify payment
      const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: verificationData
      });

      if (error) throw error;
      
      return data.verified === true;
    } catch (err: any) {
      console.error('Error verifying payment:', err);
      setError(err.message || 'Payment verification failed');
      return false;
    }
  }, []);

  // Main payment initiation function
  const initiatePayment = useCallback(async (paymentData: PaymentData): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Initiating Razorpay payment:', paymentData);

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay script. Please check your internet connection.');
      }

      console.log('✅ Razorpay script loaded successfully');

      // Get user profile for prefill
      const { data: profile } = await supabase
        .from('profiles')
        .select('industry_name')
        .eq('id', user.id)
        .single();

      console.log('👤 User profile fetched:', profile);

      // Create order
      const receiptId = generateReceiptId('CF_CREDIT');
      const orderData: CreateOrderRequest = {
        amount: convertToPaise(paymentData.amount),
        currency: RAZORPAY_CONFIG.CURRENCY,
        receipt: receiptId,
        notes: {
          user_id: user.id,
          listing_id: paymentData.listing_id,
          credits: paymentData.credits,
          ...paymentData.notes
        }
      };

      console.log('📄 Creating order with data:', orderData);

      const orderId = await createOrder(orderData);
      if (!orderId) {
        throw new Error('Failed to create payment order. Please try again.');
      }

      console.log('✅ Order created successfully:', orderId);

      // Configure Razorpay options
      const options: RazorpayOptions = {
        key: RAZORPAY_CONFIG.KEY_ID,
        amount: convertToPaise(paymentData.amount),
        currency: RAZORPAY_CONFIG.CURRENCY,
        name: RAZORPAY_CONFIG.COMPANY_NAME,
        description: paymentData.description,
        image: RAZORPAY_CONFIG.COMPANY_LOGO,
        order_id: orderId,
        handler: async (response: RazorpayResponse) => {
          console.log('💳 Payment completed, verifying...', response);
          
          try {
            // Verify payment
            const verified = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            console.log('🔐 Payment verification result:', verified);

            if (verified) {
              // Payment successful - handle completion
              await handlePaymentSuccess(response, paymentData);
              console.log('✅ Payment processing complete');
            } else {
              setError('Payment verification failed. Please contact support.');
            }
          } catch (err) {
            console.error('❌ Payment verification error:', err);
            setError('Payment verification failed. Please contact support.');
          } finally {
            setIsLoading(false);
          }
        },
        prefill: {
          name: profile?.industry_name || 'CarbonFlow User',
          email: user.email || '',
          contact: ''
        },
        theme: {
          color: RAZORPAY_CONFIG.THEME_COLOR
        },
        modal: {
          ondismiss: () => {
            console.log('🚫 Payment modal dismissed by user');
            setIsLoading(false);
            setError('Payment cancelled by user');
          }
        }
      };

      console.log('🔧 Razorpay options configured:', {
        ...options,
        key: options.key.substring(0, 10) + '...',
        order_id: orderId
      });

      // Check if Razorpay is loaded
      if (!window.Razorpay) {
        throw new Error('Razorpay is not loaded. Please refresh the page and try again.');
      }

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      
      // Handle payment errors
      rzp.on('payment.failed', (response: any) => {
        console.error('💥 Payment failed:', response.error);
        setError(`Payment failed: ${response.error.description || 'Unknown error'}`);
        setIsLoading(false);
      });

      console.log('🎯 Opening Razorpay checkout...');
      rzp.open();

      return true;
    } catch (err: any) {
      console.error('Error initiating payment:', err);
      setError(err.message || 'Failed to initiate payment');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, createOrder, verifyPayment]);

  // Handle successful payment completion
  const handlePaymentSuccess = async (
    response: RazorpayResponse, 
    paymentData: PaymentData
  ) => {
    try {
      console.log('💰 Processing payment success for:', paymentData);

      if (!user?.id) {
        throw new Error('User not found');
      }

      const paymentType = paymentData.notes?.type || 'wallet_topup';
      
      if (paymentType === 'wallet_topup') {
        // Handle wallet top-up
        console.log('📈 Processing wallet top-up...');
        
        const { data: currentProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          console.error('❌ Error fetching current balance:', fetchError);
          throw fetchError;
        }

        const currentBalance = currentProfile?.wallet_balance || 0;
        const newBalance = currentBalance + paymentData.amount;
        
        console.log(`💳 Balance update: ₹${currentBalance} → ₹${newBalance}`);

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', user.id);

        if (updateError) {
          console.error('❌ Error updating wallet balance:', updateError);
          throw updateError;
        }

        console.log('✅ Wallet balance updated successfully');

        // Store transaction record for audit trail
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            buyer_id: user.id,
            seller_id: user.id, // Self-transaction for wallet top-up
            amount: paymentData.amount,
            credits: 0,
            buyer_industry_name: 'Wallet Top-up',
            seller_industry_name: `Razorpay Payment: ${response.razorpay_payment_id}`,
          });

        if (transactionError) {
          console.warn('⚠️ Warning: Could not store transaction record:', transactionError);
        }

      } else if (paymentType === 'credit_purchase') {
        // Handle credit purchase
        console.log('🌱 Processing credit purchase...');
        
        if (!paymentData.listing_id || !paymentData.credits) {
          throw new Error('Invalid credit purchase data');
        }

        // Get listing details
        const listingId = parseInt(paymentData.listing_id || '0');
        const { data: listing, error: listingError } = await supabase
          .from('open_trades')
          .select('id, seller_id, industry_name, no_of_credits, total_amount')
          .eq('id', listingId)
          .single();

        if (listingError || !listing) {
          throw new Error('Listing not found or already sold');
        }

        // Get buyer profile
        const { data: buyerProfile, error: buyerError } = await supabase
          .from('profiles')
          .select('industry_name')
          .eq('id', user.id)
          .single();

        if (buyerError) {
          throw new Error('Buyer profile not found');
        }

        // Update buyer's credits
        const { data: currentMetrics, error: metricsError } = await supabase
          .from('dashboard_metrics')
          .select('available_credits')
          .eq('id', user.id)
          .single();

        const currentCredits = currentMetrics?.available_credits || 0;
        const newCredits = currentCredits + listing.no_of_credits;

        const { error: creditsUpdateError } = await supabase
          .from('dashboard_metrics')
          .update({ available_credits: newCredits })
          .eq('id', user.id);

        if (creditsUpdateError) {
          throw creditsUpdateError;
        }

        // Update seller's wallet
        const { data: sellerProfile, error: sellerFetchError } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', listing.seller_id)
          .single();

        if (sellerFetchError) {
          throw new Error('Seller profile not found');
        }

        const sellerAmount = paymentData.notes?.subtotal || paymentData.amount * 0.85; // Seller gets 85% after fees
        const newSellerBalance = (sellerProfile.wallet_balance || 0) + sellerAmount;

        const { error: sellerUpdateError } = await supabase
          .from('profiles')
          .update({ wallet_balance: newSellerBalance })
          .eq('id', listing.seller_id);

        if (sellerUpdateError) {
          throw sellerUpdateError;
        }

        // Create transaction record
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            buyer_id: user.id,
            seller_id: listing.seller_id,
            amount: paymentData.amount,
            credits: listing.no_of_credits,
            buyer_industry_name: buyerProfile.industry_name,
            seller_industry_name: listing.industry_name,
          });

        if (transactionError) {
          console.warn('⚠️ Warning: Could not store transaction record:', transactionError);
        }

        // Remove listing from marketplace
        const { error: deleteError } = await supabase
          .from('open_trades')
          .delete()
          .eq('id', listingId);

        if (deleteError) {
          console.warn('⚠️ Warning: Could not remove listing:', deleteError);
        }

        console.log('✅ Credit purchase completed successfully');
      }

      console.log('🎉 Payment processing completed successfully!');
    } catch (err: any) {
      console.error('❌ Error handling payment success:', err);
      setError('Payment completed but processing failed. Please contact support with payment ID: ' + response.razorpay_payment_id);
      throw err; // Re-throw to handle in caller
    }
  };

  return {
    isLoading,
    error,
    initiatePayment,
    createOrder,
    verifyPayment
  };
};