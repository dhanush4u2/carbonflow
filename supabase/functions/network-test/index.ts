// supabase/functions/network-test/index.ts
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  console.log("Network test function invoked.");
  try {
    console.log("Attempting to fetch https://google.com ...");
    
    // We try to fetch a reliable, non-AI site with a 10-second timeout.
    const response = await fetch('https://google.com', { signal: AbortSignal.timeout(10000) });
    
    console.log(`Fetch to google.com was successful with status: ${response.status}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      status: response.status,
      message: "Outbound network connection is working." 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("Fetch to google.com FAILED:", error.message);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      message: "Outbound network connection failed. Contact Supabase support."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})