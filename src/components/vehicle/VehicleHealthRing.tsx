import { motion } from "framer-motion";

interface VehicleHealthRingProps {
  score: number; // 0-100
  label?: string;
  size?: number;
}

const VehicleHealthRing = ({ score, label = "Health", size = 140 }: VehicleHealthRingProps) => {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return { stroke: "hsl(var(--success))", glow: "hsl(145 65% 45% / 0.4)", text: "text-success" };
    if (s >= 50) return { stroke: "hsl(var(--warning))", glow: "hsl(38 92% 50% / 0.4)", text: "text-warning" };
    return { stroke: "hsl(var(--destructive))", glow: "hsl(0 75% 55% / 0.4)", text: "text-destructive" };
  };

  const { stroke, glow, text } = getColor(score);
  const grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 50 ? "D" : "F";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <defs>
            <filter id="healthGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Track */}
          <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="8" opacity="0.2" />

          {/* Segments background */}
          {[0, 1, 2, 3].map((i) => {
            const segGap = 4;
            const segLength = (circumference - segGap * 4) / 4;
            return (
              <circle key={i} cx="60" cy="60" r={radius} fill="none"
                stroke="hsl(var(--border))" strokeWidth="8" opacity="0.08"
                strokeDasharray={`${segLength} ${circumference - segLength}`}
                strokeDashoffset={-(segLength + segGap) * i}
                strokeLinecap="round" />
            );
          })}

          {/* Active ring */}
          <motion.circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            filter="url(#healthGlow)"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`text-2xl font-black ${text}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", damping: 8 }}
          >
            {grade}
          </motion.span>
          <span className="text-[10px] text-muted-foreground font-medium">{score}%</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
};

export default VehicleHealthRing;
