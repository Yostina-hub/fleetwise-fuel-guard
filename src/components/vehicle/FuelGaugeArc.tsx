import { motion } from "framer-motion";
import { Fuel } from "lucide-react";

interface FuelGaugeArcProps {
  level: number; // 0–100
  tankCapacity?: number;
}

const FuelGaugeArc = ({ level, tankCapacity }: FuelGaugeArcProps) => {
  const clampedLevel = Math.max(0, Math.min(100, level));
  const startAngle = 180;
  const endAngle = 0;
  const totalAngle = 180;
  const currentAngle = startAngle - (totalAngle * clampedLevel) / 100;

  const arcPath = (r: number, sA: number, eA: number) => {
    const s = (sA * Math.PI) / 180;
    const e = (eA * Math.PI) / 180;
    return `M ${80 + r * Math.cos(s)} ${80 + r * Math.sin(s)} A ${r} ${r} 0 0 0 ${80 + r * Math.cos(e)} ${80 + r * Math.sin(e)}`;
  };

  const color =
    clampedLevel > 50 ? "hsl(var(--success))" : clampedLevel > 20 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  const remaining = tankCapacity ? Math.round((clampedLevel / 100) * tankCapacity) : null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[160px] h-[90px]">
        <svg viewBox="0 0 160 90" className="w-full h-full">
          <defs>
            <filter id="fuelGlow">
              <feGaussianBlur stdDeviation="3" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Track */}
          <path d={arcPath(60, startAngle, endAngle)} fill="none" stroke="hsl(var(--border))" strokeWidth="10" strokeLinecap="round" opacity="0.2" />

          {/* Fill */}
          <motion.path
            d={arcPath(60, startAngle, currentAngle)}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            filter="url(#fuelGlow)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />

          {/* Labels */}
          <text x="18" y="86" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7" fontWeight="500">E</text>
          <text x="142" y="86" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7" fontWeight="500">F</text>
        </svg>

        {/* Center */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <Fuel className="h-4 w-4 mx-auto mb-0.5 text-muted-foreground" />
          <span className="text-lg font-black" style={{ color }}>{Math.round(clampedLevel)}%</span>
        </div>
      </div>
      {remaining !== null && (
        <span className="text-[10px] text-muted-foreground mt-1">~{remaining}L remaining</span>
      )}
    </div>
  );
};

export default FuelGaugeArc;
