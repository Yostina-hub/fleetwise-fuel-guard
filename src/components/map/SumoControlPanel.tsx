import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Gauge, Car, Clock, TrafficCone } from "lucide-react";
import type { SimulationState } from "./sumo/types";
import { cn } from "@/lib/utils";

interface SumoControlPanelProps {
  state: SimulationState;
  onToggleRunning: (running: boolean) => void;
  onSetSpeed: (speed: number) => void;
  onSetVehicleCount: (count: number) => void;
  onReset: () => void;
}

const SPEED_OPTIONS = [1, 2, 5, 10];

const SumoControlPanel = ({
  state,
  onToggleRunning,
  onSetSpeed,
  onSetVehicleCount,
  onReset,
}: SumoControlPanelProps) => {
  const movingCount = state.vehicles.filter(v => v.status === "moving").length;
  const stoppedCount = state.vehicles.filter(v => v.status === "stopped").length;
  const avgSpeed = state.vehicles.length > 0
    ? Math.round(state.vehicles.reduce((s, v) => s + v.speed, 0) / state.vehicles.length)
    : 0;
  const greenSignals = state.signals.filter(s => s.phase === "green").length;
  const redSignals = state.signals.filter(s => s.phase === "red").length;

  const simMinutes = Math.floor(state.time / 60);
  const simSeconds = Math.floor(state.time % 60);

  return (
    <div className="absolute bottom-4 left-4 z-20 bg-background/95 backdrop-blur-md rounded-xl border shadow-2xl p-3 w-72 space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-blue-600 text-white text-[10px] px-1.5 gap-1">
            <TrafficCone className="w-3 h-3" />
            SUMO
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            Addis Ababa
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono gap-1">
          <Clock className="w-3 h-3" />
          {String(simMinutes).padStart(2, "0")}:{String(simSeconds).padStart(2, "0")}
        </Badge>
      </div>

      {/* Controls Row */}
      <div className="flex items-center gap-1.5">
        <Button
          size="icon"
          variant={state.running ? "secondary" : "default"}
          className="h-7 w-7"
          onClick={() => onToggleRunning(!state.running)}
        >
          {state.running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </Button>
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={onReset}>
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>

        <div className="flex-1 flex items-center gap-1 bg-muted/50 rounded-lg px-1.5 py-0.5">
          <Gauge className="w-3 h-3 text-muted-foreground" />
          {SPEED_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => onSetSpeed(s)}
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                state.speed === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle Count Slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground flex items-center gap-1">
            <Car className="w-3 h-3" /> Vehicles
          </span>
          <span className="font-medium">{state.vehicleCount}</span>
        </div>
        <Slider
          value={[state.vehicleCount]}
          onValueChange={([v]) => onSetVehicleCount(v)}
          min={20}
          max={500}
          step={10}
          className="h-4"
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className="bg-muted/40 rounded-lg py-1.5 px-1">
          <p className="text-[10px] text-muted-foreground">Moving</p>
          <p className="text-xs font-bold text-emerald-500">{movingCount}</p>
        </div>
        <div className="bg-muted/40 rounded-lg py-1.5 px-1">
          <p className="text-[10px] text-muted-foreground">Stopped</p>
          <p className="text-xs font-bold text-red-500">{stoppedCount}</p>
        </div>
        <div className="bg-muted/40 rounded-lg py-1.5 px-1">
          <p className="text-[10px] text-muted-foreground">Avg km/h</p>
          <p className="text-xs font-bold">{avgSpeed}</p>
        </div>
        <div className="bg-muted/40 rounded-lg py-1.5 px-1">
          <p className="text-[10px] text-muted-foreground">Signals</p>
          <p className="text-xs font-bold">
            <span className="text-emerald-500">{greenSignals}</span>
            /
            <span className="text-red-500">{redSignals}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SumoControlPanel;
