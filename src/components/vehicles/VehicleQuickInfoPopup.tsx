import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Power,
  Share2,
  Lock,
  AlertTriangle,
  CircleDot,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface VehicleQuickInfoPopupProps {
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
    lockStatus?: string;
    panic?: boolean;
    source?: string;
    destination?: string;
  };
  onClose: () => void;
  onDrivers?: () => void;
  onTrack?: () => void;
  onHistory?: () => void;
}

// Metric item component for consistent styling
const MetricItem = ({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  valueClassName,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) => (
  <div className="flex items-center gap-3 py-2">
    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", iconBg)}>
      <Icon className={cn("w-4 h-4", iconColor)} />
    </div>
    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <span className={cn("text-sm font-semibold text-foreground text-right", valueClassName)}>
        {value}
      </span>
    </div>
  </div>
);

export const VehicleQuickInfoPopup = ({
  vehicle,
  onClose,
  onDrivers,
  onTrack,
  onHistory,
}: VehicleQuickInfoPopupProps) => {
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
    const mins = Math.floor(minutes % 60);
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  const formatDistance = (km?: number) => {
    if (km === undefined || km === null) return "--";
    return `${km.toFixed(2)} km`;
  };

  return (
    <Card className="w-[320px] shadow-xl border-border/50 bg-background/95 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Header with Action Buttons */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDrivers}
              className="h-7 px-2 text-xs"
            >
              Drivers
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onTrack}
              className="h-7 px-2 text-xs"
            >
              Track
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onHistory}
              className="h-7 px-2 text-xs"
            >
              History
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                  More
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Send Command</DropdownMenuItem>
                <DropdownMenuItem>View Reports</DropdownMenuItem>
                <DropdownMenuItem>Edit Vehicle</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Scrollable Content Area */}
        <ScrollArea className="max-h-[400px]">
          <div className="p-3 space-y-0.5 divide-y divide-border/30">
            {/* Distance From Last Stop */}
            <MetricItem
              icon={MapPin}
              iconBg="bg-destructive/10"
              iconColor="text-destructive"
              label="Distance From Last Stop"
              value={formatDistance(vehicle.distanceFromLastStop)}
            />

            {/* Duration From Last Stop */}
            <MetricItem
              icon={Timer}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              label="Duration From Last Stop"
              value={formatDuration(vehicle.durationFromLastStop)}
            />

            {/* Speed */}
            <MetricItem
              icon={Gauge}
              iconBg="bg-success/10"
              iconColor="text-success"
              label="Speed"
              value={`${vehicle.speed} kmph`}
            />

            {/* Last Updated */}
            <MetricItem
              icon={Clock}
              iconBg="bg-muted"
              iconColor="text-muted-foreground"
              label="Last Updated"
              value={
                vehicle.lastUpdate
                  ? format(new Date(vehicle.lastUpdate), "dd/MM/yyyy HH:mm:ss")
                  : "--"
              }
            />

            {/* Odometer */}
            <MetricItem
              icon={Navigation}
              iconBg="bg-success/10"
              iconColor="text-success"
              label="Odometer"
              value={vehicle.odometer ? vehicle.odometer.toLocaleString() : "--"}
            />

            {/* Ododuration */}
            <MetricItem
              icon={Timer}
              iconBg="bg-warning/10"
              iconColor="text-warning"
              label="Ododuration"
              value={vehicle.odoDuration ? `${vehicle.odoDuration} hours` : "-- hours"}
            />

            {/* Alias */}
            <MetricItem
              icon={Users}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              label="Alias"
              value={vehicle.alias || vehicle.make || "--"}
            />

            {/* Today Distance */}
            <MetricItem
              icon={Route}
              iconBg="bg-success/10"
              iconColor="text-success"
              label="Today Distance"
              value={vehicle.todayDistance ? `${vehicle.todayDistance} km` : "-- km"}
            />

            {/* Co-ordinates */}
            <div className="flex items-center gap-3 py-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Crosshair className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Co-ordinates</span>
                <button
                  onClick={handleCopyCoordinates}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {vehicle.lat && vehicle.lng
                    ? `${vehicle.lat.toFixed(5)}, ${vehicle.lng.toFixed(5)}`
                    : "--"}
                </button>
              </div>
            </div>

            {/* Lock Status */}
            <MetricItem
              icon={Lock}
              iconBg="bg-muted"
              iconColor="text-muted-foreground"
              label="Lock Status"
              value={vehicle.lockStatus || "UNLOCK"}
              valueClassName={vehicle.lockStatus === "LOCK" ? "text-destructive" : "text-success"}
            />

            {/* Panic */}
            <MetricItem
              icon={AlertTriangle}
              iconBg={vehicle.panic ? "bg-destructive/10" : "bg-muted"}
              iconColor={vehicle.panic ? "text-destructive" : "text-muted-foreground"}
              label="Panic"
              value={vehicle.panic ? "ACTIVE" : "--"}
              valueClassName={vehicle.panic ? "text-destructive" : undefined}
            />
          </div>

          {/* Current Trip Section */}
          {(vehicle.source || vehicle.destination) && (
            <div className="p-3 border-t bg-muted/20">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Current Trip</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CircleDot className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground">Source</span>
                    <p className="text-sm font-medium text-foreground">
                      {vehicle.source || "--"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground">Destination</span>
                    <p className="text-sm font-medium text-foreground">
                      {vehicle.destination || "--"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default VehicleQuickInfoPopup;
