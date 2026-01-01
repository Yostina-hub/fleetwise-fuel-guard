import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapSidebarSkeleton } from "@/components/ui/skeletons";
import StatusBadge from "@/components/StatusBadge";
import LiveTrackingMap from "@/components/map/LiveTrackingMap";
import ClusteredMap from "@/components/map/ClusteredMap";
import { NearbyVehiclesSearch } from "@/components/map/NearbyVehiclesSearch";
import { GpsJammingIndicator } from "@/components/map/GpsJammingIndicator";
import { MapPin, Navigation, Fuel, Zap, RefreshCw, WifiOff, Layers, Radar } from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { useVirtualizer } from "@tanstack/react-virtual";

// Threshold for switching to clustered map
const CLUSTER_THRESHOLD = 100;

const MapView = () => {
  const location = useLocation();
  const { vehicles: dbVehicles, loading, refetch } = useVehicles();
  const { telemetry, isVehicleOnline } = useVehicleTelemetry();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(
    location.state?.selectedVehicleId
  );
  const [autoRefresh, setAutoRefresh] = useState("30");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('satellite');
  const [mapToken, setMapToken] = useState<string>(() => localStorage.getItem('mapbox_token') || '');
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const [mapInstance, setMapInstance] = useState<any>(null);
  
  // Transform vehicles for map display with telemetry data
  const vehicles = useMemo(() => {
    return dbVehicles.map((v) => {
      const vehicleTelemetry = telemetry[v.id];
      const online = isVehicleOnline(v.id);
      
      // If device is offline or SIM card removed, mark as offline
      if (!online || !vehicleTelemetry) {
        return {
          id: v.id,
          plate: v.plate_number || 'Unknown',
          status: 'offline' as const,
          fuel: 0,
          speed: 0,
          lat: 9.03, // Default center of Addis Ababa
          lng: 38.74,
          engine_on: false,
          heading: 0,
          isOffline: true,
          gps_signal_strength: 0,
          gps_satellites_count: 0,
        };
      }
      
      return {
        id: v.id,
        plate: v.plate_number || 'Unknown',
        status: (vehicleTelemetry.engine_on ? 'moving' : 'idle') as 'moving' | 'idle' | 'stopped' | 'offline',
        fuel: vehicleTelemetry.fuel_level_percent || 0,
        speed: vehicleTelemetry.speed_kmh || 0,
        lat: vehicleTelemetry.latitude || 9.03,
        lng: vehicleTelemetry.longitude || 38.74,
        engine_on: vehicleTelemetry.engine_on,
        heading: vehicleTelemetry.heading || 0,
        isOffline: false,
        lastSeen: vehicleTelemetry.last_communication_at,
        gps_signal_strength: vehicleTelemetry.gps_signal_strength,
        gps_satellites_count: vehicleTelemetry.gps_satellites_count,
        gps_hdop: vehicleTelemetry.gps_hdop,
        gps_fix_type: vehicleTelemetry.gps_fix_type,
      };
    });
  }, [dbVehicles, telemetry, isVehicleOnline]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh === "off") return;
    
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      refetch();
    }, parseInt(autoRefresh) * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  // Show map immediately with loading indicator in sidebar
  const isInitialLoading = loading && vehicles.length === 0;

  // Use clustering for large fleets
  const useClusteredMap = vehicles.length > CLUSTER_THRESHOLD;

  // Virtual list for sidebar
  const sidebarRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: vehicles.length,
    getScrollElement: () => sidebarRef.current,
    estimateSize: () => 140,
    overscan: 5,
  });

  const handleVehicleClick = useCallback((vehicle: any) => {
    if (!vehicle.isOffline) {
      setSelectedVehicleId(vehicle.id);
      try {
        mapInstance?.flyTo({
          center: [vehicle.lng, vehicle.lat],
          zoom: 15,
          duration: 1200,
          essential: true,
        });
      } catch {}
    }
  }, [mapInstance]);

  return (
    <Layout>
      <div className="flex h-full">
        {/* Map Area */}
        <div className="flex-1 relative">
          {useClusteredMap ? (
            <ClusteredMap
              vehicles={vehicles.map(v => ({
                id: v.id,
                plate: v.plate,
                status: v.status,
                lat: v.lat,
                lng: v.lng,
                speed: v.speed,
                fuel: v.fuel,
                heading: v.heading,
                engine_on: v.engine_on,
              }))}
              selectedVehicleId={selectedVehicleId}
              onVehicleClick={(v) => setSelectedVehicleId(v.id)}
              mapStyle={mapStyle}
            />
          ) : (
            <LiveTrackingMap
              vehicles={vehicles}
              selectedVehicleId={selectedVehicleId}
              onVehicleClick={(vehicle) => setSelectedVehicleId(vehicle.id)}
              token={mapToken || envToken}
              mapStyle={mapStyle}
              onMapReady={setMapInstance}
            />
          )}

          {/* Map Legend */}
          <div className="absolute top-4 left-4 space-y-2 z-10">
            <Card className="p-3 bg-card/95 backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-sm font-medium">Moving</span>
              </div>
            </Card>
            <Card className="p-3 bg-card/95 backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-sm font-medium">Idle</span>
              </div>
            </Card>
            <Card className="p-3 bg-card/95 backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                <span className="text-sm font-medium">Stopped</span>
              </div>
            </Card>
            <Card className="p-3 bg-card/95 backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-sm font-medium">Offline</span>
              </div>
            </Card>
            {useClusteredMap && (
              <Card className="p-3 bg-card/95 backdrop-blur">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Clustered Mode</span>
                </div>
                <span className="text-xs text-muted-foreground">Click clusters to zoom</span>
              </Card>
            )}
            <Card className="p-3 bg-card/95 backdrop-blur">
              <div className="text-sm font-medium mb-2">Map Style</div>
              <Select value={mapStyle} onValueChange={(v) => setMapStyle(v as 'streets' | 'satellite')}>
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="satellite">Satellite</SelectItem>
                  <SelectItem value="streets">Streets</SelectItem>
                </SelectContent>
              </Select>
            </Card>
            {/* Nearby Vehicles Search */}
            <NearbyVehiclesSearch 
              vehicles={vehicles}
              onVehicleSelect={(v) => {
                setSelectedVehicleId(v.id);
                mapInstance?.flyTo({
                  center: [v.lng, v.lat],
                  zoom: 15,
                  duration: 1200,
                });
              }}
            />
          </div>
          {/* Token Prompt */}
          {(!envToken && !mapToken) && (
            <div className="absolute top-4 right-4 z-10">
              <Card className="p-4 bg-card/95 backdrop-blur space-y-2 w-80">
                <div className="text-sm font-semibold">Add Mapbox public token</div>
                <Input
                  placeholder="pk.eyJ..."
                  value={mapToken}
                  onChange={(e) => setMapToken(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { localStorage.setItem('mapbox_token', mapToken); window.location.reload(); }}>Save</Button>
                </div>
                <p className="text-xs text-muted-foreground">Get your token at mapbox.com → Tokens.</p>
              </Card>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-96 border-l border-border bg-card flex flex-col">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Live Vehicles</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {vehicles.filter(v => !v.isOffline).length} online / {vehicles.length.toLocaleString()} total
                </p>
              </div>
              <Badge variant="outline" className="gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </Badge>
            </div>

            {/* Auto-Refresh Control */}
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <Select value={autoRefresh} onValueChange={setAutoRefresh}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 Sec</SelectItem>
                  <SelectItem value="30">30 Sec</SelectItem>
                  <SelectItem value="60">1 Min</SelectItem>
                  <SelectItem value="300">5 Min</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Virtual scrolling vehicle list */}
          <div ref={sidebarRef} className="flex-1 overflow-auto p-4">
            {isInitialLoading ? (
              <MapSidebarSkeleton count={6} />
            ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const vehicle = vehicles[virtualRow.index];
                return (
                  <div
                    key={vehicle.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="pb-3"
                  >
                    <Card
                      className={`p-4 hover:shadow-md transition-all cursor-pointer ${
                        selectedVehicleId === vehicle.id ? 'ring-2 ring-primary' : ''
                      } ${vehicle.isOffline ? 'opacity-60' : ''}`}
                      onClick={() => handleVehicleClick(vehicle)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {vehicle.plate}
                            {vehicle.isOffline && (
                              <Badge variant="destructive" className="text-xs">
                                <WifiOff className="w-3 h-3 mr-1" />
                                Offline
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{vehicle.id.slice(0, 8)}...</div>
                        </div>
                        {!vehicle.isOffline && <StatusBadge status={vehicle.status} />}
                      </div>

                      {vehicle.isOffline ? (
                        <div className="text-sm text-destructive bg-destructive/10 rounded p-2">
                          <div className="font-medium flex items-center gap-2">
                            <WifiOff className="w-4 h-4" />
                            Device Disconnected
                          </div>
                          {vehicle.lastSeen && (
                            <div className="text-xs mt-1">
                              Last: {new Date(vehicle.lastSeen).toLocaleString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Navigation className="w-4 h-4 text-primary" />
                              <div>
                                <div className="text-xs text-muted-foreground">Speed</div>
                                <div className="font-medium">{vehicle.speed} km/h</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Fuel className="w-4 h-4 text-primary" />
                              <div>
                                <div className="text-xs text-muted-foreground">Fuel</div>
                                <div className="font-medium">{vehicle.fuel}%</div>
                              </div>
                            </div>
                          </div>
                          {vehicle.engine_on && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-success">
                              <Zap className="w-3 h-3" />
                              <span>Engine On</span>
                            </div>
                          )}
                        </>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MapView;
