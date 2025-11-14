import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Clock, MapPin, Activity, Calendar } from "lucide-react";

interface TrafficFlowAnalysisProps {
  organizationId: string;
}

interface HourlyActivity {
  hour: number;
  count: number;
  avgSpeed: number;
}

interface RouteSegment {
  start: string;
  end: string;
  count: number;
  avgSpeed: number;
  distance: number;
}

interface PeriodComparison {
  period: string;
  totalTrips: number;
  totalDistance: number;
  avgSpeed: number;
  peakHour: number;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const TrafficFlowAnalysis = ({ organizationId }: TrafficFlowAnalysisProps) => {
  const [timeRange, setTimeRange] = useState("7"); // days
  const [loading, setLoading] = useState(false);
  const [hourlyData, setHourlyData] = useState<HourlyActivity[]>([]);
  const [topRoutes, setTopRoutes] = useState<RouteSegment[]>([]);
  const [periodComparison, setPeriodComparison] = useState<PeriodComparison[]>([]);
  const [peakHour, setPeakHour] = useState<number>(0);

  useEffect(() => {
    fetchTrafficData();
  }, [organizationId, timeRange]);

  const fetchTrafficData = async () => {
    setLoading(true);
    try {
      const days = parseInt(timeRange);
      const cutoffTime = new Date();
      cutoffTime.setDate(cutoffTime.getDate() - days);

      // Fetch telemetry data
      const { data, error } = await supabase
        .from("vehicle_telemetry")
        .select("latitude, longitude, speed_kmh, created_at, vehicle_id")
        .eq("organization_id", organizationId)
        .gte("created_at", cutoffTime.toISOString())
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Process hourly activity
      const hourlyMap = new Map<number, { count: number; totalSpeed: number }>();
      for (let i = 0; i < 24; i++) {
        hourlyMap.set(i, { count: 0, totalSpeed: 0 });
      }

      data?.forEach((point: any) => {
        const hour = new Date(point.created_at).getHours();
        const current = hourlyMap.get(hour)!;
        current.count++;
        current.totalSpeed += point.speed_kmh || 0;
      });

      const hourlyActivity: HourlyActivity[] = Array.from(hourlyMap.entries()).map(([hour, stats]) => ({
        hour,
        count: stats.count,
        avgSpeed: stats.count > 0 ? stats.totalSpeed / stats.count : 0
      }));

      setHourlyData(hourlyActivity);

      // Find peak hour
      const peak = hourlyActivity.reduce((max, curr) => curr.count > max.count ? curr : max, hourlyActivity[0]);
      setPeakHour(peak.hour);

      // Process routes (group consecutive points into segments)
      const routeMap = new Map<string, { count: number; totalSpeed: number; totalDistance: number }>();
      
      // Group data by vehicle
      const vehicleData = new Map<string, any[]>();
      data?.forEach((point: any) => {
        if (!vehicleData.has(point.vehicle_id)) {
          vehicleData.set(point.vehicle_id, []);
        }
        vehicleData.get(point.vehicle_id)!.push(point);
      });

      // Process each vehicle's path
      vehicleData.forEach((points) => {
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          
          // Calculate distance
          const distance = Math.sqrt(
            Math.pow(p2.longitude - p1.longitude, 2) + 
            Math.pow(p2.latitude - p1.latitude, 2)
          ) * 111.32; // Convert to km

          // Only consider segments over 100m
          if (distance > 0.1) {
            // Create route key (rounded to identify similar routes)
            const startKey = `${Math.round(p1.latitude * 100) / 100},${Math.round(p1.longitude * 100) / 100}`;
            const endKey = `${Math.round(p2.latitude * 100) / 100},${Math.round(p2.longitude * 100) / 100}`;
            const routeKey = `${startKey}->${endKey}`;

            const current = routeMap.get(routeKey) || { count: 0, totalSpeed: 0, totalDistance: 0 };
            current.count++;
            current.totalSpeed += (p1.speed_kmh || 0);
            current.totalDistance += distance;
            routeMap.set(routeKey, current);
          }
        }
      });

      // Get top 10 routes
      const routes: RouteSegment[] = Array.from(routeMap.entries())
        .map(([key, stats]) => {
          const [start, end] = key.split('->');
          return {
            start,
            end,
            count: stats.count,
            avgSpeed: stats.count > 0 ? stats.totalSpeed / stats.count : 0,
            distance: stats.totalDistance / stats.count
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTopRoutes(routes);

      // Period comparison (compare current period with previous periods)
      await fetchPeriodComparison(days);

    } catch (error) {
      console.error("Error fetching traffic data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriodComparison = async (days: number) => {
    try {
      const periods = [
        { name: "Current", offset: 0 },
        { name: "Previous", offset: days },
        { name: "2 Periods Ago", offset: days * 2 }
      ];

      const comparisons: PeriodComparison[] = [];

      for (const period of periods) {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - (period.offset + days));
        const endTime = new Date();
        endTime.setDate(endTime.getDate() - period.offset);

        const { data, error } = await supabase
          .from("vehicle_telemetry")
          .select("speed_kmh, created_at, latitude, longitude")
          .eq("organization_id", organizationId)
          .gte("created_at", startTime.toISOString())
          .lt("created_at", endTime.toISOString())
          .not("latitude", "is", null)
          .not("longitude", "is", null);

        if (error) throw error;

        // Calculate stats
        const hourlyMap = new Map<number, number>();
        let totalSpeed = 0;
        let totalDistance = 0;
        const points = data || [];

        points.forEach((point: any, index: number) => {
          const hour = new Date(point.created_at).getHours();
          hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
          totalSpeed += point.speed_kmh || 0;

          // Calculate distance
          if (index > 0) {
            const prev = points[index - 1];
            const dist = Math.sqrt(
              Math.pow(point.longitude - prev.longitude, 2) + 
              Math.pow(point.latitude - prev.latitude, 2)
            ) * 111.32;
            totalDistance += dist;
          }
        });

        const peakHour = Array.from(hourlyMap.entries())
          .reduce((max, [hour, count]) => count > max.count ? { hour, count } : max, { hour: 0, count: 0 }).hour;

        comparisons.push({
          period: period.name,
          totalTrips: points.length,
          totalDistance: totalDistance,
          avgSpeed: points.length > 0 ? totalSpeed / points.length : 0,
          peakHour
        });
      }

      setPeriodComparison(comparisons);
    } catch (error) {
      console.error("Error fetching period comparison:", error);
    }
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const formatCoordinate = (coord: string) => {
    const [lat, lng] = coord.split(',');
    return `${parseFloat(lat).toFixed(2)}°, ${parseFloat(lng).toFixed(2)}°`;
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Traffic Flow Analysis</h2>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 Hours</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Peak Hour</span>
            </div>
            <div className="text-2xl font-bold">{formatHour(peakHour)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {hourlyData.find(h => h.hour === peakHour)?.count || 0} activities
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Activity</span>
            </div>
            <div className="text-2xl font-bold">
              {hourlyData.reduce((sum, h) => sum + h.count, 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">data points</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Top Routes</span>
            </div>
            <div className="text-2xl font-bold">{topRoutes.length}</div>
            <div className="text-xs text-muted-foreground mt-1">identified</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Avg Speed</span>
            </div>
            <div className="text-2xl font-bold">
              {(hourlyData.reduce((sum, h) => sum + h.avgSpeed * h.count, 0) / 
                hourlyData.reduce((sum, h) => sum + h.count, 0) || 0).toFixed(1)} km/h
            </div>
            <div className="text-xs text-muted-foreground mt-1">overall average</div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="hourly" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hourly">Peak Hours</TabsTrigger>
            <TabsTrigger value="routes">Busiest Routes</TabsTrigger>
            <TabsTrigger value="comparison">Period Comparison</TabsTrigger>
          </TabsList>

          {/* Hourly Activity */}
          <TabsContent value="hourly" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activity by Hour of Day
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={formatHour}
                    label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    label={{ value: 'Activity Count', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    label={{ value: 'Avg Speed (km/h)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip 
                    labelFormatter={formatHour}
                    formatter={(value: number, name: string) => [
                      name === 'count' ? value.toLocaleString() : value.toFixed(1),
                      name === 'count' ? 'Activities' : 'Avg Speed (km/h)'
                    ]}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Activity Count" />
                  <Bar yAxisId="right" dataKey="avgSpeed" fill="#22c55e" name="Avg Speed" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-3">Busiest Hours</h4>
                <div className="space-y-2">
                  {hourlyData
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
                    .map((hour, index) => (
                      <div key={hour.hour} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="font-medium">{formatHour(hour.hour)}</span>
                        </div>
                        <span className="text-muted-foreground">{hour.count.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-3">Quietest Hours</h4>
                <div className="space-y-2">
                  {hourlyData
                    .sort((a, b) => a.count - b.count)
                    .slice(0, 5)
                    .map((hour, index) => (
                      <div key={hour.hour} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="font-medium">{formatHour(hour.hour)}</span>
                        </div>
                        <span className="text-muted-foreground">{hour.count.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Top Routes */}
          <TabsContent value="routes" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Most Traveled Route Segments
              </h3>
              <div className="space-y-3">
                {topRoutes.map((route, index) => (
                  <Card key={index} className="p-4 bg-muted/30">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary">{index + 1}</Badge>
                        <div className="text-sm font-medium">Route Segment</div>
                      </div>
                      <Badge variant="secondary">{route.count} trips</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1">Start</div>
                        <div className="font-mono text-xs">{formatCoordinate(route.start)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">End</div>
                        <div className="font-mono text-xs">{formatCoordinate(route.end)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Avg Speed</div>
                        <div className="font-medium">{route.avgSpeed.toFixed(1)} km/h</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Avg Distance</div>
                        <div className="font-medium">{route.distance.toFixed(2)} km</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Period Comparison */}
          <TabsContent value="comparison" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Traffic Comparison Across Periods
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={periodComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis 
                    yAxisId="left"
                    label={{ value: 'Total Trips', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    label={{ value: 'Distance (km)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      name === 'totalTrips' ? 'Total Trips' : 
                      name === 'totalDistance' ? 'Distance (km)' : 'Avg Speed (km/h)'
                    ]}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="totalTrips" fill="#3b82f6" name="Total Trips" />
                  <Bar yAxisId="right" dataKey="totalDistance" fill="#22c55e" name="Distance (km)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {periodComparison.map((period, index) => (
                <Card key={period.period} className="p-4" style={{ borderColor: COLORS[index] }}>
                  <h4 className="font-semibold mb-3">{period.period} Period</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Trips</span>
                      <span className="font-medium">{period.totalTrips.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Distance</span>
                      <span className="font-medium">{period.totalDistance.toFixed(1)} km</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Speed</span>
                      <span className="font-medium">{period.avgSpeed.toFixed(1)} km/h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Peak Hour</span>
                      <span className="font-medium">{formatHour(period.peakHour)}</span>
                    </div>
                  </div>
                  
                  {index === 0 && periodComparison.length > 1 && (
                    <div className="mt-4 pt-3 border-t space-y-1">
                      <div className="text-xs text-muted-foreground mb-1">vs Previous Period</div>
                      {periodComparison[1] && (
                        <>
                          <div className="flex justify-between text-xs">
                            <span>Trips</span>
                            <span className={period.totalTrips > periodComparison[1].totalTrips ? 'text-green-600' : 'text-red-600'}>
                              {((period.totalTrips - periodComparison[1].totalTrips) / periodComparison[1].totalTrips * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>Distance</span>
                            <span className={period.totalDistance > periodComparison[1].totalDistance ? 'text-green-600' : 'text-red-600'}>
                              {((period.totalDistance - periodComparison[1].totalDistance) / periodComparison[1].totalDistance * 100).toFixed(1)}%
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            Loading traffic flow data...
          </div>
        )}
      </div>
    </Card>
  );
};
