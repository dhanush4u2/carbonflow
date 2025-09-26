// Path: supabase/functions/_shared/cors.ts
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Or specify your localhost and production URL: 'http://localhost:5173, https://your-prod-url.com'
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };