import { motion } from "framer-motion";
import { useMemo } from "react";

interface SpeedometerGaugeProps {
  speed: number;
  maxSpeed?: number;
  unit?: string;
}

const SpeedometerGauge = ({ speed, maxSpeed = 200, unit = "km/h" }: SpeedometerGaugeProps) => {
  const percentage = Math.min(speed / maxSpeed, 1);
  const startAngle = -225;
  const endAngle = 45;
  const totalAngle = endAngle - startAngle; // 270 degrees
  const currentAngle = startAngle + totalAngle * percentage;

  // Generate tick marks
  const ticks = useMemo(() => {
    const items = [];
    const numMajor = 10;
    for (let i = 0; i <= numMajor; i++) {
      const angle = startAngle + (totalAngle / numMajor) * i;
      const rad = (angle * Math.PI) / 180;
      const r1 = 88;
      const r2 = i % 2 === 0 ? 76 : 80;
      const rText = 68;
      items.push({
        x1: 100 + r1 * Math.cos(rad),
        y1: 100 + r1 * Math.sin(rad),
        x2: 100 + r2 * Math.cos(rad),
        y2: 100 + r2 * Math.sin(rad),
        tx: 100 + rText * Math.cos(rad),
        ty: 100 + rText * Math.sin(rad),
        value: Math.round((maxSpeed / numMajor) * i),
        isMajor: i % 2 === 0,
      });
    }
    return items;
  }, [maxSpeed]);

  // Arc path
  const arcPath = (radius: number, start: number, end: number) => {
    const s = (start * Math.PI) / 180;
    const e = (end * Math.PI) / 180;
    const sx = 100 + radius * Math.cos(s);
    const sy = 100 + radius * Math.sin(s);
    const ex = 100 + radius * Math.cos(e);
    const ey = 100 + radius * Math.sin(e);
    const large = end - start > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${radius} ${radius} 0 ${large} 1 ${ex} ${ey}`;
  };

  const needleRad = (currentAngle * Math.PI) / 180;
  const needleLen = 60;
  const nx = 100 + needleLen * Math.cos(needleRad);
  const ny = 100 + needleLen * Math.sin(needleRad);

  const speedColor = speed > 120 ? "hsl(0 75% 55%)" : speed > 80 ? "hsl(38 92% 50%)" : "hsl(84 54% 56%)";

  return (
    <div className="relative w-full max-w-[200px] aspect-square mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(84 54% 56%)" />
            <stop offset="50%" stopColor="hsl(38 92% 50%)" />
            <stop offset="100%" stopColor="hsl(0 75% 55%)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <radialGradient id="bgGrad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="hsl(var(--background))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
          </radialGradient>
        </defs>

        {/* Background circle */}
        <circle cx="100" cy="100" r="96" fill="url(#bgGrad)" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.8" />

        {/* Track arc */}
        <path d={arcPath(88, startAngle, endAngle)} fill="none" stroke="hsl(var(--border))" strokeWidth="6" strokeLinecap="round" opacity="0.3" />

        {/* Active arc */}
        <motion.path
          d={arcPath(88, startAngle, currentAngle)}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke="hsl(var(--muted-foreground))" strokeWidth={t.isMajor ? 1.5 : 0.8} opacity={0.5} />
            {t.isMajor && (
              <text x={t.tx} y={t.ty} textAnchor="middle" dominantBaseline="middle"
                fill="hsl(var(--muted-foreground))" fontSize="8" fontWeight="500">
                {t.value}
              </text>
            )}
          </g>
        ))}

        {/* Needle */}
        <motion.line
          x1="100" y1="100" x2={nx} y2={ny}
          stroke={speedColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ rotate: startAngle - currentAngle }}
          animate={{ rotate: 0 }}
          transition={{ duration: 1.5, type: "spring", damping: 12 }}
          style={{ transformOrigin: "100px 100px" }}
        />

        {/* Center hub */}
        <circle cx="100" cy="100" r="6" fill={speedColor} opacity="0.9" />
        <circle cx="100" cy="100" r="3" fill="hsl(var(--background))" />

        {/* Speed value */}
        <text x="100" y="140" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="22" fontWeight="800">
          {Math.round(speed)}
        </text>
        <text x="100" y="153" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8" fontWeight="500">
          {unit}
        </text>
      </svg>
    </div>
  );
};

export default SpeedometerGauge;
