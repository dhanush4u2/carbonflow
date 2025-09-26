// Path: supabase/functions/calculate-initial-credits/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
Deno.serve(async (req)=>{
  // Standard CORS preflight request handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { userId, ...consumptionData } = await req.json();
    if (!userId) throw new Error("User ID is required.");
    // --- 1. Securely get the Gemini API key ---
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key is not set in Supabase secrets.");
    }
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // --- 2. Create a new, detailed prompt for the AI auditor ---
    const prompt = `
      As an environmental auditor, analyze the following monthly consumption data for a new industrial client to establish their initial carbon credit allocation.

      Client's Monthly Data:
      - Electricity Usage: ${consumptionData.electricityKwh || 0} kWh
      - Fuel Consumption: ${consumptionData.fuelLiters || 0} Liters
      - Water Usage: ${consumptionData.waterLiters || 0} Liters
      - Solid Waste Generated: ${consumptionData.wasteKg || 0} kg
      - Raw Material Processed: ${consumptionData.rawMaterialTons || 0} Tons
      - Logistics Travel: ${consumptionData.transportKm || 0} km
      - Production Output: ${consumptionData.productionUnits || 0} units

      Your task is to:
      1.  Estimate their monthly carbon footprint in tonnes of CO2 equivalent (tCO₂e).
      2.  Allocate a fair and reasonable number of initial carbon credits as a starting baseline. This should be an integer.
      3.  Provide a brief, one-sentence justification for your calculation.

      You MUST respond ONLY with a valid JSON object in the following format:
      {
        "estimatedEmissions": <number>,
        "allocatedCredits": <integer>,
        "reasoning": "<string>"
      }
    `;
    // --- 3. Call the Gemini API ---
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google API request failed: ${response.status} ${errorBody}`);
    }
    const result = await response.json();
    const generatedText = result.candidates[0].content.parts[0].text;
    // Clean up potential markdown code block fences
    const cleanJsonText = generatedText.replace(/```json/g, '').replace(/```/g, '');
    const aiResult = JSON.parse(cleanJsonText);
    // --- 4. Use the AI's response to update the database ---
    await supabaseAdmin.from('onboarding_submissions').insert({
      user_id: userId,
      submission_data: consumptionData,
      ai_estimated_emissions: aiResult.estimatedEmissions,
      ai_allocated_credits: aiResult.allocatedCredits,
      ai_reasoning: aiResult.reasoning
    }).throwOnError();
    await supabaseAdmin.from('dashboard_metrics').upsert({
      id: userId,
      available_credits: aiResult.allocatedCredits,
      total_ghg_emissions: aiResult.estimatedEmissions,
      last_month_ghg_emissions: aiResult.estimatedEmissions
    }).throwOnError();
    await supabaseAdmin.from('profiles').update({
      onboarding_completed: true
    }).eq('id', userId).throwOnError();
    return new Response(JSON.stringify({
      message: "Onboarding complete!",
      initialCredits: aiResult.allocatedCredits // Send the AI-calculated credits back
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error("Critical error in onboarding function:", error.message);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
