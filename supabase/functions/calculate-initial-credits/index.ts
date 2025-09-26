// Path: supabase/functions/calculate-initial-credits/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface OnboardingData {
  userId: string;
  electricityKwh: number;
  fuelLiters: number;
  // ... other fields from your form
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, ...consumptionData }: OnboardingData = await req.json();
    if (!userId) throw new Error("User ID is required.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // 1. Calculate credits and emissions reliably on the backend
    const baseCredits = 50;
    const calculatedCredits = Math.round(baseCredits + ((consumptionData.electricityKwh || 0) / 1000) + ((consumptionData.fuelLiters || 0) / 100));
    const estimatedEmissions = calculatedCredits * 1.15;

    // 2. Craft a prompt asking the AI ONLY for the reasoning text
    const prompt = `
      An industrial facility's data resulted in an estimate of ${estimatedEmissions.toFixed(1)} tCO₂e monthly emissions and an allocation of ${calculatedCredits} credits. 
      Briefly provide a one-sentence justification for this allocation to show the user.
      User Data: ${JSON.stringify(consumptionData)}
      Provide ONLY a valid JSON object with a single key: "reasoning" (string).
    `;

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    let reasoning = "Allocation is based on your submitted consumption data and standard industry benchmarks.";
    if (geminiResponse.ok) {
        const result = await geminiResponse.json();
        const generatedText = result.candidates[0].content.parts[0].text;
        const aiData = JSON.parse(generatedText.match(/\{[\s\S]*\}/)![0]);
        reasoning = aiData.reasoning || reasoning;
    }

    // 3. Save to the new, simpler submissions table
    await supabaseAdmin
      .from('onboarding_submissions')
      .insert({
        user_id: userId,
        submission_data: consumptionData,
        ai_reasoning: reasoning // Only save the text summary
      })
      .throwOnError();

    // 4. Update the other tables with the reliable, calculated numbers
    await supabaseAdmin
      .from('dashboard_metrics')
      .upsert({ 
        id: userId,
        available_credits: calculatedCredits,
        total_ghg_emissions: estimatedEmissions,
        last_month_ghg_emissions: estimatedEmissions
      })
      .throwOnError();

    await supabaseAdmin
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId)
      .throwOnError();

    return new Response(JSON.stringify({ message: "Onboarding complete!", initialCredits: calculatedCredits }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
```
3.  Click **Save and deploy**.

### **Step 3: The Final Reporting Page**

This updated page now fetches data from two different hooks to construct the summary, just as you suggested.

1.  Navigate to `src/pages/`.
2.  **Replace the entire contents** of `Reporting.tsx` with this final version.

```tsx
// Path: src/pages/Reporting.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Loader2, Brain, BarChart, FileJson, Quote } from "lucide-react";
import { useReportSummary } from "@/hooks/useReportSummary";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { useTransactions } from "@/hooks/useTransactions";
import { generatePdfReport } from "@/lib/pdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { useOnboardingSummary } from "@/hooks/useOnboardingSummary"; // This hook now just gets the text

const DataPoint = ({ label, value, unit }) => (
    <div className="flex justify-between text-sm py-2 border-b border-border/50">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value ?? 'N/A'} {unit}</span>
    </div>
);

export function Reporting() {
  const { summary, loading: summaryLoading } = useReportSummary();
  const { profile, loading: profileLoading } = useUserWallet();
  // **THE FIX - PART 1: Use the metrics hook as the source of truth for the numbers**
  const { metrics, loading: metricsLoading } = useUserMetrics(); 
  const { transactions, loading: transactionsLoading } = useTransactions();
  // **THE FIX - PART 2: This hook is now only responsible for the submitted data and AI text**
  const { summary: onboardingSummary, loading: onboardingLoading } = useOnboardingSummary();
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => { /* ... unchanged ... */ };
  
  const anyDataLoading = profileLoading || metricsLoading || transactionsLoading;

  // **THE FIX - PART 3: Calculate emissions on the fly from the reliable metrics data**
  const initialCredits = metrics?.available_credits;
  const estimatedEmissions = initialCredits ? (initialCredits * 1.15).toFixed(1) : 'N/A';

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* ... top section and summary cards are unchanged ... */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Compliance & Reporting</h1>
          <p className="text-muted-foreground">Generate and manage comprehensive compliance reports.</p>
        </div>
        <Button onClick={handleGenerateReport} disabled={isGenerating || anyDataLoading}>
          {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Download className="h-4 w-4 mr-2" />Generate & Download Report</>}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">{/* ... summary cards ... */}</div>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Initial AI Assessment Summary
            </CardTitle>
            <CardDescription>
                This is a summary of the data you provided and the resulting analysis.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {onboardingLoading || metricsLoading ? (
                <Skeleton className="h-32 w-full" />
            ) : onboardingSummary ? (
                <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
                    <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2"><FileJson className="h-4 w-4 text-muted-foreground" />Your Submitted Data</h3>
                        <div className="space-y-1">
                            {/* This part correctly reads from the submission_data JSON */}
                            <DataPoint label="Electricity Usage" value={onboardingSummary.submission_data?.electricityKwh} unit="kWh" />
                            <DataPoint label="Fuel Consumption" value={onboardingSummary.submission_data?.fuelLiters} unit="Liters" />
                            <DataPoint label="Water Usage" value={onboardingSummary.submission_data?.waterLiters} unit="Liters" />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2"><BarChart className="h-4 w-4 text-muted-foreground" />AI Analysis Results</h3>
                        <div className="space-y-1">
                            {/* These now use the reliable, calculated values */}
                            <DataPoint label="Est. Monthly Emissions" value={estimatedEmissions} unit="tCO₂e" />
                            <DataPoint label="Initial Credit Allocation" value={initialCredits} unit="Credits" />
                        </div>
                        <div className="mt-6 bg-accent/50 p-4 rounded-lg">
                            <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><Quote className="h-4 w-4 text-primary"/>AI Reasoning</h4>
                            <p className="text-sm text-muted-foreground italic">"{onboardingSummary.ai_reasoning ?? 'No reasoning provided.'}"</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground"><p>No onboarding assessment data found.</p></div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Report Generation</CardTitle>
          <CardDescription>Click the button above to create a live PDF summary.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 bg-muted/40 rounded-lg">
            <p className="text-muted-foreground">{anyDataLoading ? "Loading data..." : "Ready to generate."}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

