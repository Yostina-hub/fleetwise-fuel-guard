import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Truck, Activity } from "lucide-react";

interface FleetStatusDonutProps {
  vehicles: any[];
  loading?: boolean;
}

const FleetStatusDonut = ({ vehicles, loading }: FleetStatusDonutProps) => {
  const statusData = useMemo(() => {
    const active = vehicles.filter(v => v.status === 'active').length;
    const maintenance = vehicles.filter(v => v.status === 'maintenance').length;
    const inactive = vehicles.filter(v => v.status === 'inactive').length;

    return [
      { name: "Active", value: active, color: "hsl(var(--success))", percentage: vehicles.length > 0 ? (active / vehicles.length * 100) : 0 },
      { name: "Maintenance", value: maintenance, color: "hsl(var(--warning))", percentage: vehicles.length > 0 ? (maintenance / vehicles.length * 100) : 0 },
      { name: "Inactive", value: inactive, color: "hsl(var(--muted-foreground))", percentage: vehicles.length > 0 ? (inactive / vehicles.length * 100) : 0 },
    ];
  }, [vehicles]);

  const activePercentage = vehicles.length > 0 
    ? (vehicles.filter(v => v.status === 'active').length / vehicles.length * 100)
    : 0;

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Fleet Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] bg-muted/50 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-strong">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          Fleet Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                animationDuration={1500}
                animationBegin={0}
              >
                {statusData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="drop-shadow-lg"
                    style={{ filter: `drop-shadow(0 0 6px ${entry.color})` }}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                }}
                formatter={(value: number, name: string) => [`${value} vehicles`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-center"
            >
              <span className="text-3xl font-bold">{vehicles.length}</span>
              <p className="text-xs text-muted-foreground">Total Fleet</p>
            </motion.div>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {statusData.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
              className="text-center p-2 rounded-lg"
              style={{ backgroundColor: `${item.color}10` }}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
              <span className="text-lg font-bold">{item.value}</span>
              <span className="text-xs text-muted-foreground ml-1">
                ({item.percentage.toFixed(0)}%)
              </span>
            </motion.div>
          ))}
        </div>

        {/* Status indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex items-center justify-center gap-2 mt-4 pt-4 border-t"
        >
          <Activity className={`w-4 h-4 ${activePercentage >= 70 ? 'text-success' : activePercentage >= 50 ? 'text-warning' : 'text-destructive'}`} />
          <span className="text-sm">
            Fleet is {activePercentage >= 70 ? 'operating optimally' : activePercentage >= 50 ? 'moderately active' : 'underutilized'}
          </span>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default FleetStatusDonut;
