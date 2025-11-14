import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Satellite, MapPin } from "lucide-react";
import { format } from "date-fns";

interface GpsSignalHistoryChartProps {
  vehicleId: string;
  hours?: number;
}

export const GpsSignalHistoryChart = ({ vehicleId, hours = 24 }: GpsSignalHistoryChartProps) => {
  const { data: historyData, isLoading } = useQuery({
    queryKey: ["gps-signal-history", vehicleId, hours],
    queryFn: async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hours);

      const { data, error } = await supabase
        .from("vehicle_telemetry")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .gte("created_at", startTime.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      return data?.map((item) => ({
        timestamp: new Date(item.created_at).getTime(),
        time: format(new Date(item.created_at), "HH:mm"),
        fullTime: format(new Date(item.created_at), "MMM dd, HH:mm:ss"),
        signalStrength: item.gps_signal_strength || 0,
        satellites: item.gps_satellites_count || 0,
        hdop: item.gps_hdop || 0,
        latitude: item.latitude,
        longitude: item.longitude,
        fixType: item.gps_fix_type,
        location: item.latitude && item.longitude 
          ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}` 
          : "No coordinates",
      })) || [];
    },
    enabled: !!vehicleId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const chartConfig = {
    signalStrength: {
      label: "Signal Strength",
      color: "hsl(var(--chart-1))",
    },
    satellites: {
      label: "Satellites",
      color: "hsl(var(--chart-2))",
    },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Satellite className="h-5 w-5" />
            GPS Signal History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Loading signal history...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!historyData || historyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Satellite className="h-5 w-5" />
            GPS Signal History
          </CardTitle>
          <CardDescription>Last {hours} hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No GPS signal data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Satellite className="h-5 w-5" />
          GPS Signal History
        </CardTitle>
        <CardDescription>
          Signal strength and satellite count over the last {hours} hours
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                yAxisId="left"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                label={{ 
                  value: 'Signal %', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: "hsl(var(--muted-foreground))" }
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                label={{ 
                  value: 'Satellites', 
                  angle: 90, 
                  position: 'insideRight',
                  style: { fill: "hsl(var(--muted-foreground))" }
                }}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-card p-3 shadow-md">
                        <div className="text-sm font-medium mb-2">{data.fullTime}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Signal:</span>
                            <span className="font-medium" style={{ color: chartConfig.signalStrength.color }}>
                              {data.signalStrength}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Satellites:</span>
                            <span className="font-medium" style={{ color: chartConfig.satellites.color }}>
                              {data.satellites}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">HDOP:</span>
                            <span className="font-medium">{data.hdop.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Fix:</span>
                            <span className="font-medium capitalize">{data.fixType?.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-start gap-2 mt-2 pt-2 border-t">
                            <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{data.location}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="line"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="signalStrength"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={false}
                name="Signal Strength (%)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="satellites"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
                name="Satellite Count"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
