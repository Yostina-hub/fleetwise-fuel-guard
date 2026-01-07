import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

interface VehicleMisuseDonutProps {
  data: {
    speedingDevice: number;
    harshBraking: number;
    harshAcceleration: number;
    excessiveIdle: number;
    harshCornering: number;
    speedingRoad: number;
    speedingPlatform: number;
  };
  loading?: boolean;
}

const COLORS = {
  speedingDevice: "#22d3ee", // cyan
  harshBraking: "#f59e0b", // amber
  harshAcceleration: "#ef4444", // red
  excessiveIdle: "#7c3aed", // purple
  harshCornering: "#14b8a6", // teal
  speedingRoad: "#fb923c", // orange light
  speedingPlatform: "#be185d", // pink
};

export const VehicleMisuseDonut = ({ data, loading }: VehicleMisuseDonutProps) => {
  const [period, setPeriod] = useState("last_7_days");

  const total = useMemo(() => 
    Object.values(data).reduce((sum, val) => sum + val, 0),
    [data]
  );

  const chartData = useMemo(() => [
    { name: "Speeding (device)", value: data.speedingDevice, color: COLORS.speedingDevice },
    { name: "harsh braking", value: data.harshBraking, color: COLORS.harshBraking },
    { name: "harsh acceleration", value: data.harshAcceleration, color: COLORS.harshAcceleration },
    { name: "excessive idle", value: data.excessiveIdle, color: COLORS.excessiveIdle },
    { name: "harsh cornering", value: data.harshCornering, color: COLORS.harshCornering },
    { name: "Speeding (road speed)", value: data.speedingRoad, color: COLORS.speedingRoad },
    { name: "Speeding (platform)", value: data.speedingPlatform, color: COLORS.speedingPlatform },
  ].filter(item => item.value > 0), [data]);

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
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              Vehicle Misuse Overview
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

          {/* Legend - 2 columns */}
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.speedingDevice }} />
              <span className="text-muted-foreground truncate">Speeding (device)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.harshBraking }} />
              <span className="text-muted-foreground truncate">harsh braking</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.harshAcceleration }} />
              <span className="text-muted-foreground truncate">harsh acceleration</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.excessiveIdle }} />
              <span className="text-muted-foreground truncate">excessive idle</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.harshCornering }} />
              <span className="text-muted-foreground truncate">harsh cornering</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.speedingRoad }} />
              <span className="text-muted-foreground truncate">Speeding (road speed)</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.speedingPlatform }} />
              <span className="text-muted-foreground truncate">Speeding (platform)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default VehicleMisuseDonut;
