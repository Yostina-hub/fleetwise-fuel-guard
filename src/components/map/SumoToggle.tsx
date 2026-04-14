import { cn } from "@/lib/utils";
import { Activity, Globe } from "lucide-react";

interface SumoToggleProps {
  sumoActive: boolean;
  onToggle: () => void;
}

const SumoToggle = ({ sumoActive, onToggle }: SumoToggleProps) => {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-medium transition-all duration-200 border shadow-lg backdrop-blur-sm",
        sumoActive
          ? "bg-blue-600 text-white border-blue-500 shadow-blue-500/30"
          : "bg-background/90 text-foreground border-border hover:bg-muted/80"
      )}
      title={sumoActive ? "Switch to Real-World" : "Switch to SUMO Simulation"}
    >
      {sumoActive ? (
        <>
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden sm:inline">SUMO</span>
        </>
      ) : (
        <>
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Live</span>
        </>
      )}
    </button>
  );
};

export default SumoToggle;
