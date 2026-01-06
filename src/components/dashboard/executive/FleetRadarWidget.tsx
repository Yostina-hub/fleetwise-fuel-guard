import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Truck, Power, Wrench, Moon } from "lucide-react";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

interface FleetStatus {
  status: string;
  count: number;
  color: string;
  icon: React.ReactNode;
}

interface FleetRadarWidgetProps {
  statuses: FleetStatus[];
  totalVehicles: number;
  loading?: boolean;
}

const FleetRadarWidget = ({ statuses, totalVehicles, loading }: FleetRadarWidgetProps) => {
  const { formattedValue: animatedTotal } = useAnimatedCounter(totalVehicles, { duration: 1500 });

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-80 rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border/50 flex items-center justify-center"
      >
        <div className="animate-pulse w-48 h-48 rounded-full bg-muted/30" />
      </motion.div>
    );
  }

  const chartData = statuses.map(s => ({
    name: s.status,
    value: s.count,
    color: s.color,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="relative rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 overflow-hidden"
    >
      {/* Radar circles background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2, 3, 4].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border border-primary/10"
            style={{ width: `${ring * 25}%`, height: `${ring * 25}%` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: ring * 0.1, duration: 0.5 }}
          />
        ))}
        
        {/* Scanning line */}
        <motion.div
          className="absolute w-1/2 h-0.5 origin-left"
          style={{ 
            background: 'linear-gradient(90deg, hsl(var(--primary)), transparent)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Fleet Status Radar</h3>
            <p className="text-sm text-muted-foreground">Real-time vehicle distribution</p>
          </div>
          <motion.div 
            className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium"
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Scanning
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Donut Chart */}
          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span 
                className="text-3xl font-bold text-foreground"
                key={totalVehicles}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {animatedTotal}
              </motion.span>
              <span className="text-xs text-muted-foreground">Total Fleet</span>
            </div>
          </div>

          {/* Status list */}
          <div className="flex flex-col justify-center space-y-3">
            {statuses.map((status, index) => (
              <motion.div
                key={status.status}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${status.color}20` }}
                  >
                    <div style={{ color: status.color }}>{status.icon}</div>
                  </div>
                  <span className="text-sm font-medium text-foreground">{status.status}</span>
                </div>
                <motion.span 
                  className="text-lg font-bold text-foreground"
                  key={status.count}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                >
                  {status.count}
                </motion.span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FleetRadarWidget;
