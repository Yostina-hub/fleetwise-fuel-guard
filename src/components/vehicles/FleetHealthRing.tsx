import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FleetHealthRingProps {
  moving: number;
  idle: number;
  stopped: number;
  offline: number;
  total: number;
}

/**
 * Animated SVG donut ring showing fleet distribution at a glance.
 * Segments: green=moving, yellow=idle, red=stopped, gray=offline.
 */
const FleetHealthRing = ({ moving, idle, stopped, offline, total }: FleetHealthRingProps) => {
  const size = 56;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    if (total === 0) return [];
    const data = [
      { value: moving, color: "#22c55e", label: "Moving" },
      { value: idle, color: "#eab308", label: "Idle" },
      { value: stopped, color: "#ef4444", label: "Stopped" },
      { value: offline, color: "#6b7280", label: "Offline" },
    ];
    let offset = 0;
    return data
      .filter(d => d.value > 0)
      .map(d => {
        const pct = d.value / total;
        const length = pct * circumference;
        const gap = circumference - length;
        const seg = { ...d, pct, length, gap, offset };
        offset += length;
        return seg;
      });
  }, [moving, idle, stopped, offline, total, circumference]);

  const utilization = total > 0 ? Math.round(((moving + idle) / total) * 100) : 0;

  return (
    <div className="relative flex items-center gap-2 shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Animated segments */}
        {segments.map((seg, i) => (
          <motion.circle
            key={seg.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${seg.length} ${seg.gap}`}
            strokeDashoffset={-seg.offset}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: i * 0.15, ease: "easeOut" }}
          />
        ))}
      </svg>
      {/* Center label */}
      <div className="absolute left-0 w-[56px] flex items-center justify-center">
        <span className="text-[11px] font-bold text-foreground rotate-90">{utilization}%</span>
      </div>
      {/* Legend */}
      <div className="flex flex-col gap-0.5">
        {[
          { label: "Moving", value: moving, color: "bg-green-500" },
          { label: "Idle", value: idle, color: "bg-yellow-500" },
          { label: "Stopped", value: stopped, color: "bg-red-500" },
          { label: "Offline", value: offline, color: "bg-gray-500" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={cn("w-1.5 h-1.5 rounded-full", item.color)} />
            <span className="text-[9px] text-muted-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FleetHealthRing;
