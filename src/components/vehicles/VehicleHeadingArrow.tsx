import { cn } from "@/lib/utils";
import { Navigation } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VehicleHeadingArrowProps {
  heading: number;
  speed?: number;
  className?: string;
}

const CARDINAL_DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/**
 * Compact compass arrow showing vehicle heading direction.
 * Only renders when vehicle has speed > 0.
 */
const VehicleHeadingArrow = ({ heading, speed = 0, className }: VehicleHeadingArrowProps) => {
  if (speed <= 0) return null;

  const dirIndex = Math.round(heading / 45) % 8;
  const cardinal = CARDINAL_DIRS[dirIndex];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("inline-flex items-center gap-0.5", className)}>
          <Navigation
            className="w-3 h-3 text-primary fill-primary/30"
            style={{ transform: `rotate(${heading}deg)` }}
          />
          <span className="text-[9px] font-mono text-muted-foreground">{cardinal}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Heading: {Math.round(heading)}° {cardinal}
      </TooltipContent>
    </Tooltip>
  );
};

export default VehicleHeadingArrow;
