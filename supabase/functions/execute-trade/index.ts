
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
// Use ethers.js from npm: for Deno Deploy/Edge Functions
import { ethers } from 'https://esm.sh/ethers@6'

const CONTRACT_ADDRESS = '0x7ed815014643D694d1628BdAB9ca2cf5ba143585';
const CONTRACT_ABI = [
  "function recordTransaction(address seller, address buyer, uint256 credits, uint256 amountInr)"
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Receive the data
    const { listing, buyerProfile } = await req.json();
    if (!listing || !buyerProfile) {
      throw new Error("Missing listing or buyer profile data.");
    }

    // Check for secrets
    const rpcUrl = Deno.env.get('SEPOLIA_RPC_URL');
    const privateKey = Deno.env.get('WALLET_PRIVATE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!rpcUrl || !privateKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables.");
    }

    // Connect to Sepolia
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    // Call the smart contract
    // You must have seller_wallet_address and buyer_wallet_address in your data
    const sellerWallet = listing.seller_wallet_address;
    const buyerWallet = buyerProfile.wallet_address;
    if (!sellerWallet || !buyerWallet) {
      console.error("Missing wallet addresses:", {
        sellerWallet,
        buyerWallet,
        listing,
        buyerProfile
      });
      return new Response(JSON.stringify({
        error: "Missing wallet addresses for seller or buyer.",
        sellerWallet,
        buyerWallet,
        listing,
        buyerProfile
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const tx = await contract.recordTransaction(
      sellerWallet,
      buyerWallet,
      listing.no_of_credits,
      listing.total_amount
    );

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    const transactionHash = tx.hash;

    // Update Supabase transactions table
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    // Find the correct transaction record to update
    // This assumes you have a transaction id or can match by listing id
    const { error: updateError } = await supabaseClient
      .from('transactions')
      .update({ blockchain_tx_hash: transactionHash })
      .eq('id', listing.id); // Adjust if your transaction id is different
    if (updateError) {
      throw new Error("Failed to update transaction hash in Supabase: " + updateError.message);
    }

    return new Response(JSON.stringify({
      message: 'Trade recorded on blockchain.',
      transactionHash
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    let errorMsg = 'Unknown error';
    if (error instanceof Error) {
      errorMsg = error.message;
    } else if (typeof error === 'string') {
      errorMsg = error;
    }
    return new Response(JSON.stringify({ error: errorMsg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})