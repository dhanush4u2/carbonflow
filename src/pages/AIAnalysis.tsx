import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, Sparkles, TrendingDown, Lightbulb, Zap, Leaf, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface UserData {
  totalEmissions: number
  availableCredits: number
  monthlyHistory: Array<{
    month: string
    currentYear: number
    previousYear: number
    target: number
  }>
  recentLogs: Array<{
    source: string
    value: number
    date: string
  }>
}

interface AIInsight {
  category: 'efficiency' | 'reduction' | 'market' | 'compliance'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  recommendation: string
  potentialSavings?: string
}

export function AIAnalysis() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [compact, setCompact] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user])

  const fetchUserData = async () => {
    if (!user) return
    try {
      setLoading(true)
      const { data: metrics } = await supabase.from('dashboard_metrics').select('total_ghg_emissions, available_credits').eq('id', user.id).single()
      const { data: history } = await supabase.from('monthly_emissions_history').select('month, current_year_emissions, previous_year_emissions, target_emissions').eq('user_id', user.id).order('month', { ascending: false }).limit(6)
      const { data: logs } = await supabase.from('emission_monitoring_logs').select('source, emission_value_tco2e, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)

      const formattedUserData: UserData = {
        totalEmissions: metrics?.total_ghg_emissions || 0,
        availableCredits: metrics?.available_credits || 0,
        monthlyHistory: history?.map(h => ({ month: new Date(h.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), currentYear: h.current_year_emissions || 0, previousYear: h.previous_year_emissions || 0, target: h.target_emissions || 0 })) || [],
        recentLogs: logs?.map(l => ({ source: l.source, value: l.emission_value_tco2e || 0, date: new Date(l.created_at).toLocaleDateString() })) || []
      }
      setUserData(formattedUserData)
    } catch (error) {
      console.error('Error fetching user data:', error)
      toast({ title: "Data Fetch Error", description: "Failed to fetch your initial data for analysis.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const analyzeData = async (data: UserData) => {
    if (!data) return
    setAnalyzing(true)
    try {
      const { data: insights, error } = await supabase.functions.invoke('analyze-emissions', {
        body: { userData: data },
      })
      if (error) throw error
      setInsights(insights)
      toast({ title: "Analysis Complete", description: "AI insights have been successfully generated." })
    } catch (error: any) {
      console.error('Error analyzing data:', error)
      toast({ title: "Analysis Failed", description: error.message, variant: "destructive" })
    } finally {
      setAnalyzing(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'efficiency': return Zap
      case 'reduction': return TrendingDown
      case 'market': return Brain
      case 'compliance': return Leaf
      default: return Lightbulb
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-success/10 text-success border-success/20'
      case 'medium': return 'bg-warning/10 text-warning border-warning/20'
      case 'low': return 'bg-muted/10 text-muted-foreground border-border'
      default: return 'bg-muted/10 text-muted-foreground border-border'
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading your data...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">AI-Powered Insights</h1>
          <p className="text-sm text-muted-foreground">
            Smart recommendations powered by machine learning analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setCompact((v) => !v)}
            className="gap-2"
          >
            {compact ? 'Expanded view' : 'Compact view'}
          </Button>
          <Button 
            onClick={() => userData && analyzeData(userData)}
            disabled={analyzing || !userData}
            className="gap-2"
          >
            {analyzing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Re-analyze
              </>
            )}
          </Button>
        </div>
      </div>

      {userData && (
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="shadow-none">
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground">Total Emissions</div>
              <div className="text-xl font-semibold leading-tight">{userData.totalEmissions.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">tCO₂e</span></div>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground">Available Credits</div>
              <div className="text-xl font-semibold leading-tight text-success">{userData.availableCredits.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">credits</span></div>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground">Data Sources</div>
              <div className="text-xl font-semibold leading-tight">{userData.recentLogs.length} <span className="text-xs font-normal text-muted-foreground">active</span></div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className={`grid ${compact ? 'gap-4' : 'gap-6'} md:grid-cols-2`}>
        {insights.map((insight, index) => {
          const IconComponent = getCategoryIcon(insight.category)
          return (
            <Card key={index} className="shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <IconComponent className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className={`${compact ? 'text-sm' : 'text-base'} font-semibold`}>{insight.title}</CardTitle>
                      <Badge 
                        variant="outline" 
                        className={`${getImpactColor(insight.impact)} text-[10px] ${compact ? 'px-1.5 py-0.5' : ''}`}
                      >
                        {insight.impact} impact
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className={`space-y-3 ${compact ? 'pt-0' : ''}`}>
                <p className={`${compact ? 'text-sm' : 'text-base'} text-muted-foreground leading-relaxed`}>
                  {insight.description}
                </p>
                <div className={`rounded-md ${compact ? 'bg-muted/40' : 'bg-accent/50'} p-3`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Recommendation</span>
                  </div>
                  <p className={`${compact ? 'text-sm' : 'text-base'} text-foreground`}>
                    {insight.recommendation}
                  </p>
                  {insight.potentialSavings && (
                    <div className="mt-1.5 text-xs text-success font-medium">
                      {insight.potentialSavings}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {insights.length === 0 && !analyzing && (
        <Card className="text-center py-8">
          <CardContent>
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No insights available</h3>
            <p className="text-muted-foreground mb-4">
              Click "Re-analyze" to generate AI-powered insights based on your current data
            </p>
            <Button 
              onClick={() => userData && analyzeData(userData)}
              disabled={!userData}
            >
              Generate Insights
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}