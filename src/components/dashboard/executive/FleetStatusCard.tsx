import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";

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
      <h3 className="font-semibold text-base mb-4 text-foreground">Fleet Status</h3>
      
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
            >
              {totalAssets}
            </motion.span>
            <span className="text-[10px] text-muted-foreground">Assets</span>
          </div>
        </div>

        {/* Status Table */}
        <div className="flex-1 min-w-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-1 font-medium">Asset Status</th>
                <th className="text-center py-1 font-medium">Assets</th>
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
                      {item.status}
                    </Badge>
                  </td>
                  <td className="text-center py-2 text-foreground">{item.count}</td>
                  <td className="text-right py-2" style={{ color: statusColors[item.status] || item.color }}>
                    {item.percentage.toFixed(1)}%
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
