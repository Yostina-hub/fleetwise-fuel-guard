import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Gauge,
  Navigation,
  MapPin,
  Clock,
  Route,
  Timer,
  Crosshair,
  Users,
  History,
  MoreHorizontal,
  X,
  Compass,
  Fuel,
  Thermometer,
  Power,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface VehicleDetailPanelProps {
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
    odometer?: number;
    todayDistance?: number;
    odoDuration?: number;
    distanceFromLastStop?: number;
    durationFromLastStop?: number;
    ignitionOn?: boolean;
    acOn?: boolean;
    alias?: string;
  };
  onClose: () => void;
  onDrivers?: () => void;
  onTrack?: () => void;
  onHistory?: () => void;
}

export const VehicleDetailPanel = ({
  vehicle,
  onClose,
  onDrivers,
  onTrack,
  onHistory,
}: VehicleDetailPanelProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCoordinates = () => {
    if (vehicle.lat && vehicle.lng) {
      navigator.clipboard.writeText(`${vehicle.lat},${vehicle.lng}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "--";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    }
    return `00:${mins.toString().padStart(2, "0")}`;
  };

  const formatDistance = (km?: number) => {
    if (km === undefined || km === null) return "--";
    return `${km.toFixed(2)} km`;
  };

  return (
    <div className="bg-background border-t shadow-lg animate-in slide-in-from-bottom-4">
      {/* Header Row */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-foreground">{vehicle.plate}</h3>
          <Badge
            variant="outline"
            className={cn(
              "text-xs capitalize",
              vehicle.status === "moving" && "border-green-500 text-green-600 bg-green-50",
              vehicle.status === "idle" && "border-yellow-500 text-yellow-600 bg-yellow-50",
              vehicle.status === "stopped" && "border-red-500 text-red-600 bg-red-50",
              vehicle.status === "offline" && "border-muted text-muted-foreground"
            )}
          >
            {vehicle.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDrivers}
            className="gap-1.5 h-8"
          >
            <Users className="w-3.5 h-3.5" />
            Drivers
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onTrack}
            className="gap-1.5 h-8"
          >
            <Compass className="w-3.5 h-3.5" />
            Track
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onHistory}
            className="gap-1.5 h-8"
          >
            <History className="w-3.5 h-3.5" />
            History
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                More
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Send Command</DropdownMenuItem>
              <DropdownMenuItem>View Reports</DropdownMenuItem>
              <DropdownMenuItem>Edit Vehicle</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-5 gap-6 p-4">
        {/* Row 1: Speed, Odometer, Today Distance, Ododuration */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
            <Gauge className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Speed</p>
            <p className="font-semibold text-foreground">{vehicle.speed} kmph</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
            <Navigation className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Odometer</p>
            <p className="font-semibold text-foreground">
              {vehicle.odometer ? `${vehicle.odometer.toLocaleString()} km` : "-- km"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
            <Route className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Today Distance</p>
            <p className="font-semibold text-foreground">
              {vehicle.todayDistance ? `${vehicle.todayDistance} km` : "-- km"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
            <Timer className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ododuration</p>
            <p className="font-semibold text-foreground">
              {vehicle.odoDuration ? `${vehicle.odoDuration} hours` : "-- hours"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
            <Power className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ignition</p>
            <p className="font-semibold text-foreground">
              {vehicle.ignitionOn ? "On" : "Off"}
            </p>
          </div>
        </div>

        {/* Row 2: Distance From Last Stop, Duration From Last Stop, Coordinates, Last Updated, Fuel */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Distance From Last Stop</p>
            <p className="font-semibold text-foreground">
              {formatDistance(vehicle.distanceFromLastStop)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center">
            <Timer className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duration From Last Stop</p>
            <p className="font-semibold text-foreground">
              {formatDuration(vehicle.durationFromLastStop)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Co-ordinates</p>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyCoordinates}
                className="font-semibold text-primary hover:underline text-sm"
              >
                {vehicle.lat && vehicle.lng
                  ? `${vehicle.lat.toFixed(5)},${vehicle.lng.toFixed(5)}`
                  : "--"}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleCopyCoordinates}
              >
                <Share2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Updated</p>
            <p className="font-semibold text-foreground text-sm">
              {vehicle.lastUpdate
                ? format(new Date(vehicle.lastUpdate), "dd/MM/yyyy HH:mm:ss")
                : "--"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
            <Fuel className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fuel</p>
            <p className="font-semibold text-foreground">
              {vehicle.fuel !== undefined ? `${vehicle.fuel}%` : "0.00/0 L"}
            </p>
          </div>
        </div>
      </div>

      {/* Alias Row */}
      {vehicle.alias && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Alias:</span>
            <span className="font-medium text-foreground">{vehicle.alias}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleDetailPanel;
