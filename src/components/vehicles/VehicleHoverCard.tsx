import { Badge } from "@/components/ui/badge";
import { 
  Gauge, 
  Fuel, 
  MapPin, 
  Clock, 
  Power,
  Navigation,
  Wifi,
  WifiOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface VehicleHoverCardProps {
  vehicle: {
    id: string;
    plate: string;
    make?: string;
    model?: string;
    status: string;
    speed: number;
    lat?: number;
    lng?: number;
    fuel?: number;
    heading?: number;
    lastUpdate?: string;
    deviceConnected?: boolean;
    ignitionOn?: boolean;
  };
}

export const VehicleHoverCard = ({ vehicle }: VehicleHoverCardProps) => {
  const isOnline = vehicle.deviceConnected !== false;
  
  return (
    <div className="w-64 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-lg">{vehicle.plate}</p>
          {vehicle.make && (
            <p className="text-xs text-muted-foreground">
              {vehicle.make} {vehicle.model}
            </p>
          )}
        </div>
        <Badge
          variant={isOnline ? "default" : "destructive"}
          className={cn(
            "text-xs",
            isOnline ? "bg-success" : "bg-destructive"
          )}
        >
          {isOnline ? (
            <><Wifi className="w-3 h-3 mr-1" /> Online</>
          ) : (
            <><WifiOff className="w-3 h-3 mr-1" /> Offline</>
          )}
        </Badge>
      </div>

      {/* Status */}
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs capitalize w-fit",
          vehicle.status === 'moving' && "border-success text-success bg-success/10",
          vehicle.status === 'idle' && "border-warning text-warning bg-warning/10",
          vehicle.status === 'stopped' && "border-destructive text-destructive bg-destructive/10",
          vehicle.status === 'offline' && "border-muted text-muted-foreground"
        )}
      >
        {vehicle.status}
      </Badge>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Speed</p>
            <p className="font-semibold">{vehicle.speed} km/h</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-warning" />
          <div>
            <p className="text-xs text-muted-foreground">Fuel</p>
            <p className="font-semibold">{vehicle.fuel ?? 0}%</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Power className={cn(
            "w-4 h-4",
            vehicle.ignitionOn ? "text-success" : "text-muted-foreground"
          )} />
          <div>
            <p className="text-xs text-muted-foreground">Ignition</p>
            <p className="font-semibold">{vehicle.ignitionOn ? "On" : "Off"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Heading</p>
            <p className="font-semibold">{vehicle.heading ?? 0}°</p>
          </div>
        </div>
      </div>

      {/* Location */}
      {vehicle.lat && vehicle.lng && (
        <div className="flex items-center gap-2 text-xs bg-muted/50 rounded p-2">
          <MapPin className="w-3 h-3 text-primary" />
          <span className="font-mono">
            {vehicle.lat.toFixed(5)}, {vehicle.lng.toFixed(5)}
          </span>
        </div>
      )}

      {/* Last Update */}
      {vehicle.lastUpdate && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>
            Updated {formatDistanceToNow(new Date(vehicle.lastUpdate), { addSuffix: true })}
          </span>
        </div>
      )}
    </div>
  );
};

export default VehicleHoverCard;
