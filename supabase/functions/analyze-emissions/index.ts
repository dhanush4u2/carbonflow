// Path: supabase/functions/analyze-emissions/index.ts
import { corsHeaders } from '../_shared/cors.ts';
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    console.log('[DEBUG 1/8] Function "analyze-emissions" invoked.');
    const { userData } = await req.json();
    if (!userData) {
      throw new Error("User data is required for analysis.");
    }
    console.log('[DEBUG 2/8] Successfully parsed request body.');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key is not set in Supabase secrets.");
    }
    console.log('[DEBUG 3/8] Successfully retrieved GEMINI_API_KEY from secrets.');
    const prompt = `
      Analyze the following carbon emissions data for an industrial facility and provide 4 specific, actionable AI insights:
      
      Current Data:
      - Total GHG Emissions: ${userData.totalEmissions} tCO2e
      - Available Carbon Credits: ${userData.availableCredits}
      - Monthly History: ${JSON.stringify(userData.monthlyHistory)}
      - Recent Emission Sources: ${JSON.stringify(userData.recentLogs)}
      
      Please provide exactly 4 insights in this JSON format:
      [
        {
          "category": "efficiency|reduction|market|compliance",
          "title": "Brief insight title",
          "description": "Detailed description of the insight",
          "impact": "high|medium|low",
          "recommendation": "Specific actionable recommendation",
          "potentialSavings": "Estimated savings (optional)"
        }
      ]
    `;
    console.log('[DEBUG 4/8] Sending request to Google Gemini API...');
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
    console.log(`[DEBUG 5/8] Received response from Google API with status: ${response.status}`);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google API request failed: ${response.status} ${errorBody}`);
    }
    const result = await response.json();
    console.log('[DEBUG 6/8] Successfully parsed JSON from Google response.');
    const generatedText = result.candidates[0].content.parts[0].text;
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON.');
    }
    console.log('[DEBUG 7/8] Successfully extracted JSON from AI content.');
    const parsedInsights = JSON.parse(jsonMatch[0]);
    console.log('[DEBUG 8/8] Function complete. Sending successful response.');
    return new Response(JSON.stringify(parsedInsights), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('--- CRITICAL ERROR in analyze-emissions ---');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
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
