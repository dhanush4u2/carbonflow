import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Loader2 } from "lucide-react";
import { useReportSummary } from "@/hooks/useReportSummary";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { useTransactions } from "@/hooks/useTransactions";
import { useOnboardingSummary } from "@/hooks/useOnboardingSummary";
// We remove the direct import of the PDF generator from here
import { useToast } from "@/hooks/use-toast";

export function Reporting() {
  const { summary, loading: summaryLoading } = useReportSummary();
  const { profile, loading: profileLoading } = useUserWallet();
  const { metrics, loading: metricsLoading } = useUserMetrics();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { summary: onboarding, loading: onboardingLoading, error: onboardingError } = useOnboardingSummary();
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!profile || !metrics || !transactions) {
      toast({
        title: "Data Not Ready",
        description: "Please wait until all data has loaded before generating a report.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // **THE FIX:** We now dynamically import the PDF generator only when needed.
      // This prevents the library from interfering with the initial page load.
      const { generatePdfReport } = await import("@/lib/pdfGenerator");
      generatePdfReport({ profile, metrics, transactions, onboarding });
      toast({
        title: "Report Generated",
        description: "Your PDF report has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast({
        title: "Generation Failed",
        description: "Could not generate the PDF report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const anyDataLoading = profileLoading || metricsLoading || transactionsLoading || onboardingLoading;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Compliance & Reporting</h1>
          <p className="text-muted-foreground">
            Generate and manage comprehensive compliance reports.
          </p>
        </div>
        <Button onClick={handleGenerateReport} disabled={isGenerating || anyDataLoading}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Generate & Download Report
            </>
          )}
        </Button>
      </div>

      {/* Onboarding Results Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-primary font-bold">Onboarding Results</CardTitle>
          <CardDescription>AI-powered analysis of your onboarding submission and initial sustainability profile.</CardDescription>
        </CardHeader>
        <CardContent>
          {onboardingLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : onboardingError ? (
            <div className="text-destructive">{onboardingError}</div>
          ) : onboarding ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/40 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">AI Estimated Emissions</div>
                  <div className="text-2xl font-bold text-foreground">{onboarding.ai_estimated_emissions ?? 'N/A'} tCO2e</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">AI Allocated Credits</div>
                  <div className="text-2xl font-bold text-success">{onboarding.ai_allocated_credits ?? 'N/A'}</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">Submission Date</div>
                  <div className="text-lg font-semibold text-foreground">{onboarding.created_at ? new Date(onboarding.created_at).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>
              {onboarding.ai_reasoning && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">AI Reasoning</div>
                  <div className="text-base text-foreground">{onboarding.ai_reasoning}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">No onboarding results found.</div>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        {/* Summary Cards */}
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Transactions (Month)</CardTitle></CardHeader>
            <CardContent>
                {summaryLoading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold text-foreground">{summary?.reportsThisMonth ?? 0}</div>}
                <p className="text-xs text-muted-foreground mt-1">Total buy & sell trades</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Compliance Score</CardTitle></CardHeader>
            <CardContent>
                {summaryLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold text-success">{summary?.complianceScore ?? 0}%</div>}
                <p className="text-xs text-muted-foreground mt-1">Based on emission targets</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Actions</CardTitle></CardHeader>
            <CardContent>
                {summaryLoading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold text-warning">{summary?.pendingReports ?? 0}</div>}
                <p className="text-xs text-muted-foreground mt-1">Items requiring attention</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Automation Rate</CardTitle></CardHeader>
            <CardContent>
                {summaryLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold text-primary">{summary?.autoGeneratedPercent ?? 0}%</div>}
                <p className="text-xs text-muted-foreground mt-1">Of data points & reports</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Report Generation
          </CardTitle>
          <CardDescription>
            Click the "Generate & Download Report" button above to create a live, up-to-date PDF summary of all your data, including metrics, balances, and recent transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 bg-muted/40 rounded-lg">
            <p className="text-muted-foreground">
              {anyDataLoading ? "Loading data for report..." : "Your report is ready to be generated."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
