import React, { useState } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
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

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

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

  // Generate PDF preview when all data is loaded
  React.useEffect(() => {
    const generatePreview = async () => {
      if (profile && metrics && transactions) {
        const { jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        // --- Cover Page (Page 1) ---
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let coverY = 40;
        doc.setFontSize(28);
        doc.setTextColor('#10b981');
        doc.text('CarbonFlow Compliance & Emissions Report', pageWidth / 2, coverY, { align: 'center' });
        coverY += 10;
        doc.setDrawColor('#10b981');
        doc.setLineWidth(1.2);
        doc.line(pageWidth * 0.2, coverY, pageWidth * 0.8, coverY);
        coverY += 18;
        doc.setFontSize(18);
        doc.setTextColor(50);
        doc.setFont('helvetica', 'bold');
        doc.text(`Organization: ${profile?.industry_name || 'N/A'}`, pageWidth / 2, coverY, { align: 'center' });
        coverY += 14;
        doc.text(`Report Generated: ${new Date().toLocaleString()}`, pageWidth / 2, coverY, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        coverY += 22;
        doc.setFontSize(13);
        doc.setTextColor(100);
        const summary = 'This report summarizes your emissions, compliance, onboarding, and trading activity for the selected period.';
        doc.text(summary, pageWidth / 2, coverY, { align: 'center', maxWidth: pageWidth * 0.7 });

        // --- Page 2: Onboarding, Compliance, Emissions Summary ---
        doc.addPage();
        let y = 30;
        // Onboarding Results Section
        if (onboarding) {
          doc.setFontSize(20);
          doc.setTextColor('#10b981');
          doc.text('Onboarding Results', 14, y);
          y += 12;
          doc.setFontSize(13);
          doc.setTextColor(50);
          doc.text(`Organization: ${profile?.industry_name || 'N/A'}`, 14, y);
          y += 8;
          autoTable(doc, {
            startY: y + 4,
            head: [['Metric', 'Value']],
            body: [
              ['AI Estimated Emissions', `${Number(onboarding.ai_estimated_emissions ?? 0).toFixed(2)} tCO2e`],
              ['AI Allocated Credits', `${Number(onboarding.ai_allocated_credits ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`],
              ['Submission Date', onboarding.created_at ? new Date(onboarding.created_at).toLocaleDateString() : 'N/A'],
            ],
            theme: 'striped',
            headStyles: { fillColor: '#10b981' },
            styles: { fontSize: 11 },
          });
          y = (doc as any).lastAutoTable.finalY + 10;
          if (onboarding.ai_reasoning) {
            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text('AI Reasoning:', 14, y);
            doc.setFontSize(10);
            doc.setTextColor(50);
            doc.text(onboarding.ai_reasoning, 14, y + 6, { maxWidth: doc.internal.pageSize.width - 28 });
            y += 18;
          }
        }
        // Compliance Analysis Section
        doc.setFontSize(18);
        doc.setTextColor('#10b981');
        doc.text('Compliance Analysis', 14, y);
        y += 8;
        doc.setFontSize(12);
        doc.setTextColor(50);
        autoTable(doc, {
          startY: y,
          head: [['Metric', 'Value', 'Description']],
          body: [
            ['Wallet Balance', `Rs. ${(Number(profile?.wallet_balance) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 'Current available balance'],
            ['Total GHG Emissions', `${Number(metrics?.total_ghg_emissions ?? 0).toFixed(2)} tCO2e`, 'Total greenhouse gas emissions'],
            ['Last Month Emissions', `${Number(metrics?.last_month_ghg_emissions ?? 0).toFixed(2)} tCO2e`, 'Emissions in the previous month'],
            ['Available Carbon Credits', `${(metrics?.available_credits ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 'Credits available for trading'],
          ],
          theme: 'striped',
          headStyles: { fillColor: '#10b981' },
          styles: { fontSize: 11 },
        });
  y = (doc as any).lastAutoTable.finalY + 12;
        // Emissions Summary Section
        doc.setFontSize(16);
        doc.setTextColor('#10b981');
        doc.text('Emissions Summary', 14, y);
        y += 8;
        autoTable(doc, {
          startY: y,
          head: [['Metric', 'Value']],
          body: [
            ['Total GHG Emissions', `${Number(metrics?.total_ghg_emissions ?? 0).toFixed(2)} tCO2e`],
            ['Last Month Emissions', `${Number(metrics?.last_month_ghg_emissions ?? 0).toFixed(2)} tCO2e`],
            ['Available Carbon Credits', `${(metrics?.available_credits ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`],
          ],
          theme: 'grid',
          headStyles: { fillColor: '#10b981' },
          styles: { fontSize: 11 },
        });
  y = (doc as any).lastAutoTable.finalY + 12;

        // --- Page 3: Transaction History ---
        doc.addPage();
        let txY = 30;
        doc.setFontSize(16);
        doc.setTextColor('#10b981');
        doc.text('Recent Transaction History', 14, txY);
        txY += 8;
        autoTable(doc, {
          startY: txY,
          head: [['Date', 'Type', 'Counterparty', 'Credits', 'Amount (INR)']],
          body: transactions.slice(0, 15).map(tx => {
            const isBuy = tx.buyer_id === profile?.id;
            return [
              new Date(tx.created_at).toLocaleString(),
              isBuy ? 'Buy' : 'Sell',
              (isBuy ? tx.seller_industry_name : tx.buyer_industry_name) || 'N/A',
              `${(tx.credits ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
              `Rs. ${(Number(tx.amount) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
            ];
          }),
          theme: 'striped',
          headStyles: { fillColor: '#10b981' },
          styles: { fontSize: 10 },
        });
  txY = (doc as any).lastAutoTable.finalY + 12;
        // Totals & Notes Section
        doc.setFontSize(14);
        doc.setTextColor(50);
        const totalCredits = transactions.reduce((sum, tx) => sum + (tx.credits ?? 0), 0);
        const totalAmount = transactions.reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Credits Traded: ${totalCredits.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 14, txY);
        doc.text(`Total Amount Traded: Rs. ${Number(totalAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 14, txY + 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text('Notes:', 14, txY + 18);
        doc.setFontSize(10);
        doc.text('• This report is auto-generated and reflects the latest available data.', 18, txY + 24);
        doc.text('• For compliance, address any pending actions promptly.', 18, txY + 29);
        doc.text('• Contact support for any discrepancies or clarifications.', 18, txY + 34);

        // --- Footer ---
  const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(10);
          doc.setTextColor(150);
          doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
          doc.text('Confidential - Generated by CarbonFlow', 14, doc.internal.pageSize.height - 10);
        }

        // --- Output full PDF as data URL for preview ---
        const pdfDataUrl = doc.output('dataurlstring');
        setPdfPreviewUrl(pdfDataUrl);
      }
    };
    generatePreview();
    // eslint-disable-next-line
  }, [profile, metrics, transactions, onboarding]);
  
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
            {anyDataLoading ? (
              <p className="text-muted-foreground">Loading data for report...</p>
            ) : pdfPreviewUrl ? (
              <div className="flex flex-col items-center gap-2">
                <iframe
                  src={pdfPreviewUrl}
                  title="PDF Cover Preview"
                  style={{ width: 400, height: 500, borderRadius: 8, boxShadow: '0 2px 8px #0002', border: 'none' }}
                />
                <p className="text-xs text-muted-foreground">Preview of your PDF report (cover page)</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Preparing PDF preview...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
