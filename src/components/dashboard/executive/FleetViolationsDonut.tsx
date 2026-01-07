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
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="bg-[#1a2332] border-[#2a3a4d] relative overflow-hidden hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-500">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground z-10"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <CardHeader className="pb-2 relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-white tracking-tight">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Settings2 className="w-5 h-5 text-cyan-400" />
              </motion.div>
              Fleet Violations
            </CardTitle>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-background/50 border-border/50">
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

        <CardContent className="pt-0 relative">
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className="drop-shadow-lg"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Text with glow */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span 
                className="text-sm text-white/70 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Total
              </motion.span>
              <motion.span 
                className="text-4xl font-bold text-white drop-shadow-lg"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              >
                {total.toLocaleString()}
              </motion.span>
            </div>
          </div>

          {/* Enhanced Legend */}
          <div className="mt-4 space-y-2.5">
            {[
              { key: 'overSpeeds', label: 'OverSpeeds', color: COLORS.overSpeeds, value: percentages.overSpeeds },
              { key: 'alerts', label: 'Alerts', color: COLORS.alerts, value: percentages.alerts },
              { key: 'harshBehavior', label: 'Harsh Behavior', color: COLORS.harshBehavior, value: percentages.harshBehavior },
              { key: 'noGoKeepIn', label: 'NO-Go/Keep In', color: COLORS.noGoKeepIn, value: percentages.noGoKeepIn },
            ].map((item, index) => (
              <motion.div 
                key={item.key}
                className="flex items-center gap-2 group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ x: 4 }}
              >
                <motion.div 
                  className="w-3 h-3 rounded-sm shadow-lg"
                  style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}40` }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                />
                <span className="text-sm text-white/80 group-hover:text-white transition-colors">{item.label}</span>
                <span className="text-sm font-bold ml-auto text-white">{item.value}%</span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default FleetViolationsDonut;
