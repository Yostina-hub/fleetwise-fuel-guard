/**
 * SharedRideMatchMap
 * ------------------
 * Lightweight SVG-based map preview for the top shared-ride matches.
 * Plots the requester's origin/destination plus each candidate ride's pickup
 * and dropoff points, scaled to a normalized lat/lng bounding box. Each ride
 * marker also shows its time delta (in minutes) relative to the requested
 * departure so the user can compare matches at a glance before selecting one.
 *
 * Uses no third-party map tile provider — the geography points come straight
 * from the PostGIS-backed `find_direct_match_rides` RPC and are projected
 * with a simple equirectangular approximation, which is plenty accurate for
 * a small preview spanning a few km.
 */
import { useMemo } from "react";
import type { SharedRideMatch } from "@/hooks/useSharedRides";

interface Props {
  matches: SharedRideMatch[];
  reqOriginLat: number;
  reqOriginLng: number;
  reqDestLat: number;
  reqDestLng: number;
  selectedRideId?: string | null;
  onHover?: (rideId: string | null) => void;
  onSelect?: (rideId: string) => void;
}

const W = 320;
const H = 160;
const PAD = 14;

export const SharedRideMatchMap = ({
  matches,
  reqOriginLat,
  reqOriginLng,
  reqDestLat,
  reqDestLng,
  selectedRideId,
  onHover,
  onSelect,
}: Props) => {
  const { project, bounds } = useMemo(() => {
    const lats = [reqOriginLat, reqDestLat];
    const lngs = [reqOriginLng, reqDestLng];
    matches.forEach((m) => {
      lats.push(m.origin_lat, m.destination_lat);
      lngs.push(m.origin_lng, m.destination_lng);
    });
    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);
    // Avoid division-by-zero when all points coincide
    if (maxLat - minLat < 0.0005) {
      minLat -= 0.0025;
      maxLat += 0.0025;
    }
    if (maxLng - minLng < 0.0005) {
      minLng -= 0.0025;
      maxLng += 0.0025;
    }
    const project = (lat: number, lng: number) => {
      const x = PAD + ((lng - minLng) / (maxLng - minLng)) * (W - 2 * PAD);
      // Y axis flipped: higher latitude → smaller y
      const y = PAD + (1 - (lat - minLat) / (maxLat - minLat)) * (H - 2 * PAD);
      return { x, y };
    };
    return { project, bounds: { minLat, maxLat, minLng, maxLng } };
  }, [matches, reqOriginLat, reqOriginLng, reqDestLat, reqDestLng]);

  const me = {
    o: project(reqOriginLat, reqOriginLng),
    d: project(reqDestLat, reqDestLng),
  };

  return (
    <div className="rounded-md border border-border bg-muted/30 overflow-hidden">
      <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/50 flex items-center justify-between">
        <span>Shared-ride map preview</span>
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-foreground" />
            You
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            Ride
          </span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[160px] block"
        role="img"
        aria-label="Map preview of shared-ride matches"
      >
        {/* Subtle grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              opacity="0.5"
            />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />

        {/* Requester route */}
        <line
          x1={me.o.x}
          y1={me.o.y}
          x2={me.d.x}
          y2={me.d.y}
          stroke="hsl(var(--foreground))"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          opacity="0.7"
        />

        {/* Candidate rides */}
        {matches.map((m, idx) => {
          const o = project(m.origin_lat, m.origin_lng);
          const d = project(m.destination_lat, m.destination_lng);
          const isSelected = selectedRideId === m.ride_id;
          const minutes = Math.round(m.time_delta_minutes);
          const sign = minutes > 0 ? "+" : "";
          return (
            <g
              key={m.ride_id}
              className="cursor-pointer"
              onMouseEnter={() => onHover?.(m.ride_id)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => onSelect?.(m.ride_id)}
              opacity={isSelected ? 1 : 0.85}
            >
              <line
                x1={o.x}
                y1={o.y}
                x2={d.x}
                y2={d.y}
                stroke="hsl(var(--primary))"
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              <circle
                cx={o.x}
                cy={o.y}
                r={isSelected ? 5 : 3.5}
                fill="hsl(var(--primary))"
                stroke="hsl(var(--background))"
                strokeWidth="1"
              />
              <circle
                cx={d.x}
                cy={d.y}
                r={isSelected ? 4 : 3}
                fill="hsl(var(--background))"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
              />
              {/* Time-delta label near pickup */}
              <text
                x={o.x + 6}
                y={o.y - 5}
                fontSize="9"
                fontWeight={isSelected ? 700 : 500}
                fill="hsl(var(--primary))"
              >
                #{idx + 1} {sign}
                {minutes}m
              </text>
            </g>
          );
        })}

        {/* Requester markers (drawn on top) */}
        <circle
          cx={me.o.x}
          cy={me.o.y}
          r="5"
          fill="hsl(var(--foreground))"
          stroke="hsl(var(--background))"
          strokeWidth="1.5"
        />
        <text
          x={me.o.x + 7}
          y={me.o.y + 4}
          fontSize="9"
          fontWeight="700"
          fill="hsl(var(--foreground))"
        >
          A
        </text>
        <circle
          cx={me.d.x}
          cy={me.d.y}
          r="4.5"
          fill="hsl(var(--background))"
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
        />
        <text
          x={me.d.x + 7}
          y={me.d.y + 4}
          fontSize="9"
          fontWeight="700"
          fill="hsl(var(--foreground))"
        >
          B
        </text>
      </svg>
      <div className="px-2 py-1 text-[10px] text-muted-foreground border-t border-border bg-background/50 flex items-center justify-between">
        <span>
          A → B: your trip · #n: ranked match (time vs. requested departure)
        </span>
        <span className="tabular-nums">
          {(bounds.maxLat - bounds.minLat).toFixed(3)}° ×{" "}
          {(bounds.maxLng - bounds.minLng).toFixed(3)}°
        </span>
      </div>
    </div>
  );
};

export default SharedRideMatchMap;
