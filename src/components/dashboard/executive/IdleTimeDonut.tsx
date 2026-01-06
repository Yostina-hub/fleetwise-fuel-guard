import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import GlowingCard from "./GlowingCard";

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
}

const IdleTimeDonut = ({ totalIdleTime, groups, loading }: IdleTimeDonutProps) => {
  if (loading) {
    return (
      <GlowingCard className="h-72" glowColor="warning">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </GlowingCard>
    );
  }

  const donutData = [
    { name: "Idle", value: 25, color: "hsl(var(--warning))" },
    { name: "Active", value: 75, color: "hsl(var(--success))" },
  ];

  return (
    <GlowingCard glowColor="warning">
      <h3 className="font-semibold text-lg mb-4">Idle Time</h3>
      
      <div className="flex items-start gap-4">
        <div className="relative w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={50}
                paddingAngle={2}
                dataKey="value"
              >
                {donutData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-xl font-bold"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              {totalIdleTime}
            </motion.span>
            <span className="text-xs text-muted-foreground">Hours</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="text-xs text-muted-foreground mb-2 grid grid-cols-3 gap-2 font-medium">
            <span>Group</span>
            <span className="text-right">Total</span>
            <span className="text-right">Idle %</span>
          </div>
          {groups.map((group, i) => (
            <motion.div
              key={group.name}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="grid grid-cols-3 gap-2 text-sm items-center"
            >
              <div className="flex items-center gap-1.5">
                <span 
                  className="w-2 h-2 rounded-sm flex-shrink-0" 
                  style={{ backgroundColor: group.color }} 
                />
                <span className="truncate">{group.name}</span>
              </div>
              <span className="text-right text-muted-foreground">{group.total}</span>
              <span className={`text-right font-medium ${group.idlePercent > 30 ? 'text-destructive' : 'text-success'}`}>
                {group.idlePercent.toFixed(1)}%
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </GlowingCard>
  );
};

export default IdleTimeDonut;
