import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Lightbulb, TrendingDown, Zap, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom" // 👈 1. Import the useNavigate hook

interface Recommendation {
  id: string
  title: string
  description: string
  impact: "high" | "medium" | "low"
  potentialReduction: string
  category: "energy" | "process" | "transport" | "waste"
  priority: number
}

const recommendations: Recommendation[] = [
  {
    id: "1",
    title: "Optimize Boiler Efficiency",
    description: "Your boiler systems are operating at 78% efficiency. Implementing advanced controls could reduce fuel consumption.",
    impact: "high",
    potentialReduction: "180 tCO₂e/year",
    category: "energy",
    priority: 1
  },
  {
    id: "2", 
    title: "LED Lighting Upgrade",
    description: "Replace remaining fluorescent lighting with LED systems for 40% energy reduction in lighting loads.",
    impact: "medium",
    potentialReduction: "95 tCO₂e/year",
    category: "energy",
    priority: 2
  },
  {
    id: "3",
    title: "Waste Heat Recovery",
    description: "Install heat recovery systems on your exhaust streams to preheat incoming air and reduce heating demand.",
    impact: "high",
    potentialReduction: "220 tCO₂e/year",
    category: "process",
    priority: 1
  }
]

function ImpactBadge({ impact }: { impact: Recommendation["impact"] }) {
  const variants = {
    high: "bg-success/10 text-success border-success/20 font-medium",
    medium: "bg-warning/10 text-warning border-warning/20 font-medium", 
    low: "bg-muted/10 text-muted-foreground border-border font-medium"
  }
  
  return (
    <Badge variant="outline" className={variants[impact]}>
      {impact} impact
    </Badge>
  )
}

function CategoryIcon({ category }: { category: Recommendation["category"] }) {
  const icons = {
    energy: Zap,
    process: Brain,
    transport: TrendingDown,
    waste: Lightbulb
  }
  
  const Icon = icons[category]
  return <Icon className="h-4 w-4" />
}

export function AIRecommendations({ className }: { className?: string }) {
  const navigate = useNavigate() // 👈 2. Initialize the hook

  const handleLearnMore = (recId: string) => {
    console.log(`Navigating to AI Analysis for recommendation: ${recId}`)
    // 👇 3. Navigate to the '/ai-analysis' route
    navigate('/ai-analysis')
  }

  const handleViewAll = () => {
    console.log("Navigating to AI Analysis page")
    // 👇 4. Also navigate to the '/ai-analysis' route
    navigate('/ai-analysis')
  }

  return (
    <Card className={cn("shadow-none", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">AI Insights</div>
            <div className="text-xs text-muted-foreground font-normal">Powered by machine learning</div>
          </div>
        </CardTitle>
        <CardDescription className="text-xs">
          Smart recommendations to reduce your carbon footprint
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {recommendations.map((rec) => (
          <div key={rec.id} className="p-3 rounded-md border border-border/50">
            <div className="flex items-start gap-3 mb-2">
              <div className="p-1.5 rounded-md bg-accent">
                <CategoryIcon category={rec.category} />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground text-sm">{rec.title}</h4>
                <div className="mt-1">
                  <ImpactBadge impact={rec.impact} />
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed pl-9">
              {rec.description}
            </p>
            <div className="flex items-center justify-between pl-9">
              <div className="text-sm">
                <span className="text-success font-semibold">{rec.potentialReduction}</span>
                <span className="text-muted-foreground text-xs ml-1">potential annually</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => handleLearnMore(rec.id)}
              >
                Details
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        ))}
        
        <Button 
          variant="outline" 
          className="w-full mt-2 hover:bg-primary hover:text-primary-foreground"
          onClick={handleViewAll}
        >
          <Brain className="h-4 w-4 mr-2" />
          View all recommendations
        </Button>
      </CardContent>
    </Card>
  )
}
