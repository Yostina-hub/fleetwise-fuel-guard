import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import GlowingCard from "./GlowingCard";

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
      <GlowingCard className="h-72" glowColor="primary">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </GlowingCard>
    );
  }

  return (
    <GlowingCard glowColor="primary">
      <h3 className="font-semibold text-lg mb-4">Fleet Status</h3>
      
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statuses}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={50}
                paddingAngle={2}
                dataKey="count"
              >
                {statuses.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-2xl font-bold"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              {totalAssets}
            </motion.span>
            <span className="text-xs text-muted-foreground">Assets</span>
          </div>
        </div>

        <div className="flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="text-left py-1">Asset Status</th>
                <th className="text-right py-1">Assets</th>
                <th className="text-right py-1">Fleet %</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((item, i) => (
                <motion.tr
                  key={item.status}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <td className="py-1.5">
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                      style={{ 
                        borderColor: item.color,
                        color: item.color,
                        backgroundColor: `${item.color}10`
                      }}
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="text-right py-1.5 font-medium">{item.count}</td>
                  <td className="text-right py-1.5" style={{ color: item.color }}>
                    {item.percentage.toFixed(1)}%
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </GlowingCard>
  );
};

export default FleetStatusCard;
