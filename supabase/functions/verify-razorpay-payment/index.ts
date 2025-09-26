import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Razorpay from "https://esm.sh/razorpay@2.9.2";
import crypto from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature',
          verified: false 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Razorpay key secret from environment
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      throw new Error('Razorpay key secret not configured');
    }

    // Create signature verification string
    const signatureBody = razorpay_order_id + '|' + razorpay_payment_id;
    
    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(signatureBody)
      .digest('hex');

    // Compare signatures
    const isValidSignature = expectedSignature === razorpay_signature;

    console.log('Payment verification:', {
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      verified: isValidSignature
    });

    return new Response(
      JSON.stringify({
        verified: isValidSignature,
        success: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error verifying payment:', error);
    
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message || 'Payment verification failed',
        verified: false,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});