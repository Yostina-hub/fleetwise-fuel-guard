import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface FleetViolationsDonutProps {
  data: {
    overSpeeds: number;
    alerts: number;
    harshBehavior: number;
    noGoKeepIn: number;
  };
  loading?: boolean;
}

const COLORS = {
  overSpeeds: "#22d3ee", // cyan
  alerts: "#f59e0b", // amber/orange
  harshBehavior: "#ef4444", // red
  noGoKeepIn: "#a855f7", // purple
};

export const FleetViolationsDonut = ({ data, loading }: FleetViolationsDonutProps) => {
  const [period, setPeriod] = useState("last_7_days");

  const total = useMemo(() => 
    data.overSpeeds + data.alerts + data.harshBehavior + data.noGoKeepIn,
    [data]
  );

  const chartData = useMemo(() => [
    { name: "OverSpeeds", value: data.overSpeeds, color: COLORS.overSpeeds },
    { name: "Alerts", value: data.alerts, color: COLORS.alerts },
    { name: "Harsh Behavior", value: data.harshBehavior, color: COLORS.harshBehavior },
    { name: "NO-Go/Keep In", value: data.noGoKeepIn, color: COLORS.noGoKeepIn },
  ], [data]);

  const percentages = useMemo(() => ({
    overSpeeds: total > 0 ? ((data.overSpeeds / total) * 100).toFixed(1) : "0",
    alerts: total > 0 ? ((data.alerts / total) * 100).toFixed(1) : "0",
    harshBehavior: total > 0 ? ((data.harshBehavior / total) * 100).toFixed(1) : "0",
    noGoKeepIn: total > 0 ? ((data.noGoKeepIn / total) * 100).toFixed(1) : "0",
  }), [data, total]);

  if (loading) {
    return (
      <Card className="bg-card border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/2" />
            <div className="h-48 bg-muted rounded-full w-48 mx-auto" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-card border-border/50 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              Fleet Violations
            </CardTitle>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-3xl font-bold text-foreground">{total.toLocaleString()}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.overSpeeds }} />
              <span className="text-sm text-muted-foreground">OverSpeeds</span>
              <span className="text-sm font-medium ml-auto">{percentages.overSpeeds}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.alerts }} />
              <span className="text-sm text-muted-foreground">Alerts</span>
              <span className="text-sm font-medium ml-auto">{percentages.alerts}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.harshBehavior }} />
              <span className="text-sm text-muted-foreground">Harsh Behavior</span>
              <span className="text-sm font-medium ml-auto">{percentages.harshBehavior}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.noGoKeepIn }} />
              <span className="text-sm text-muted-foreground">NO-Go/Keep In</span>
              <span className="text-sm font-medium ml-auto">{percentages.noGoKeepIn}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default FleetViolationsDonut;
