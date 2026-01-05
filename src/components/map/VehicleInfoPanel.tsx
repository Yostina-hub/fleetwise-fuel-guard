import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  Fuel, 
  Gauge, 
  MapPin, 
  Navigation2, 
  Satellite, 
  User, 
  Phone,
  Play,
  Settings,
  ExternalLink,
  Route,
  AlertTriangle,
  Signal
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Vehicle {
  id: string;
  plate: string;
  status: 'moving' | 'idle' | 'stopped' | 'offline';
  lat: number;
  lng: number;
  speed: number;
  fuel: number;
  heading?: number;
  engine_on?: boolean;
  gps_signal_strength?: number;
  gps_satellites_count?: number;
  gps_hdop?: number;
  speed_limit?: number;
  driverName?: string;
  driverPhone?: string;
  lastSeen?: string;
  isOffline?: boolean;
}

interface VehicleInfoPanelProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onStreetView?: (lat: number, lng: number, plate: string) => void;
  onDirections?: (lat: number, lng: number, plate: string) => void;
  onTripReplay?: (vehicleId: string, plate: string) => void;
  onManageAsset?: (vehicleId: string, plate: string) => void;
}

export const VehicleInfoPanel = ({
  vehicle,
  onClose,
  onStreetView,
  onDirections,
  onTripReplay,
  onManageAsset,
}: VehicleInfoPanelProps) => {
  const [address, setAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Fetch address when vehicle changes
  useEffect(() => {
    if (!vehicle) {
      setAddress('');
      return;
    }

    const fetchAddress = async () => {
      if (!isFinite(vehicle.lat) || !isFinite(vehicle.lng)) {
        setAddress('Location unavailable');
        return;
      }

      setIsLoadingAddress(true);
      try {
        const token = localStorage.getItem('mapbox_token') || import.meta.env.VITE_MAPBOX_TOKEN;
        if (!token) {
          setAddress(`${vehicle.lat.toFixed(6)}, ${vehicle.lng.toFixed(6)}`);
          return;
        }

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${vehicle.lng.toFixed(6)},${vehicle.lat.toFixed(6)}.json?access_token=${token}&types=address&limit=1&language=en`;
        const res = await fetch(url);
        if (!res.ok) {
          setAddress(`${vehicle.lat.toFixed(6)}, ${vehicle.lng.toFixed(6)}`);
          return;
        }
        
        const json = await res.json();
        const features = json?.features || [];
        if (features.length > 0) {
          setAddress(features[0].place_name || `${vehicle.lat.toFixed(4)}°N, ${vehicle.lng.toFixed(4)}°E`);
        } else {
          setAddress(`Near ${vehicle.lat.toFixed(4)}°N, ${vehicle.lng.toFixed(4)}°E`);
        }
      } catch {
        setAddress(`${vehicle.lat.toFixed(6)}, ${vehicle.lng.toFixed(6)}`);
      } finally {
        setIsLoadingAddress(false);
      }
    };

    fetchAddress();
  }, [vehicle?.id, vehicle?.lat, vehicle?.lng]);

  const getRelativeTime = (dateStr: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const getHeadingLabel = (heading: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(heading / 45) % 8;
    return directions[index];
  };

  if (!vehicle) return null;

  const gpsStrength = vehicle.gps_signal_strength ?? 0;
  const gpsSignalLabel = gpsStrength >= 80 ? 'Strong' : gpsStrength >= 50 ? 'Moderate' : gpsStrength > 0 ? 'Weak' : 'No signal';
  const relativeTime = vehicle.lastSeen ? getRelativeTime(vehicle.lastSeen) : 'N/A';
  const speedLimit = vehicle.speed_limit || 80;
  const isOverspeeding = vehicle.speed > speedLimit;
  const headingLabel = vehicle.heading !== undefined ? getHeadingLabel(vehicle.heading) : '';
  const fuelStatus = vehicle.fuel < 15 ? 'critical' : vehicle.fuel < 25 ? 'low' : 'normal';

  const statusColors = {
    moving: 'bg-emerald-500',
    idle: 'bg-amber-500',
    stopped: 'bg-slate-400',
    offline: 'bg-rose-500',
  };

  return (
    <Card className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 w-[420px] max-w-[calc(100vw-32px)] shadow-2xl border-border/50 bg-background/98 backdrop-blur-xl">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className={cn("w-3 h-3 rounded-full animate-pulse", statusColors[vehicle.status])} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{vehicle.plate}</span>
                <Badge variant="outline" className="text-xs uppercase">
                  {vehicle.status}
                </Badge>
              </div>
              {vehicle.status === 'moving' && vehicle.heading !== undefined && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Navigation2 
                    className="w-3 h-3 text-emerald-500" 
                    style={{ transform: `rotate(${vehicle.heading}deg)` }} 
                  />
                  Heading {headingLabel} ({Math.round(vehicle.heading)}°)
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right text-xs">
              <div className="text-muted-foreground">Last Update</div>
              <div className={cn(
                "font-semibold",
                relativeTime === 'Just now' || (relativeTime.includes('m') && parseInt(relativeTime) < 5) 
                  ? "text-emerald-500" 
                  : relativeTime.includes('h') 
                    ? "text-amber-500" 
                    : "text-muted-foreground"
              )}>
                {relativeTime}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-[50vh]">
          <div className="p-4 space-y-3">
            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className={cn("text-xl font-bold", isOverspeeding && "text-destructive")}>
                  {vehicle.speed}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">km/h</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className={cn(
                  "text-xl font-bold",
                  fuelStatus === 'critical' ? "text-destructive" : fuelStatus === 'low' ? "text-amber-500" : "text-emerald-500"
                )}>
                  {vehicle.fuel}%
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">Fuel</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className={cn("text-base font-bold", vehicle.engine_on ? "text-emerald-500" : "text-muted-foreground")}>
                  {vehicle.engine_on ? '🟢 ON' : '⚫ OFF'}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">Ignition</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
                <Signal className={cn(
                  "w-5 h-5 mx-auto",
                  gpsStrength >= 80 ? "text-emerald-500" : gpsStrength >= 50 ? "text-amber-500" : gpsStrength > 0 ? "text-destructive" : "text-muted-foreground"
                )} />
                <div className="text-[10px] text-muted-foreground font-medium">{gpsSignalLabel}</div>
              </div>
            </div>

            {/* Alerts */}
            {isOverspeeding && (
              <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-semibold">OVERSPEEDING</span>
                </div>
                <span className="text-sm text-destructive">
                  {vehicle.speed} km/h <span className="text-destructive/70">(limit: {speedLimit})</span>
                </span>
              </div>
            )}

            {fuelStatus === 'critical' && (
              <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-amber-600">
                  <Fuel className="w-4 h-4" />
                  <span className="text-sm font-semibold">LOW FUEL WARNING</span>
                </div>
                <span className="text-sm text-amber-600">{vehicle.fuel}% remaining</span>
              </div>
            )}

            {/* Driver Info */}
            <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Driver</div>
              {vehicle.driverName ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {vehicle.driverName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{vehicle.driverName}</div>
                    {vehicle.driverPhone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {vehicle.driverPhone}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">No driver assigned</div>
              )}
            </div>

            {/* GPS & Coordinates */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">GPS Info</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Satellites:</span>
                    <span className="font-semibold">{vehicle.gps_satellites_count || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Signal:</span>
                    <span className={cn(
                      "font-semibold",
                      gpsStrength >= 80 ? "text-emerald-500" : gpsStrength >= 50 ? "text-amber-500" : "text-destructive"
                    )}>{gpsStrength}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">HDOP:</span>
                    <span className="font-semibold">{vehicle.gps_hdop?.toFixed(1) || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Coordinates</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lat:</span>
                    <span className="font-mono font-semibold">{vehicle.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lng:</span>
                    <span className="font-mono font-semibold">{vehicle.lng.toFixed(6)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider mb-1">Current Location</div>
                  <div className="text-sm text-emerald-700 font-medium leading-relaxed">
                    {isLoadingAddress ? 'Locating...' : address}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex justify-center gap-2 pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-10 gap-2"
                onClick={() => onStreetView?.(vehicle.lat, vehicle.lng, vehicle.plate)}
              >
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="text-xs">Street View</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-10 gap-2"
                onClick={() => onDirections?.(vehicle.lat, vehicle.lng, vehicle.plate)}
              >
                <Navigation2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs">Directions</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-10 gap-2"
                onClick={() => onTripReplay?.(vehicle.id, vehicle.plate)}
              >
                <Play className="w-4 h-4 text-purple-500" />
                <span className="text-xs">Trip Replay</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-10 gap-2"
                onClick={() => onManageAsset?.(vehicle.id, vehicle.plate)}
              >
                <Settings className="w-4 h-4 text-orange-500" />
                <span className="text-xs">Manage</span>
              </Button>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
