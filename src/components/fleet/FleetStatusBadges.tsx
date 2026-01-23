import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FleetStatusBadgesProps {
  total: number;
  running: number;
  stopped: number;
  overspeed: number;
  idle: number;
  unreachable: number;
  newVehicles?: number;
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
}

const FleetStatusBadges = ({
  total,
  running,
  stopped,
  overspeed,
  idle,
  unreachable,
  newVehicles = 0,
  activeFilter = "all",
  onFilterChange,
}: FleetStatusBadgesProps) => {
  const badges = [
    { 
      key: "all", 
      label: "ALL", 
      count: total, 
      bgClass: "bg-[#0072BC] hover:bg-[#005a96]",
      textClass: "text-white"
    },
    { 
      key: "running", 
      label: "RUNNING", 
      count: running, 
      bgClass: "bg-[#8DC63F] hover:bg-[#7ab332]",
      textClass: "text-white"
    },
    { 
      key: "stopped", 
      label: "STOPPED", 
      count: stopped, 
      bgClass: "bg-[#F5A623] hover:bg-[#e09515]",
      textClass: "text-white"
    },
    { 
      key: "overspeed", 
      label: "OVERSPEED", 
      count: overspeed, 
      bgClass: "bg-[#4CAF50] hover:bg-[#45a049]",
      textClass: "text-white"
    },
    { 
      key: "idle", 
      label: "IDLE", 
      count: idle, 
      bgClass: "bg-[#00BCD4] hover:bg-[#00a0b4]",
      textClass: "text-white"
    },
    { 
      key: "unreachable", 
      label: "UNREACHABLE", 
      count: unreachable, 
      bgClass: "bg-[#E91E63] hover:bg-[#d1185a]",
      textClass: "text-white"
    },
    { 
      key: "new", 
      label: "NEW", 
      count: newVehicles, 
      bgClass: "bg-muted hover:bg-muted/80",
      textClass: "text-foreground"
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {badges.map((badge) => (
        <button
          key={badge.key}
          onClick={() => onFilterChange?.(badge.key)}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 flex items-center gap-2",
            badge.bgClass,
            badge.textClass,
            activeFilter === badge.key && "ring-2 ring-offset-2 ring-primary scale-105"
          )}
        >
          <span>{badge.count}</span>
          <span>{badge.label}</span>
        </button>
      ))}
    </div>
  );
};

export default FleetStatusBadges;
