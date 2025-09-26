import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Define a simple interface for the data we expect from dashboard_metrics
interface MetricUser {
  id: string;
  total_ghg_emissions: number | null;
}

// 'Deno.serve' is a global function available in the Deno runtime on Supabase.
// Your local editor may not recognize it, but this is the correct way to define an Edge Function.
Deno.serve(async (req) => {
  // This is a standard requirement for Supabase functions to handle preflight requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Create the Supabase Admin Client
    // This uses the service_role_key (a secure environment variable) to bypass RLS policies.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log("Compliance checker function started.");

    // 2. Get all users who have emissions data
    const { data: users, error: usersError } = await supabaseAdmin
      .from('dashboard_metrics')
      .select('id, total_ghg_emissions');
    if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);
    console.log(`Found ${users.length} users with metrics to check.`);

    const alertsToSend = [];

    // 3. For each user, check their most recent monthly emission status
    for (const user of (users as MetricUser[])) {
      const { data: latestLog, error: logError } = await supabaseAdmin
        .from('monthly_emissions_history')
        .select('current_year_emissions, target_emissions')
        .eq('user_id', user.id)
        .order('month', { ascending: false })
        .limit(1)
        .single();
      
      if (logError || !latestLog) {
        console.log(`Skipping user ${user.id}: No recent emission log found.`);
        continue;
      }

      const { current_year_emissions, target_emissions } = latestLog;
      
      if (typeof current_year_emissions === 'number' && typeof target_emissions === 'number' && target_emissions > 0) {
        
        // 4. Determine if they are in the "at risk" zone (e.g., over 90% of their target)
        if (current_year_emissions > (target_emissions * 0.9)) {
          const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.admin.getUserById(user.id);
          if (authError || !authUser) {
            console.log(`Skipping alert for user ${user.id}: Could not retrieve auth user.`);
            continue;
          }

          alertsToSend.push({
            email: authUser.email,
            emissions: current_year_emissions,
            target: target_emissions,
          });
          console.log(`User ${user.id} is at risk. Queuing alert for ${authUser.email}.`);
        }
      }
    }

    // 5. Send an email alert to each user identified as at risk
    console.log(`Attempting to send ${alertsToSend.length} email alerts...`);
    for (const alert of alertsToSend) {
      await supabaseAdmin.auth.admin.inviteUserByEmail(alert.email, {
        data: {
          subject: "Compliance Alert: Action Required",
          title: "High Emissions Detected",
          message: `This is an automated alert from CarbonFlow. Your recent emissions of ${alert.emissions} tCO₂e are approaching your monthly target of ${alert.target} tCO₂e. Please review your emissions and take corrective action to remain compliant.`,
        }
      });
      console.log(`Successfully sent alert to ${alert.email}.`);
    }

    return new Response(JSON.stringify({ message: `Sent ${alertsToSend.length} compliance alerts successfully.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Critical error in compliance checker:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

