import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";

interface DistanceData {
  time: string;
  [groupName: string]: number | string;
}

interface GroupConfig {
  name: string;
  color: string;
}

interface DistanceByGroupChartProps {
  data: DistanceData[];
  groups: GroupConfig[];
  loading?: boolean;
}

const DistanceByGroupChart = ({ data, groups, loading }: DistanceByGroupChartProps) => {
  if (loading) {
    return (
      <div className="bg-[#1a2332] border border-[#2a3a4d] rounded-lg p-4 lg:col-span-2 h-80">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted/20 rounded w-1/3" />
          <div className="h-56 bg-muted/20 rounded" />
        </div>
      </div>
    );
  }

  // Multi-color scheme matching reference
  const groupColors = [
    '#3b82f6', // blue
    '#22c55e', // green  
    '#f97316', // orange
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#eab308', // yellow
    '#ef4444', // red
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1a2332] border border-[#2a3a4d] rounded-lg shadow-xl p-3"
        >
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs flex items-center gap-2 py-0.5">
              <motion.span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="text-foreground font-medium">{entry.value?.toFixed(1)} km</span>
            </p>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      whileHover={{ borderColor: "rgba(59, 130, 246, 0.4)" }}
      className="bg-[#1a2332] border border-[#2a3a4d] rounded-lg p-4 lg:col-span-2 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
    >
      {/* Header with Legend */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-lg text-white tracking-tight">Distance by Fleet per Hour</h3>
          <Badge variant="outline" className="text-xs bg-green-500/30 text-green-300 border-green-400/60 font-medium">
            <motion.span
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center gap-1.5"
            >
              <motion.span 
                className="w-2 h-2 rounded-full bg-green-400"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              Live
            </motion.span>
          </Badge>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
          {groups.map((group, i) => (
            <motion.div 
              key={group.name} 
              className="flex items-center gap-1"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <motion.div 
                className="w-3 h-0.5" 
                style={{ backgroundColor: groupColors[i % groupColors.length] }}
                animate={{ scaleX: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
              />
              <span className="text-muted-foreground">{group.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-52"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4d" vertical={false} />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={{ stroke: '#2a3a4d' }}
              tickLine={{ stroke: '#2a3a4d' }}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={{ stroke: '#2a3a4d' }}
              tickLine={{ stroke: '#2a3a4d' }}
              label={{ 
                value: 'Distance (km)', 
                angle: -90, 
                position: 'insideLeft', 
                fontSize: 10,
                fill: '#6b7280',
                offset: 10
              }} 
            />
            <Tooltip content={<CustomTooltip />} />
            {groups.map((group, i) => (
              <Line
                key={group.name}
                type="monotone"
                dataKey={group.name}
                stroke={groupColors[i % groupColors.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: groupColors[i % groupColors.length], strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#1a2332' }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* X-axis label */}
      <div className="text-center text-xs text-muted-foreground mt-1">Time</div>
    </motion.div>
  );
};

export default DistanceByGroupChart;
