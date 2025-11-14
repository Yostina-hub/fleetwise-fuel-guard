import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Gauge, 
  MapPin, 
  Power, 
  Activity,
  Wifi,
  WifiOff,
  Clock,
  Satellite
} from "lucide-react";
import { VehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { formatDistanceToNow } from "date-fns";
import { GpsSignalIndicator } from "@/components/GpsSignalIndicator";

interface LiveTelemetryCardProps {
  plate: string;
  telemetry: VehicleTelemetry | null;
  maxSpeed: number;
  governorActive: boolean;
  isOnline: boolean;
}

export const LiveTelemetryCard = ({ 
  plate, 
  telemetry, 
  maxSpeed, 
  governorActive,
  isOnline 
}: LiveTelemetryCardProps) => {
  const currentSpeed = telemetry?.speed_kmh || 0;
  const speedPercentage = (currentSpeed / maxSpeed) * 100;
  const isOverSpeed = currentSpeed > maxSpeed;
  
  return (
    <Card className="border-2 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            🚗 {plate}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={isOnline ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Offline
                </>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Speed Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gauge className="h-4 w-4" />
              Current Speed
            </div>
            <Badge 
              variant={isOverSpeed ? "destructive" : "outline"}
              className="text-lg px-3 py-1"
            >
              {currentSpeed.toFixed(0)} km/h
            </Badge>
          </div>
          
          {/* Speed Progress Bar */}
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${
                isOverSpeed ? 'bg-destructive' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(speedPercentage, 100)}%` }}
            />
            {/* Max Speed Marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-border"
              style={{ left: '100%' }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 km/h</span>
            <span className="font-medium">Limit: {maxSpeed} km/h</span>
          </div>
        </div>

        {/* Governor Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Power className={`h-4 w-4 ${governorActive ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="text-sm font-medium">Speed Governor</span>
          </div>
          <Badge 
            variant={governorActive ? "default" : "secondary"}
            className={governorActive ? "bg-green-600" : ""}
          >
            {governorActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* GPS Position */}
        {telemetry?.latitude && telemetry?.longitude ? (
          <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <MapPin className="h-4 w-4" />
              GPS Location
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Lat:</span>
                <span className="ml-1 font-mono">{telemetry.latitude.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Lng:</span>
                <span className="ml-1 font-mono">{telemetry.longitude.toFixed(6)}</span>
              </div>
            </div>
            {telemetry.heading !== undefined && (
              <div className="text-xs">
                <span className="text-muted-foreground">Heading:</span>
                <span className="ml-1 font-mono">{telemetry.heading.toFixed(0)}°</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mx-auto mb-1 opacity-50" />
            No GPS signal
          </div>
        )}

        {/* GPS Signal Quality */}
        <GpsSignalIndicator
          signalStrength={telemetry?.gps_signal_strength}
          satellitesCount={telemetry?.gps_satellites_count}
          hdop={telemetry?.gps_hdop}
          fixType={telemetry?.gps_fix_type}
          showDetails={true}
          variant="default"
        />

        {/* Engine Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4" />
            Engine
          </div>
          <Badge variant={telemetry?.engine_on ? "default" : "outline"}>
            {telemetry?.engine_on ? "Running" : "Off"}
          </Badge>
        </div>

        {/* Last Update */}
        {telemetry?.last_communication_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Clock className="h-3 w-3" />
            Last update: {formatDistanceToNow(new Date(telemetry.last_communication_at), { addSuffix: true })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
