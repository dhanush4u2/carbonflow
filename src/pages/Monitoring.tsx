import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Leaf, AlertCircle, Plus, Filter, Zap } from "lucide-react";
import { useEmissionLogs, EmissionLog } from "@/hooks/useEmissionLogs";
import { RealtimeEmissionsChart } from "@/components/Monitoring/RealtimeEmissionsChart";
import { cn } from "@/lib/utils";

// This component is updated to allow custom styling for the value
function RealtimeMetric({ title, value, unit, icon: Icon, valueClassName }: { title: string, value: string, unit: string, icon: React.ElementType, valueClassName?: string }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-bold text-foreground", valueClassName)}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground">{unit}</p>
      </CardContent>
    </Card>
  );
}

export function Monitoring() {
  const { logs, loading, error } = useEmissionLogs();
  const [currentEmission, setCurrentEmission] = useState(0);
  const [creditsGenerated, setCreditsGenerated] = useState(0);
  
  // New state to dynamically track the device's online status
  const [deviceStatus, setDeviceStatus] = useState<{
    status: 'Online' | 'Delayed' | 'Offline';
    color: string;
    unit: string;
  }>({ status: 'Offline', color: 'text-muted-foreground', unit: 'Awaiting data...' });

  // Constants for calculation
  const KG_PER_TCO2E = 1000;
  const KG_PER_CREDIT = 1000;

  useEffect(() => {
    // This function checks the time of the last log to determine device status.
    const updateStatus = () => {
      if (logs.length > 0) {
        const latestLog = logs[logs.length - 1];
        setCurrentEmission(latestLog.emission_value_tco2e);
        
        const totalKgEmitted = logs.reduce((sum, log) => sum + (log.emission_value_tco2e * KG_PER_TCO2E), 0);
        const credits = Math.floor(totalKgEmitted / KG_PER_CREDIT);
        setCreditsGenerated(credits);

        const lastLogTime = new Date(latestLog.created_at).getTime();
        const now = new Date().getTime();
        const timeDifferenceMinutes = (now - lastLogTime) / (1000 * 60);

        if (timeDifferenceMinutes < 2) {
          setDeviceStatus({ status: 'Online', color: 'text-success', unit: `${latestLog.source} is active` });
        } else if (timeDifferenceMinutes < 10) {
          setDeviceStatus({ status: 'Delayed', color: 'text-warning', unit: `Last seen ${Math.round(timeDifferenceMinutes)} mins ago` });
        } else {
          setDeviceStatus({ status: 'Offline', color: 'text-destructive', unit: `Last seen ${Math.round(timeDifferenceMinutes)} mins ago` });
        }
      } else if (!loading) {
        setDeviceStatus({ status: 'Offline', color: 'text-destructive', unit: 'No data received' });
      }
    };

    updateStatus();
    
    // Set up an interval to re-check the status every 30 seconds.
    // This ensures the status updates to "Offline" even if no new data arrives.
    const interval = setInterval(updateStatus, 30000);
    return () => clearInterval(interval);

  }, [logs, loading]);

  const latestLogs = logs.slice(-5).reverse();

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Live Emissions Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time data stream from your connected IoT devices.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" disabled>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Add Source
          </Button>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Use a single loading check for all three cards for a cleaner UI */}
        {loading && logs.length === 0 ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : (
          <>
            <RealtimeMetric 
              title="Current Emission Rate" 
              value={currentEmission.toFixed(2)} 
              unit="kg CO₂e / hour"
              icon={Activity}
            />
            <RealtimeMetric 
              title="Credits Generated (Today)" 
              value={creditsGenerated.toLocaleString()} 
              unit="Carbon Credits"
              icon={Leaf}
            />
            {/* The new dynamic status card */}
            <RealtimeMetric 
              title="Device Status" 
              value={deviceStatus.status} 
              unit={deviceStatus.unit}
              icon={Zap}
              valueClassName={deviceStatus.color}
            />
          </>
        )}
      </div>

      {/* Real-time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Live Emissions Feed</CardTitle>
          <CardDescription>
            Visualizing real-time tCO₂e values from your primary sensor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && logs.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">Loading initial data stream...</p>
            </div>
          ) : error ? (
            <div className="h-[300px] flex items-center justify-center text-destructive">
               <AlertCircle className="h-5 w-5 mr-2" />
              <p>{error}</p>
            </div>
          ) : (
            <RealtimeEmissionsChart data={logs} />
          )}
        </CardContent>
      </Card>
      
      {/* Recent Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Emission Logs</CardTitle>
          <CardDescription>A log of the 5 most recent readings from your IoT device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading && logs.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : latestLogs.length > 0 ? (
              latestLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{log.source}</Badge>
                    <p>
                      <span className="font-semibold text-foreground">{log.emission_value_tco2e.toFixed(2)}</span>
                      <span className="text-muted-foreground"> tCO₂e detected.</span>
                    </p>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">Awaiting first emission log...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

