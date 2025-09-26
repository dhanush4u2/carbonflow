import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { EmissionLog } from "@/hooks/useEmissionLogs";

interface RealtimeEmissionsChartProps {
  data: EmissionLog[];
}

// A simple utility to format the date for the chart's x-axis
const formatXAxis = (tickItem: string) => {
  return new Date(tickItem).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function RealtimeEmissionsChart({ data }: RealtimeEmissionsChartProps) {
  // Only show the last 50 data points to keep the chart clean
  const chartData = data.slice(-50);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorEmissions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="created_at"
          tickFormatter={formatXAxis}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
        />
        <YAxis 
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          domain={['dataMin - 5', 'dataMax + 5']}
        />
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))'
          }}
          labelFormatter={formatXAxis}
        />
        <Area 
          type="monotone" 
          dataKey="emission_value_tco2e" 
          stroke="hsl(var(--primary))" 
          fillOpacity={1} 
          fill="url(#colorEmissions)" 
          strokeWidth={2}
          isAnimationActive={false} // Disable animation for smoother real-time updates
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
