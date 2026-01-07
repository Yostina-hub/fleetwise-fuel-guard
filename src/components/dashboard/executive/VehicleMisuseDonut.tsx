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
  speedingDevice: "#0072BC", // Dark Blue (brand)
  harshBraking: "#f59e0b", // amber
  harshAcceleration: "#ef4444", // red
  excessiveIdle: "#8DC63F", // Lemon Green (brand)
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
      <Card className="bg-card border-border">
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
      transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="bg-card border-border overflow-hidden hover:shadow-lg hover:shadow-warning/10 transition-all duration-500">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-transparent to-destructive/5 pointer-events-none" />
        
        <CardHeader className="pb-2 relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground tracking-tight">
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <Settings2 className="w-5 h-5 text-warning" />
              </motion.div>
              Vehicle Misuse Overview
            </CardTitle>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-muted/50 border-border">
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
                      className="drop-shadow-md"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span 
                className="text-sm text-muted-foreground font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Total
              </motion.span>
              <motion.span 
                className="text-4xl font-bold text-foreground"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              >
                {total.toLocaleString()}
              </motion.span>
            </div>
          </div>

          {/* Enhanced Legend - 2 columns */}
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              { label: 'Speeding (device)', color: COLORS.speedingDevice },
              { label: 'Harsh braking', color: COLORS.harshBraking },
              { label: 'Harsh acceleration', color: COLORS.harshAcceleration },
              { label: 'Excessive idle', color: COLORS.excessiveIdle },
              { label: 'Harsh cornering', color: COLORS.harshCornering },
              { label: 'Speeding (road)', color: COLORS.speedingRoad },
              { label: 'Speeding (platform)', color: COLORS.speedingPlatform },
            ].map((item, index) => (
              <motion.div 
                key={item.label}
                className="flex items-center gap-2 group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                whileHover={{ x: 2 }}
              >
                <motion.div 
                  className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: index * 0.15 }}
                />
                <span className="text-foreground/70 truncate group-hover:text-foreground transition-colors text-xs">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default VehicleMisuseDonut;
