import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FleetRefreshTimerProps {
  intervalSeconds?: number;
  className?: string;
}

/**
 * Circular countdown timer showing seconds until next auto-refresh.
 * Visual feedback that data is live and updating.
 */
const FleetRefreshTimer = ({ intervalSeconds = 30, className }: FleetRefreshTimerProps) => {
  const [remaining, setRemaining] = useState(intervalSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) return intervalSeconds;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [intervalSeconds]);

  const progress = remaining / intervalSeconds;
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className={cn("flex items-center gap-1.5 shrink-0", className)}>
      <div className="relative w-6 h-6 flex items-center justify-center">
        <svg width={22} height={22} className="-rotate-90">
          <circle cx={11} cy={11} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={2} />
          <circle
            cx={11} cy={11} r={radius} fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <motion.div
          className="absolute"
          animate={remaining <= 1 ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 0.5 }}
        >
          <RefreshCw className="w-2.5 h-2.5 text-primary" />
        </motion.div>
      </div>
      <span className="text-[9px] text-muted-foreground font-mono tabular-nums">{remaining}s</span>
    </div>
  );
};

export default FleetRefreshTimer;
