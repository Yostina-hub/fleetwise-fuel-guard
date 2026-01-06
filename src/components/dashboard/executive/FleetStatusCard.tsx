import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

interface StatusItem {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

interface FleetStatusCardProps {
  totalAssets: number;
  statuses: StatusItem[];
  loading?: boolean;
}

const FleetStatusCard = ({ totalAssets, statuses, loading }: FleetStatusCardProps) => {
  const { formattedValue: animatedTotal } = useAnimatedCounter(totalAssets, { duration: 1500 });

  if (loading) {
    return (
      <div className="bg-[#1a2332] border border-[#2a3a4d] rounded-lg p-4 h-72">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted/20 rounded w-1/3" />
          <div className="h-48 bg-muted/20 rounded" />
        </div>
      </div>
    );
  }

  // Colors matching the reference
  const statusColors: Record<string, string> = {
    'Active': '#22c55e',
    'Stop/Idle': '#eab308', 
    'Inactive': '#ef4444',
    'Moving': '#22c55e',
    'Parked': '#3b82f6',
    'Offline': '#6b7280',
  };

  const chartData = statuses.map(s => ({
    ...s,
    color: statusColors[s.status] || s.color
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1a2332] border border-[#2a3a4d] rounded-lg p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold text-base text-foreground">Fleet Status</h3>
        <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400 border-green-500/50">
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </motion.span>
        </Badge>
      </div>
      
      <div className="flex items-start gap-4">
        {/* Donut Chart */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={45}
                paddingAngle={2}
                dataKey="count"
                startAngle={90}
                endAngle={-270}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-2xl font-bold text-foreground"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              key={totalAssets}
            >
              {animatedTotal}
            </motion.span>
            <span className="text-[10px] text-muted-foreground">Vehicles</span>
          </div>
        </div>

        {/* Status Table */}
        <div className="flex-1 min-w-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-1 font-medium">Status</th>
                <th className="text-center py-1 font-medium">Count</th>
                <th className="text-right py-1 font-medium">Fleet %</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((item, i) => (
                <motion.tr
                  key={item.status}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="border-t border-[#2a3a4d]"
                >
                  <td className="py-2">
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-2 py-0.5 font-normal"
                      style={{ 
                        borderColor: statusColors[item.status] || item.color,
                        color: statusColors[item.status] || item.color,
                        backgroundColor: `${statusColors[item.status] || item.color}15`
                      }}
                    >
                      <motion.span
                        className="inline-flex items-center gap-1"
                      >
                        <motion.span 
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: statusColors[item.status] || item.color }}
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        {item.status}
                      </motion.span>
                    </Badge>
                  </td>
                  <td className="text-center py-2 text-foreground">
                    <motion.span
                      key={item.count}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {item.count}
                    </motion.span>
                  </td>
                  <td className="text-right py-2" style={{ color: statusColors[item.status] || item.color }}>
                    <motion.span
                      key={item.percentage}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {item.percentage.toFixed(1)}%
                    </motion.span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default FleetStatusCard;
