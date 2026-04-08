import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface VehicleFuelSparklineProps {
  vehicleId: string;
  currentFuel: number;
  className?: string;
}

/**
 * Tiny inline SVG sparkline showing a 7-point fuel trend.
 * Uses current fuel + simulated historical jitter for visual context.
 * Replace with real fuel_logs query when available.
 */
const VehicleFuelSparkline = ({ vehicleId, currentFuel, className }: VehicleFuelSparklineProps) => {
  const points = useMemo(() => {
    // Deterministic pseudo-random based on vehicleId for consistent rendering
    const seed = vehicleId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const pts: number[] = [];
    let val = Math.min(100, Math.max(5, currentFuel + 15));
    for (let i = 0; i < 6; i++) {
      pts.push(Math.max(0, Math.min(100, val)));
      val += ((seed * (i + 1) * 7) % 13) - 6; // small jitter
    }
    pts.push(currentFuel);
    return pts;
  }, [vehicleId, currentFuel]);

  const w = 60;
  const h = 18;
  const padding = 1;

  const min = Math.min(...points);
  const max = Math.max(...points, 1);
  const range = max - min || 1;

  const pathPoints = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (w - padding * 2);
    const y = h - padding - ((p - min) / range) * (h - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M${pathPoints.join(" L")}`;
  const areaPath = `${linePath} L${w - padding},${h} L${padding},${h} Z`;

  const trend = currentFuel - points[0];
  const color = currentFuel < 15 ? "stroke-destructive" : trend < -10 ? "stroke-warning" : "stroke-success";
  const fillColor = currentFuel < 15 ? "fill-destructive/15" : trend < -10 ? "fill-warning/15" : "fill-success/15";

  return (
    <svg width={w} height={h} className={cn("shrink-0", className)} viewBox={`0 0 ${w} ${h}`}>
      <path d={areaPath} className={fillColor} />
      <path d={linePath} className={cn(color, "fill-none")} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Current value dot */}
      <circle
        cx={w - padding}
        cy={h - padding - ((currentFuel - min) / range) * (h - padding * 2)}
        r={2}
        className={cn(color.replace("stroke-", "fill-"))}
      />
    </svg>
  );
};

export default VehicleFuelSparkline;
