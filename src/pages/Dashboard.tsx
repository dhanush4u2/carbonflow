import { SummaryCards } from "@/components/dashboard/SummaryCards"
import { EmissionsChart } from "@/components/dashboard/EmissionsChart"
import { CreditActivityFeed } from "@/components/dashboard/CreditActivityFeed"
import { AIRecommendations } from "@/components/dashboard/AIRecommendations"
import { MonthlyReductionHero } from "@/components/dashboard/MonthlyReductionHero"
import { DashboardHeroGreeting } from "@/components/dashboard/DashboardHeroGreeting"
import heroImage from "@/assets/carbon-dashboard-hero.jpg"

export function Dashboard() {
  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Hero Section */}
      <div className="relative rounded-lg overflow-hidden">
        <div 
          className="h-48 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-secondary/90" />
          <div className="relative h-full flex items-center justify-between px-8">
            
            {/* Dynamic, personalized greeting */}
            <DashboardHeroGreeting />
            
            {/* Dynamic monthly reduction percentage */}
            <MonthlyReductionHero />

          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards />

      {/* Charts and Activity Grid */}
      <div className="grid gap-6 md:grid-cols-7">
        <EmissionsChart className="md:col-span-4" />
        <CreditActivityFeed className="md:col-span-3" />
      </div>

      {/* AI Recommendations (Row 2, full width) */}
      <div className="grid gap-6">
        <AIRecommendations className="md:col-span-full" />
      </div>
    </div>
  )
}

