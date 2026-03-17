// ...existing code...

export const generatePdfReport = (data: ReportData) => {
  try {
    const { profile, metrics, transactions, onboarding } = data;
    const doc = new jsPDF();

    // --- Cover Page (Page 1) ---
    const pageWidth = doc.internal.pageSize.getWidth();
    let coverY = 40;
    doc.setFontSize(28);
    doc.setTextColor('#10b981');
    doc.text('CarbonFlow Compliance & Emissions Report', pageWidth / 2, coverY, { align: 'center' });
    coverY += 10;
    // Accent line
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

    // --- Page 2: All Data Sections, Well Spaced ---
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


    // --- Page 3: Transaction History Section ---
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

    // --- Save the PDF ---
    doc.save(`CarbonReport_${profile?.industry_name || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('PDF Generation Error:', err);
    alert('PDF Generation Error: ' + (err instanceof Error ? err.message : String(err)));
    throw err;
  }
};
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserProfile } from '@/hooks/useUserWallet';
import { UserMetrics } from '@/hooks/useUserMetrics';
import { Transaction } from '@/hooks/useTransactions';
import { OnboardingSummary } from '@/hooks/useOnboardingSummary';

interface ReportData {
  profile: UserProfile | null;
  metrics: UserMetrics | null;
  transactions: Transaction[];
  onboarding?: OnboardingSummary | null;
}
