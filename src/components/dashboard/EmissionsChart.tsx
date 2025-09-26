import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils" // Import a class name utility

const emissionsData = [
  { date: "Jan", emissions: 1200, target: 1300 },
  { date: "Feb", emissions: 1180, target: 1280 },
  { date: "Mar", emissions: 1220, target: 1260 },
  { date: "Apr", emissions: 1160, target: 1240 },
  { date: "May", emissions: 1140, target: 1220 },
  { date: "Jun", emissions: 1247, target: 1200 },
]

// 👇 1. Define an interface for the component's props
interface EmissionsChartProps {
  className?: string;
}

// 👇 2. Update the function to accept the props
export function EmissionsChart({ className }: EmissionsChartProps) {
  return (
    // 👇 3. Apply the passed className and remove the hardcoded `col-span-4`
    <Card className={cn("shadow-none", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Emissions Tracking
            </CardTitle>
            <CardDescription>
              Monthly GHG emissions vs. reduction targets (tCO₂e)
            </CardDescription>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-primary mr-2"></div>
              Actual Emissions
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-secondary mr-2"></div>
              Target Limit
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={emissionsData}>
            <defs>
              <linearGradient id="emissionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="date" 
              className="text-muted-foreground"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-muted-foreground"
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Area
              type="monotone"
              dataKey="target"
              stroke="hsl(var(--secondary))"
              fillOpacity={1}
              fill="url(#targetGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="emissions"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#emissionsGradient)"
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}