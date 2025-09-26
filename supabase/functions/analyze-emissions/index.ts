// Path: supabase/functions/analyze-emissions/index.ts
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const { userData } = await req.json()
    if (!userData) throw new Error("User data is required.")

    // ✅ 1. Get the new Fireworks API key
    const FIREWORKS_API_KEY = Deno.env.get('FIREWORKS_API_KEY')
    if (!FIREWORKS_API_KEY) throw new Error("Fireworks API key not set.")

    const systemPrompt = `You are an expert carbon emissions analyst. Your task is to analyze the user's data and provide exactly 4 specific, actionable AI insights. You MUST ONLY respond with a valid JSON array containing the 4 insights. Do not include any other text, greetings, or explanations outside of the JSON structure.`
    const userPrompt = `Data for analysis: - Total GHG Emissions: ${userData.totalEmissions} tCO2e - Available Credits: ${userData.availableCredits} - Monthly History: ${JSON.stringify(userData.monthlyHistory)} - Recent Sources: ${JSON.stringify(userData.recentLogs)}`

    // ✅ 2. Call the Fireworks API endpoint
    const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIREWORKS_API_KEY}`
      },
      body: JSON.stringify({
        // ✅ 3. Use a powerful model available on Fireworks
        model: "accounts/fireworks/models/mixtral-8x7b-instruct", 
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.1
      }),
      signal: controller.signal 
    })

    if (!response.ok) {
      throw new Error(`Fireworks API request failed: ${response.status} ${await response.text()}`)
    }

    const result = await response.json()
    const generatedText = result.choices[0]?.message?.content
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('AI response did not contain valid JSON.')
    
    return new Response(jsonMatch[0], {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const status = error.name === 'AbortError' ? 504 : 500;
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  } finally {
    clearTimeout(timeoutId);
  }
})