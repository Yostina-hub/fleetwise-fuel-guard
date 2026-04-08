import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VehicleActivityMinibarProps {
  /** Array of 24 hourly status values: 'moving' | 'idle' | 'stopped' | 'offline' */
  hourlyStatus?: string[];
  className?: string;
}

/**
 * A 24-segment horizontal minibar showing vehicle activity pattern over the last 24 hours.
 * Each segment = 1 hour. Color-coded: green=moving, yellow=idle, red=stopped, gray=offline.
 */
const VehicleActivityMinibar = ({ hourlyStatus, className }: VehicleActivityMinibarProps) => {
  // Generate simulated 24h data if not provided (based on current time for variation)
  const segments = useMemo(() => {
    if (hourlyStatus && hourlyStatus.length === 24) return hourlyStatus;
    // Placeholder: show all as offline when no data
    return Array.from({ length: 24 }, () => "offline");
  }, [hourlyStatus]);

  const colorMap: Record<string, string> = {
    moving: "bg-green-500",
    idle: "bg-yellow-500",
    stopped: "bg-red-500",
    offline: "bg-muted-foreground/20",
  };

  const labelMap: Record<string, string> = {
    moving: "Moving",
    idle: "Idle",
    stopped: "Stopped",
    offline: "Offline",
  };

  return (
    <div className={cn("flex items-center gap-[1px] h-3", className)}>
      {segments.map((status, i) => {
        const hour = (new Date().getHours() - 23 + i + 24) % 24;
        const label = `${hour.toString().padStart(2, "0")}:00 — ${labelMap[status] || "Unknown"}`;
        return (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex-1 h-full rounded-[1px] transition-all hover:scale-y-150",
                  colorMap[status] || "bg-muted"
                )}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px] px-2 py-1">
              {label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default VehicleActivityMinibar;
