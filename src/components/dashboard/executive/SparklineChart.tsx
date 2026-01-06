import { useMemo } from "react";
import { motion } from "framer-motion";

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showGradient?: boolean;
  animated?: boolean;
}

const SparklineChart = ({
  data,
  width = 120,
  height = 40,
  color = "hsl(var(--primary))",
  showGradient = true,
  animated = true,
}: SparklineChartProps) => {
  const { path, areaPath, points } = useMemo(() => {
    if (!data.length) return { path: "", areaPath: "", points: [] };
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;
    
    const calcPoints = data.map((value, index) => ({
      x: (index / (data.length - 1)) * (width - padding * 2) + padding,
      y: height - padding - ((value - min) / range) * (height - padding * 2),
    }));
    
    // Create smooth curve path
    let linePath = `M ${calcPoints[0].x} ${calcPoints[0].y}`;
    for (let i = 1; i < calcPoints.length; i++) {
      const prev = calcPoints[i - 1];
      const curr = calcPoints[i];
      const cpx = (prev.x + curr.x) / 2;
      linePath += ` Q ${prev.x} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`;
      if (i === calcPoints.length - 1) {
        linePath += ` T ${curr.x} ${curr.y}`;
      }
    }
    
    // Area path
    const area = `${linePath} L ${calcPoints[calcPoints.length - 1].x} ${height} L ${calcPoints[0].x} ${height} Z`;
    
    return { path: linePath, areaPath: area, points: calcPoints };
  }, [data, width, height]);

  const gradientId = useMemo(() => `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`, []);
  const lastPoint = points[points.length - 1];
  const isPositive = data.length > 1 && data[data.length - 1] >= data[0];

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      
      {/* Area fill */}
      {showGradient && (
        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
      )}
      
      {/* Line */}
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animated ? { pathLength: 0 } : { pathLength: 1 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      
      {/* End point */}
      {lastPoint && (
        <motion.circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={3}
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.3, duration: 0.3 }}
          className="drop-shadow-md"
        />
      )}
      
      {/* Pulse effect on end point */}
      {lastPoint && (
        <motion.circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={3}
          fill={color}
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ 
            delay: 1.5,
            duration: 1.5, 
            repeat: Infinity,
            repeatDelay: 1
          }}
        />
      )}
    </svg>
  );
};

export default SparklineChart;
