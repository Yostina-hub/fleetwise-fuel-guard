import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

interface IdleGroup {
  name: string;
  total: string;
  idlePercent: number;
  color: string;
}

interface IdleTimeDonutProps {
  totalIdleTime: string;
  groups: IdleGroup[];
  loading?: boolean;
  idlePercentage?: number;
}

const IdleTimeDonut = ({ totalIdleTime, groups, loading, idlePercentage = 25 }: IdleTimeDonutProps) => {
  const { formattedValue: animatedIdle } = useAnimatedCounter(idlePercentage, { duration: 1500, decimals: 1 });

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

  // Donut data showing idle vs active
  const donutData = [
    { name: "Idle", value: idlePercentage, color: "#f97316" }, // orange
    { name: "Active", value: 100 - idlePercentage, color: "#22c55e" }, // green
  ];

  // Group colors matching reference
  const groupColors = ['#f97316', '#22c55e', '#3b82f6', '#8b5cf6'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1a2332] border border-[#2a3a4d] rounded-lg p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold text-base text-foreground">Idle Time</h3>
        <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/50">
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
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
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={45}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {donutData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-xl font-bold text-foreground"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              key={totalIdleTime}
            >
              {totalIdleTime}
            </motion.span>
            <span className="text-[10px] text-muted-foreground">Hours</span>
          </div>
        </div>

        {/* Groups Table */}
        <div className="flex-1 min-w-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-1 font-medium">Fleet</th>
                <th className="text-center py-1 font-medium">Total</th>
                <th className="text-right py-1 font-medium">Idle %</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, i) => (
                <motion.tr
                  key={group.name}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="border-t border-[#2a3a4d]"
                >
                  <td className="py-2">
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-2 py-0.5 font-normal"
                      style={{ 
                        borderColor: groupColors[i % groupColors.length],
                        color: groupColors[i % groupColors.length],
                        backgroundColor: `${groupColors[i % groupColors.length]}15`
                      }}
                    >
                      {group.name}
                    </Badge>
                  </td>
                  <td className="text-center py-2 text-muted-foreground">{group.total}</td>
                  <td className={`text-right py-2 font-medium ${group.idlePercent > 30 ? 'text-orange-400' : 'text-green-400'}`}>
                    <motion.span
                      key={group.idlePercent}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {group.idlePercent.toFixed(1)}%
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

export default IdleTimeDonut;
