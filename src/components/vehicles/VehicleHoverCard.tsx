import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Gauge, 
  Fuel, 
  MapPin, 
  Clock, 
  Power,
  Navigation,
  Wifi,
  WifiOff,
  Thermometer,
  Activity,
  Car,
  Compass,
  Timer,
  Route,
  ExternalLink,
  Copy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

interface VehicleHoverCardProps {
  vehicle: {
    id: string;
    plate: string;
    make?: string;
    model?: string;
    year?: number;
    status: string;
    speed: number;
    lat?: number;
    lng?: number;
    fuel?: number;
    heading?: number;
    lastUpdate?: string;
    deviceConnected?: boolean;
    ignitionOn?: boolean;
    isOverspeed?: boolean;
  };
}

// Get heading direction name
const getHeadingDirection = (heading: number): string => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
};

// Get status color classes
const getStatusStyles = (status: string) => {
  switch (status) {
    case 'moving':
      return {
        bg: 'bg-gradient-to-r from-success/20 to-success/5',
        border: 'border-success/30',
        text: 'text-success',
        pulse: 'animate-pulse'
      };
    case 'idle':
      return {
        bg: 'bg-gradient-to-r from-warning/20 to-warning/5',
        border: 'border-warning/30',
        text: 'text-warning',
        pulse: ''
      };
    case 'stopped':
      return {
        bg: 'bg-gradient-to-r from-destructive/20 to-destructive/5',
        border: 'border-destructive/30',
        text: 'text-destructive',
        pulse: ''
      };
    default:
      return {
        bg: 'bg-gradient-to-r from-muted/50 to-muted/20',
        border: 'border-muted',
        text: 'text-muted-foreground',
        pulse: ''
      };
  }
};

export const VehicleHoverCard = ({ vehicle }: VehicleHoverCardProps) => {
  const [copied, setCopied] = useState(false);
  const isOnline = vehicle.deviceConnected !== false;
  const statusStyles = getStatusStyles(vehicle.status);
  const fuelLevel = vehicle.fuel ?? 0;
  const speedPercent = Math.min((vehicle.speed / 120) * 100, 100);
  
  const handleCopyCoordinates = () => {
    if (vehicle.lat && vehicle.lng) {
      navigator.clipboard.writeText(`${vehicle.lat}, ${vehicle.lng}`);
      setCopied(true);
      toast.success("Coordinates copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInMaps = () => {
    if (vehicle.lat && vehicle.lng) {
      window.open(`https://www.google.com/maps?q=${vehicle.lat},${vehicle.lng}`, '_blank');
    }
  };
  
  return (
    <div className="w-[420px] space-y-4">
      {/* Header with gradient background */}
      <div className={cn(
        "p-4 rounded-lg border",
        statusStyles.bg,
        statusStyles.border
      )}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold tracking-tight">{vehicle.plate}</h3>
            </div>
            {vehicle.make && (
              <p className="text-sm text-muted-foreground">
                {vehicle.make} {vehicle.model} {vehicle.year && `• ${vehicle.year}`}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant={isOnline ? "default" : "destructive"}
              className={cn(
                "text-xs px-2.5 py-1",
                isOnline ? "bg-success hover:bg-success/90" : "bg-destructive"
              )}
            >
              {isOnline ? (
                <><Wifi className="w-3 h-3 mr-1.5" /> Online</>
              ) : (
                <><WifiOff className="w-3 h-3 mr-1.5" /> Offline</>
              )}
            </Badge>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs capitalize px-2.5 py-1",
                statusStyles.border,
                statusStyles.text,
                statusStyles.pulse
              )}
            >
              <Activity className="w-3 h-3 mr-1.5" />
              {vehicle.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Speed & Fuel Visual Meters */}
      <div className="grid grid-cols-2 gap-4">
        {/* Speed Meter */}
        <div className="p-3 rounded-lg bg-muted/30 border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                vehicle.isOverspeed ? "bg-destructive/20" : "bg-primary/20"
              )}>
                <Gauge className={cn(
                  "w-4 h-4",
                  vehicle.isOverspeed ? "text-destructive" : "text-primary"
                )} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Speed</span>
            </div>
            {vehicle.isOverspeed && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                OVERSPEED
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-3xl font-bold tabular-nums",
              vehicle.isOverspeed ? "text-destructive" : "text-foreground"
            )}>
              {vehicle.speed}
            </span>
            <span className="text-sm text-muted-foreground">km/h</span>
          </div>
          <Progress 
            value={speedPercent} 
            className={cn(
              "h-1.5",
              vehicle.isOverspeed && "[&>div]:bg-destructive"
            )}
          />
        </div>

        {/* Fuel Meter */}
        <div className="p-3 rounded-lg bg-muted/30 border space-y-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              fuelLevel < 20 ? "bg-destructive/20" : fuelLevel < 40 ? "bg-warning/20" : "bg-success/20"
            )}>
              <Fuel className={cn(
                "w-4 h-4",
                fuelLevel < 20 ? "text-destructive" : fuelLevel < 40 ? "text-warning" : "text-success"
              )} />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Fuel Level</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-3xl font-bold tabular-nums",
              fuelLevel < 20 ? "text-destructive" : fuelLevel < 40 ? "text-warning" : "text-foreground"
            )}>
              {fuelLevel}
            </span>
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <Progress 
            value={fuelLevel} 
            className={cn(
              "h-1.5",
              fuelLevel < 20 && "[&>div]:bg-destructive",
              fuelLevel >= 20 && fuelLevel < 40 && "[&>div]:bg-warning",
              fuelLevel >= 40 && "[&>div]:bg-success"
            )}
          />
        </div>
      </div>

      {/* Status Indicators Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Ignition */}
        <div className={cn(
          "p-2.5 rounded-lg border text-center transition-colors",
          vehicle.ignitionOn 
            ? "bg-success/10 border-success/30" 
            : "bg-muted/30 border-border"
        )}>
          <Power className={cn(
            "w-4 h-4 mx-auto mb-1",
            vehicle.ignitionOn ? "text-success" : "text-muted-foreground"
          )} />
          <p className="text-[10px] text-muted-foreground">Ignition</p>
          <p className={cn(
            "text-xs font-bold",
            vehicle.ignitionOn ? "text-success" : "text-muted-foreground"
          )}>
            {vehicle.ignitionOn ? "ON" : "OFF"}
          </p>
        </div>

        {/* Heading */}
        <div className="p-2.5 rounded-lg border bg-muted/30 text-center">
          <Compass className="w-4 h-4 mx-auto mb-1 text-primary" />
          <p className="text-[10px] text-muted-foreground">Heading</p>
          <p className="text-xs font-bold">
            {vehicle.heading ?? 0}° {getHeadingDirection(vehicle.heading ?? 0)}
          </p>
        </div>

        {/* AC Status (placeholder) */}
        <div className="p-2.5 rounded-lg border bg-muted/30 text-center">
          <Thermometer className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">AC</p>
          <p className="text-xs font-bold text-muted-foreground">OFF</p>
        </div>

        {/* Connection */}
        <div className={cn(
          "p-2.5 rounded-lg border text-center",
          isOnline 
            ? "bg-success/10 border-success/30" 
            : "bg-destructive/10 border-destructive/30"
        )}>
          {isOnline ? (
            <Wifi className="w-4 h-4 mx-auto mb-1 text-success" />
          ) : (
            <WifiOff className="w-4 h-4 mx-auto mb-1 text-destructive" />
          )}
          <p className="text-[10px] text-muted-foreground">Signal</p>
          <p className={cn(
            "text-xs font-bold",
            isOnline ? "text-success" : "text-destructive"
          )}>
            {isOnline ? "GOOD" : "LOST"}
          </p>
        </div>
      </div>

      <Separator />

      {/* Location Section */}
      {vehicle.lat && vehicle.lng ? (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">GPS Location</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleCopyCoordinates}
              >
                <Copy className="w-3 h-3" />
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={openInMaps}
              >
                <ExternalLink className="w-3 h-3" />
                Maps
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Latitude</p>
              <p className="font-mono font-medium">{vehicle.lat.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Longitude</p>
              <p className="font-mono font-medium">{vehicle.lng.toFixed(6)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-muted/30 border text-center">
          <MapPin className="w-5 h-5 mx-auto mb-1 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No GPS signal available</p>
        </div>
      )}

      {/* Footer - Last Update */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Last update:</span>
        </div>
        {vehicle.lastUpdate ? (
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {formatDistanceToNow(new Date(vehicle.lastUpdate), { addSuffix: true })}
            </span>
            <span className="text-muted-foreground/60">•</span>
            <span className="font-mono text-[10px]">
              {format(new Date(vehicle.lastUpdate), "HH:mm:ss")}
            </span>
          </div>
        ) : (
          <span>Unknown</span>
        )}
      </div>
    </div>
  );
};

export default VehicleHoverCard;
