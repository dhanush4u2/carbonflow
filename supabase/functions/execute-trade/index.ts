// supabase/functions/execute-trade/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from 'https://esm.sh/ethers@6.7.0'
import { corsHeaders } from '../_shared/cors.ts'

// This is the ABI (Application Binary Interface) of your contract.
// It tells ethers.js how to interact with your deployed contract.
const contractAbi = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tradeId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "seller", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "credits", "type": "uint256" }
    ],
    "name": "TradeRecorded",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "nextTradeId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "seller", "type": "address" },
      { "internalType": "address", "name": "buyer", "type": "address" },
      { "internalType": "uint256", "name": "credits", "type": "uint256" },
      { "internalType": "uint256", "name": "amountInr", "type": "uint256" }
    ],
    "name": "recordTransaction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Paste the address of your deployed contract from Remix here.
const contractAddress = 'YOUR_DEPLOYED_CONTRACT_ADDRESS';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { listing, buyerProfile } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // --- Blockchain Interaction ---
    const rpcUrl = Deno.env.get('SEPOLIA_RPC_URL');
    const privateKey = Deno.env.get('WALLET_PRIVATE_KEY');
    if (!rpcUrl || !privateKey) {
      throw new Error("Missing blockchain environment variables.");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const ledgerContract = new ethers.Contract(contractAddress, contractAbi, wallet);

    // Call the smart contract to record the transaction.
    // NOTE: In a real app, seller/buyer would be real wallet addresses.
    // Here we use placeholder addresses for demonstration.
    const tx = await ledgerContract.recordTransaction(
      '0x000000000000000000000000000000000000dEaD', // Placeholder Seller Address
      '0x000000000000000000000000000000000000bEEF', // Placeholder Buyer Address
      listing.no_of_credits,
      listing.total_amount
    );

    console.log(`Blockchain transaction sent. Waiting for confirmation... Hash: ${tx.hash}`);
    const receipt = await tx.wait(); // Wait for the transaction to be mined
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    // --- Database Interaction (Now that blockchain is confirmed) ---
    // In a real app, you would wrap these DB calls in a `supabase.rpc` call
    // to a pl/pgsql function for true atomicity.
    
    // 1. Record the transaction in your own DB, now with the blockchain hash
    await supabaseAdmin.from('transactions').insert({
      seller_industry_name: listing.industry_name,
      buyer_industry_name: buyerProfile.industry_name,
      amount: listing.total_amount,
      credits: listing.no_of_credits,
      seller_id: listing.seller_id,
      buyer_id: buyerProfile.id,
      blockchain_tx_hash: receipt.hash // Storing the proof!
    }).throwOnError();
    
    // ... (Your other database updates: update wallets, credits, delete listing, etc.) ...
    
    // 4. Delete listing
    await supabaseAdmin.from('open_trades').delete().eq('id', listing.id).throwOnError();

    return new Response(JSON.stringify({ 
      message: 'Trade successful!',
      transactionHash: receipt.hash
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in execute-trade function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})