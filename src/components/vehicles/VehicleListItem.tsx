import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useVehicleFuelStatus } from "@/hooks/useVehicleFuelStatus";
import {
  Signal,
  Snowflake,
  Power,
  MapPin,
  Clock,
  Route,
  Gauge,
  RefreshCw,
  Settings,
  Car,
  Bus,
  Truck,
  Droplets,
  Fuel,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

interface VehicleListItemProps {
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
    ignitionOn?: boolean;
    acOn?: boolean;
    deviceConnected?: boolean;
    distanceFromLastStop?: number;
    durationFromLastStop?: number;
    poi?: string;
    address?: string;
    distance?: number;
  };
  isSelected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onRefresh?: () => void;
  onSettings?: () => void;
}

// Get vehicle type icon based on make
const getVehicleIcon = (make?: string, status?: string) => {
  const statusColors: Record<string, string> = {
    moving: "text-green-500",
    idle: "text-yellow-500",
    offline: "text-red-500",
    stopped: "text-red-500",
  };
  const color = statusColors[status || "offline"] || "text-muted-foreground";
  const makeLower = make?.toLowerCase() || "";
  
  if (makeLower.includes("bus") || makeLower.includes("coaster")) {
    return <Bus className={cn("w-10 h-10", color)} />;
  }
  if (makeLower.includes("truck") || makeLower.includes("lorry")) {
    return <Truck className={cn("w-10 h-10", color)} />;
  }
  return <Car className={cn("w-10 h-10", color)} />;
};

export const VehicleListItem = ({
  vehicle,
  isSelected = false,
  onClick,
  onDoubleClick,
  onRefresh,
  onSettings,
}: VehicleListItemProps) => {
  const { fuelStatusMap } = useVehicleFuelStatus();
  const fuelStatus = fuelStatusMap.get(vehicle.id);
  const formatDuration = (minutes?: number) => {
    if (!minutes) return "--:--:--";
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = 0;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatLastUpdate = (dateStr?: string) => {
    if (!dateStr) return "--/--/---- --:--:--";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm:ss");
    } catch {
      return "--/--/---- --:--:--";
    }
  };

  const getSinceDate = (dateStr?: string) => {
    if (!dateStr) return "--/--/---- --:--:--";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm:ss");
    } catch {
      return "--/--/---- --:--:--";
    }
  };

  return (
    <div
      className={cn(
        "border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md",
        isSelected 
          ? "border-primary bg-primary/5 shadow-sm" 
          : "border-border bg-card hover:border-primary/30"
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {/* Row 1: Vehicle Image + Plate + Icons */}
      <div className="flex items-start gap-3 mb-3">
        {/* Vehicle Icon/Image */}
        <div className="w-16 h-12 rounded bg-muted/50 flex items-center justify-center shrink-0">
          {getVehicleIcon(vehicle.make, vehicle.status)}
        </div>

        {/* Plate Number + Make */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-foreground text-lg leading-tight">
            {vehicle.plate}
          </h4>
          <p className="text-xs text-muted-foreground truncate">
            {vehicle.make} {vehicle.model}
          </p>
        </div>

        {/* Status Icons */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              onRefresh?.();
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          
          {/* GPS Signal */}
          <div
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center",
              vehicle.deviceConnected ? "bg-green-100" : "bg-red-100"
            )}
          >
            <Signal
              className={cn(
                "w-3 h-3",
                vehicle.deviceConnected ? "text-green-600" : "text-red-600"
              )}
            />
          </div>

          {/* AC Status */}
          <div
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center",
              vehicle.acOn ? "bg-blue-100" : "bg-muted"
            )}
          >
            <Snowflake
              className={cn(
                "w-3 h-3",
                vehicle.acOn ? "text-blue-600" : "text-muted-foreground"
              )}
            />
          </div>

          {/* Ignition Status */}
          <div
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center",
              vehicle.ignitionOn ? "bg-green-100" : "bg-red-100"
            )}
          >
            <Power
              className={cn(
                "w-3 h-3",
                vehicle.ignitionOn ? "text-green-600" : "text-red-600"
              )}
            />
          </div>

          {/* Fuel Sensor Status */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center",
                    fuelStatus?.has_fuel_sensor ? "bg-blue-100" : "bg-muted"
                  )}
                >
                  <Droplets
                    className={cn(
                      "w-3 h-3",
                      fuelStatus?.has_fuel_sensor ? "text-blue-600" : "text-muted-foreground"
                    )}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {fuelStatus?.has_fuel_sensor ? (
                  <>
                    <p>Fuel sensor active</p>
                    <p className="text-xs text-muted-foreground">
                      {fuelStatus.last_fuel_reading?.toFixed(1)}% • {fuelStatus.fuel_records_count} readings
                    </p>
                  </>
                ) : (
                  <p>No fuel sensor</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              onSettings?.();
            }}
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Row 2: LU + SPD */}
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
            <Clock className="w-3 h-3 text-red-600" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-muted-foreground font-medium block leading-tight">
              LU
            </span>
            <span className="text-xs font-medium text-foreground block truncate">
              {formatLastUpdate(vehicle.lastUpdate)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
            <Gauge className="w-3 h-3 text-red-600" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-medium block leading-tight">
              SPD
            </span>
            <span className="text-xs font-medium text-foreground">
              {vehicle.speed} kmph
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Since + Distance */}
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
            <Clock className="w-3 h-3 text-green-600" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-muted-foreground font-medium block leading-tight">
              Since
            </span>
            <span className="text-xs font-medium text-foreground block truncate">
              {getSinceDate(vehicle.lastUpdate)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
            <Route className="w-3 h-3 text-red-600" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-medium block leading-tight">
              DISTANCE
            </span>
            <span className="text-xs font-medium text-foreground">
              {vehicle.distance ?? vehicle.distanceFromLastStop ?? 0} km
            </span>
          </div>
        </div>
      </div>

      {/* Row 4: POI */}
      <div className="flex items-start gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
          <MapPin className="w-3 h-3 text-red-600" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] text-muted-foreground font-medium block leading-tight">
            POI
          </span>
          <span className="text-xs font-medium text-foreground block truncate">
            {vehicle.poi || "--"}
          </span>
        </div>
      </div>

      {/* Row 5: Address */}
      <div className="flex items-start gap-2">
        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <MapPin className="w-3 h-3 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] text-muted-foreground font-medium block leading-tight">
            Address
          </span>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {vehicle.address || (vehicle.lat && vehicle.lng 
              ? `${vehicle.lat.toFixed(5)}, ${vehicle.lng.toFixed(5)}`
              : "Location unavailable"
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VehicleListItem;
