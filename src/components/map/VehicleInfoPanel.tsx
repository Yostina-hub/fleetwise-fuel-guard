import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  X, 
  Fuel, 
  MapPin, 
  Navigation2, 
  User, 
  Phone,
  Play,
  Settings,
  Route,
  AlertTriangle,
  Signal,
  Compass,
  Gauge,
  Power,
  Focus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Vehicle {
  id: string;
  plate: string;
  status: 'moving' | 'idle' | 'stopped' | 'offline';
  lat?: number;
  lng?: number;
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
  followMode?: boolean;
  onToggleFollow?: () => void;
}

export const VehicleInfoPanel = ({
  vehicle,
  onClose,
  onStreetView,
  onDirections,
  onTripReplay,
  onManageAsset,
  followMode = false,
  onToggleFollow,
}: VehicleInfoPanelProps) => {
  const [address, setAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const hasLocation = Number.isFinite(vehicle?.lat) && Number.isFinite(vehicle?.lng);

  // Fetch address when vehicle changes
  useEffect(() => {
    if (!vehicle) {
      setAddress('');
      return;
    }

    const fetchAddress = async () => {
      if (!Number.isFinite(vehicle.lat) || !Number.isFinite(vehicle.lng)) {
        setAddress('Location unavailable');
        return;
      }

      setIsLoadingAddress(true);
      try {
        const token = localStorage.getItem('mapbox_token') || import.meta.env.VITE_MAPBOX_TOKEN;
        if (!token) {
          setAddress(`${vehicle.lat!.toFixed(6)}, ${vehicle.lng!.toFixed(6)}`);
          return;
        }

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${vehicle.lng!.toFixed(6)},${vehicle.lat!.toFixed(6)}.json?access_token=${token}&types=address&limit=1&language=en`;
        const res = await fetch(url);
        if (!res.ok) {
          setAddress(`${vehicle.lat!.toFixed(6)}, ${vehicle.lng!.toFixed(6)}`);
          return;
        }
        
        const json = await res.json();
        const features = json?.features || [];
        if (features.length > 0) {
          setAddress(features[0].place_name || `${vehicle.lat!.toFixed(4)}°N, ${vehicle.lng!.toFixed(4)}°E`);
        } else {
          setAddress(`Near ${vehicle.lat!.toFixed(4)}°N, ${vehicle.lng!.toFixed(4)}°E`);
        }
      } catch {
        if (Number.isFinite(vehicle.lat) && Number.isFinite(vehicle.lng)) {
          setAddress(`${vehicle.lat!.toFixed(6)}, ${vehicle.lng!.toFixed(6)}`);
        } else {
          setAddress('Location unavailable');
        }
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

  const statusConfig = {
    moving: { color: 'bg-emerald-500', textColor: 'text-emerald-500', label: 'Moving', shadowColor: 'shadow-emerald-500/30' },
    idle: { color: 'bg-amber-500', textColor: 'text-amber-500', label: 'Idle', shadowColor: 'shadow-amber-500/30' },
    stopped: { color: 'bg-slate-400', textColor: 'text-slate-400', label: 'Stopped', shadowColor: 'shadow-slate-400/30' },
    offline: { color: 'bg-rose-500', textColor: 'text-rose-500', label: 'Offline', shadowColor: 'shadow-rose-500/30' },
  };

  const currentStatus = statusConfig[vehicle.status];

  return (
    <TooltipProvider>
      <Card className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 w-[480px] max-w-[calc(100vw-32px)] shadow-2xl border-0 bg-gradient-to-b from-background to-background/95 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header with gradient accent */}
          <div className="relative">
            {/* Status accent bar */}
            <div className={cn("absolute top-0 left-0 right-0 h-1", currentStatus.color)} />
            
            <div className="flex items-center justify-between p-4 pb-3 pt-5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                  currentStatus.color, currentStatus.shadowColor
                )}>
                  {vehicle.status === 'moving' ? (
                    <Navigation2 className="w-5 h-5 text-white" style={{ transform: `rotate(${vehicle.heading || 0}deg)` }} />
                  ) : vehicle.status === 'idle' ? (
                    <Power className="w-5 h-5 text-white" />
                  ) : (
                    <Gauge className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xl tracking-tight">{vehicle.plate}</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] uppercase font-bold px-2 py-0 h-5 border-0",
                        vehicle.status === 'moving' && "bg-emerald-500/15 text-emerald-600",
                        vehicle.status === 'idle' && "bg-amber-500/15 text-amber-600",
                        vehicle.status === 'stopped' && "bg-slate-400/15 text-slate-500",
                        vehicle.status === 'offline' && "bg-rose-500/15 text-rose-600"
                      )}
                    >
                      {currentStatus.label}
                    </Badge>
                  </div>
                  {vehicle.status === 'moving' && vehicle.heading !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Compass className="w-3 h-3" aria-hidden="true" />
                      Heading {headingLabel} ({Math.round(vehicle.heading)}°)
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Last Update</div>
                  <div className={cn(
                    "text-sm font-semibold",
                    relativeTime === 'Just now' || (relativeTime.includes('m') && parseInt(relativeTime) < 5) 
                      ? "text-emerald-500" 
                      : relativeTime.includes('h') 
                        ? "text-amber-500" 
                        : "text-muted-foreground"
                  )}>
                    {relativeTime}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive" 
                  onClick={onClose}
                  aria-label="Close panel"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="max-h-[45vh] overflow-auto">
            <div className="px-4 pb-3 space-y-3 pr-3">
              {/* Metrics Grid - Modern Cards */}
              <div className="grid grid-cols-4 gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "text-center p-3 rounded-xl border transition-all cursor-default",
                      isOverspeeding 
                        ? "bg-destructive/10 border-destructive/30" 
                        : "bg-muted/40 border-border/50 hover:bg-muted/60"
                    )}>
                      <div className={cn(
                        "text-2xl font-bold tabular-nums",
                        isOverspeeding ? "text-destructive" : "text-foreground"
                      )}>
                        {vehicle.speed}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">km/h</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Speed {isOverspeeding ? `(Over limit: ${speedLimit} km/h)` : ''}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "text-center p-3 rounded-xl border transition-all cursor-default",
                      fuelStatus === 'critical' 
                        ? "bg-destructive/10 border-destructive/30" 
                        : fuelStatus === 'low' 
                          ? "bg-amber-500/10 border-amber-500/30" 
                          : "bg-muted/40 border-border/50 hover:bg-muted/60"
                    )}>
                      <div className={cn(
                        "text-2xl font-bold tabular-nums",
                        fuelStatus === 'critical' ? "text-destructive" : 
                        fuelStatus === 'low' ? "text-amber-500" : "text-emerald-500"
                      )}>
                        {vehicle.fuel}%
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Fuel</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Fuel Level</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center p-3 bg-muted/40 rounded-xl border border-border/50 hover:bg-muted/60 transition-all cursor-default">
                      <div className={cn(
                        "text-lg font-bold flex items-center justify-center gap-1.5",
                        vehicle.engine_on ? "text-emerald-500" : "text-muted-foreground"
                      )}>
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          vehicle.engine_on ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
                        )} />
                        {vehicle.engine_on ? 'ON' : 'OFF'}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Ignition</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Ignition Status</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center p-3 bg-muted/40 rounded-xl border border-border/50 hover:bg-muted/60 transition-all cursor-default">
                      <Signal className={cn(
                        "w-6 h-6 mx-auto",
                        gpsStrength >= 80 ? "text-emerald-500" : 
                        gpsStrength >= 50 ? "text-amber-500" : 
                        gpsStrength > 0 ? "text-destructive" : "text-muted-foreground"
                      )} aria-hidden="true" />
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">{gpsSignalLabel}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>GPS Signal: {gpsStrength}%</TooltipContent>
                </Tooltip>
              </div>

              {/* Alerts Section */}
              {(isOverspeeding || fuelStatus === 'critical') && (
                <div className="space-y-2">
                  {isOverspeeding && (
                    <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                        <span className="text-sm font-semibold">OVERSPEEDING</span>
                      </div>
                      <span className="text-sm text-destructive font-medium">
                        {vehicle.speed} km/h <span className="text-destructive/60">(limit: {speedLimit})</span>
                      </span>
                    </div>
                  )}

                  {fuelStatus === 'critical' && (
                    <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <div className="flex items-center gap-2 text-amber-600">
                        <Fuel className="w-4 h-4" aria-hidden="true" />
                        <span className="text-sm font-semibold">LOW FUEL</span>
                      </div>
                      <span className="text-sm text-amber-600 font-medium">{vehicle.fuel}% remaining</span>
                    </div>
                  )}
                </div>
              )}

              {/* Driver Info */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Driver</div>
                {vehicle.driverName ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md">
                      {vehicle.driverName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{vehicle.driverName}</div>
                      {vehicle.driverPhone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" aria-hidden="true" />
                          {vehicle.driverPhone}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" aria-hidden="true" />
                    <span className="italic">No driver assigned</span>
                  </div>
                )}
              </div>

              {/* GPS & Coordinates - Compact Row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">GPS Info</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Satellites:</span>
                      <span className="font-semibold tabular-nums">{vehicle.gps_satellites_count || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Signal:</span>
                      <span className={cn(
                        "font-semibold tabular-nums",
                        gpsStrength >= 80 ? "text-emerald-500" : gpsStrength >= 50 ? "text-amber-500" : "text-destructive"
                      )}>{gpsStrength}%</span>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span className="text-muted-foreground">HDOP:</span>
                      <span className="font-semibold tabular-nums">{vehicle.gps_hdop?.toFixed(1) || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                 <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Coordinates</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lat:</span>
                       <span className="font-mono font-semibold tabular-nums">{hasLocation ? vehicle.lat!.toFixed(6) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lng:</span>
                       <span className="font-mono font-semibold tabular-nums">{hasLocation ? vehicle.lng!.toFixed(6) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location with Loading Skeleton */}
              <div className="p-3 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider mb-0.5">Current Location</div>
                    {isLoadingAddress ? (
                      <div className="space-y-1.5 mt-1">
                        <div className="h-3 bg-emerald-500/20 animate-pulse rounded w-full" />
                        <div className="h-3 bg-emerald-500/20 animate-pulse rounded w-3/4" />
                      </div>
                    ) : (
                      <div className="text-sm text-emerald-700/90 font-medium leading-relaxed">
                        {address || 'Location unavailable'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Quick Actions - ALWAYS VISIBLE outside ScrollArea */}
          <div className="p-4 pt-3 border-t border-border/50 bg-muted/30">
            <div className="grid grid-cols-5 gap-2">
              {/* Follow Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={followMode ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-12 flex-col gap-1 transition-all",
                      followMode 
                        ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600" 
                        : "bg-background hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-600"
                    )}
                    onClick={onToggleFollow}
                    aria-label={followMode ? `Stop following ${vehicle.plate}` : `Follow ${vehicle.plate} in real-time`}
                    aria-pressed={followMode}
                  >
                    <Focus className={cn("w-5 h-5", followMode ? "text-white animate-pulse" : "text-blue-500")} aria-hidden="true" />
                    <span className="text-[10px] font-medium">{followMode ? 'Following' : 'Follow'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{followMode ? 'Stop following vehicle' : 'Follow vehicle in real-time'}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-12 flex-col gap-1 bg-background hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-600 transition-all"
                    onClick={() => {
                      if (!hasLocation) return;
                      onStreetView?.(vehicle.lat!, vehicle.lng!, vehicle.plate);
                    }}
                    disabled={!hasLocation}
                    aria-label={`Open street view for ${vehicle.plate}`}
                  >
                    <MapPin className="w-5 h-5 text-cyan-500" aria-hidden="true" />
                    <span className="text-[10px] font-medium">Street View</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View location in Street View</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-12 flex-col gap-1 bg-background hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-600 transition-all"
                    onClick={() => {
                      if (!hasLocation) return;
                      onDirections?.(vehicle.lat!, vehicle.lng!, vehicle.plate);
                    }}
                    disabled={!hasLocation}
                    aria-label={`Get directions to ${vehicle.plate}`}
                  >
                    <Navigation2 className="w-5 h-5 text-emerald-500" aria-hidden="true" />
                    <span className="text-[10px] font-medium">Directions</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Get directions to vehicle</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-12 flex-col gap-1 bg-background hover:bg-purple-500/10 hover:border-purple-500/50 hover:text-purple-600 transition-all"
                    onClick={() => onTripReplay?.(vehicle.id, vehicle.plate)}
                    aria-label={`Replay trips for ${vehicle.plate}`}
                  >
                    <Route className="w-5 h-5 text-purple-500" aria-hidden="true" />
                    <span className="text-[10px] font-medium">Trip Replay</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View trip history and replay routes</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-12 flex-col gap-1 bg-background hover:bg-orange-500/10 hover:border-orange-500/50 hover:text-orange-600 transition-all"
                    onClick={() => onManageAsset?.(vehicle.id, vehicle.plate)}
                    aria-label={`Manage ${vehicle.plate}`}
                  >
                    <Settings className="w-5 h-5 text-orange-500" aria-hidden="true" />
                    <span className="text-[10px] font-medium">Manage</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open vehicle management</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
