import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Power, 
  Gauge, 
  Timer, 
  Snowflake, 
  Fuel,
  Settings,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface VehicleMapInfoCardProps {
  plate: string;
  speed: number;
  ignitionOn?: boolean;
  acOn?: boolean;
  fuel?: number;
  lastUpdate?: string;
  onToday?: () => void;
  onAddPOI?: () => void;
  onSettings?: () => void;
}

export const VehicleMapInfoCard = ({
  plate,
  speed,
  ignitionOn = false,
  acOn = false,
  fuel = 0,
  lastUpdate,
  onToday,
  onAddPOI,
  onSettings,
}: VehicleMapInfoCardProps) => {
  // Calculate duration since last update
  const duration = lastUpdate 
    ? formatDistanceToNow(new Date(lastUpdate), { addSuffix: false })
    : "--";

  return (
    <Card className="absolute top-4 right-16 z-10 w-52 shadow-lg border-border bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <span className="font-bold text-sm">{plate}</span>
        <div className="flex items-center gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-6 text-xs px-2"
            onClick={onToday}
          >
            <Calendar className="w-3 h-3 mr-1" />
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={onAddPOI}
          >
            Add POI
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onSettings}
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Info Items */}
      <div className="p-3 space-y-2">
        {/* Ignition */}
        <div className="flex items-center gap-2">
          <Power className={cn(
            "w-4 h-4",
            ignitionOn ? "text-success" : "text-muted-foreground"
          )} />
          <span className={cn(
            "text-sm font-medium",
            ignitionOn ? "text-success" : "text-muted-foreground"
          )}>
            Ignition {ignitionOn ? "on" : "off"}
          </span>
        </div>
        
        {/* Speed */}
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{speed} kmph</span>
        </div>
        
        {/* Duration */}
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-accent-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{duration}</span>
        </div>
        
        {/* AC */}
        <div className="flex items-center gap-2">
          <Snowflake className={cn(
            "w-4 h-4",
            acOn ? "text-primary" : "text-muted-foreground"
          )} />
          <span className={cn(
            "text-sm font-medium",
            acOn ? "text-primary" : "text-muted-foreground"
          )}>
            Ac {acOn ? "on" : "off"}
          </span>
        </div>
        
        {/* Fuel */}
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-warning" />
          <span className="text-sm font-medium">
            {fuel > 0 ? `${fuel}%` : "0.00/0 L"}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default VehicleMapInfoCard;
