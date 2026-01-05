import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapSidebarSkeleton } from "@/components/ui/skeletons";
import StatusBadge from "@/components/StatusBadge";
import LiveTrackingMap from "@/components/map/LiveTrackingMap";
import ClusteredMap from "@/components/map/ClusteredMap";
import { NearbyVehiclesSearch } from "@/components/map/NearbyVehiclesSearch";
import { 
  Navigation, 
  Fuel, 
  RefreshCw, 
  WifiOff, 
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Satellite,
  Map,
  Filter,
  Radar,
  Clock,
  Route
} from "lucide-react";
import { GpsJammingIndicator } from "@/components/map/GpsJammingIndicator";
import { useVehicles } from "@/hooks/useVehicles";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { useSpeedGovernor } from "@/hooks/useSpeedGovernor";
import { useVehicleTrail } from "@/hooks/useVehicleTrail";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const CLUSTER_THRESHOLD = 100;

const MapView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { vehicles: dbVehicles, loading, refetch } = useVehicles();
  const { telemetry, isVehicleOnline } = useVehicleTelemetry();
  const { governorConfigs } = useSpeedGovernor();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(
    location.state?.selectedVehicleId
  );
  const [autoRefresh, setAutoRefresh] = useState("30");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'moving' | 'idle' | 'stopped' | 'offline'>('all');
  const [showNearbySearch, setShowNearbySearch] = useState(false);
  const [showTrails, setShowTrails] = useState(true);
  const [popupVehicleId, setPopupVehicleId] = useState<string | null>(null);
  
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('satellite');
  const [mapToken] = useState<string>(() => localStorage.getItem('mapbox_token') || '');
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const [mapInstance, setMapInstance] = useState<any>(null);
  
  // Helper to check if data is stale (>5 mins old)
  const isStaleData = (lastSeen?: string): boolean => {
    if (!lastSeen) return true;
    const minutesSince = (Date.now() - new Date(lastSeen).getTime()) / 1000 / 60;
    return minutesSince > 5;
  };
  
  // Transform vehicles for map display with telemetry data
  const vehicles = useMemo(() => {
    // Build speed limit lookup from governor configs
    const speedLimitMap: Record<string, number> = {};
    governorConfigs?.forEach(config => {
      if (config.governor_active && config.max_speed_limit) {
        speedLimitMap[config.vehicle_id] = config.max_speed_limit;
      }
    });
    
    return dbVehicles.map((v) => {
      const vehicleTelemetry = telemetry[v.id];
      const online = isVehicleOnline(v.id);
      const speedLimit = speedLimitMap[v.id];
      
      // For offline vehicles, preserve last known position if available
      if (!online || !vehicleTelemetry) {
        const lastKnownTelemetry = telemetry[v.id]; // May still have stale data
        const driver = v.assigned_driver;
        return {
          id: v.id,
          plate: v.plate_number || 'Unknown',
          status: 'offline' as const,
          fuel: lastKnownTelemetry?.fuel_level_percent || 0,
          speed: 0,
          lat: lastKnownTelemetry?.latitude || 9.03,
          lng: lastKnownTelemetry?.longitude || 38.74,
          engine_on: false,
          heading: lastKnownTelemetry?.heading || 0,
          isOffline: true,
          gps_signal_strength: 0,
          gps_satellites_count: 0,
          lastSeen: lastKnownTelemetry?.last_communication_at,
          gps_jamming_detected: false,
          gps_spoofing_detected: false,
          speedLimit,
          driverName: driver ? `${driver.first_name} ${driver.last_name}` : undefined,
          driverPhone: driver?.phone,
        };
      }
      
      // Determine status based on speed (primary) and engine state (secondary)
      // Speed takes priority - if moving, it's moving regardless of engine flag
      const speed = vehicleTelemetry.speed_kmh || 0;
      const engineOn = vehicleTelemetry.engine_on || vehicleTelemetry.ignition_on;
      let status: 'moving' | 'idle' | 'stopped' | 'offline';
      
      if (speed > 3) {
        // Speed > 3 km/h means vehicle is moving, regardless of engine flag
        status = 'moving';
      } else if (engineOn) {
        // Engine/ignition on but not moving = idle
        status = 'idle';
      } else {
        status = 'stopped';
      }
      
      const driver = v.assigned_driver;
      return {
        id: v.id,
        plate: v.plate_number || 'Unknown',
        status,
        fuel: vehicleTelemetry.fuel_level_percent || 0,
        speed,
        lat: vehicleTelemetry.latitude || 9.03,
        lng: vehicleTelemetry.longitude || 38.74,
        engine_on: engineOn,
        heading: vehicleTelemetry.heading || 0,
        isOffline: false,
        lastSeen: vehicleTelemetry.last_communication_at,
        gps_signal_strength: vehicleTelemetry.gps_signal_strength,
        gps_satellites_count: vehicleTelemetry.gps_satellites_count,
        gps_hdop: vehicleTelemetry.gps_hdop,
        gps_fix_type: vehicleTelemetry.gps_fix_type,
        gps_jamming_detected: vehicleTelemetry.gps_jamming_detected,
        gps_spoofing_detected: vehicleTelemetry.gps_spoofing_detected,
        speedLimit,
        driverName: driver ? `${driver.first_name} ${driver.last_name}` : undefined,
        driverPhone: driver?.phone,
      };
    });
  }, [dbVehicles, telemetry, isVehicleOnline, governorConfigs]);

  // Get vehicle IDs for trail tracking
  const vehicleIds = useMemo(() => vehicles.map(v => v.id), [vehicles]);
  
  // Use vehicle trail hook for live path drawing
  const { trails, clearAllTrails } = useVehicleTrail(vehicleIds);

  // Filter vehicles by search and status
  const filteredVehicles = useMemo(() => {
    let filtered = vehicles;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => v.plate.toLowerCase().includes(query));
    }
    
    return filtered;
  }, [vehicles, searchQuery, statusFilter]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh === "off") return;
    
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      refetch();
    }, parseInt(autoRefresh) * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const isInitialLoading = loading && vehicles.length === 0;
  const useClusteredMap = vehicles.length > CLUSTER_THRESHOLD;

  // Virtual list for sidebar
  const sidebarRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredVehicles.length,
    getScrollElement: () => sidebarRef.current,
    estimateSize: () => 88,
    overscan: 5,
  });

  const handleVehicleClick = useCallback((vehicle: any) => {
    setSelectedVehicleId(vehicle.id);
    // Trigger popup open on the map
    setPopupVehicleId(vehicle.id);
  }, []);
  
  const handlePopupOpened = useCallback(() => {
    // Reset popup trigger after it's opened
    setPopupVehicleId(null);
  }, []);

  // Handle Trip Replay from popup
  const handleTripReplay = useCallback((vehicleId: string, plate: string) => {
    navigate('/route-history', { state: { selectedVehicleId: vehicleId, plate } });
  }, [navigate]);

  // Handle Manage Asset from popup
  const handleManageAsset = useCallback((vehicleId: string, plate: string) => {
    navigate('/fleet', { state: { selectedVehicleId: vehicleId, openModal: true } });
  }, [navigate]);

  // Stats
  const onlineCount = vehicles.filter(v => !v.isOffline).length;
  const movingCount = vehicles.filter(v => v.status === 'moving').length;
  const idleCount = vehicles.filter(v => v.status === 'idle').length;
  const stoppedCount = vehicles.filter(v => v.status === 'stopped').length;
  const offlineCount = vehicles.filter(v => v.isOffline).length;

  return (
    <Layout>
      <div className="flex h-full overflow-hidden">
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
              onMapReady={setMapInstance}
              showTrails={showTrails}
              trails={trails}
              onTripReplay={handleTripReplay}
              onManageAsset={handleManageAsset}
            />
          ) : (
            <LiveTrackingMap
              vehicles={vehicles}
              selectedVehicleId={selectedVehicleId}
              onVehicleClick={(vehicle) => setSelectedVehicleId(vehicle.id)}
              token={mapToken || envToken}
              mapStyle={mapStyle}
              onMapReady={setMapInstance}
              showTrails={showTrails}
              trails={trails}
              openPopupVehicleId={popupVehicleId}
              onPopupOpened={handlePopupOpened}
              onTripReplay={handleTripReplay}
              onManageAsset={handleManageAsset}
            />
          )}

          {/* Minimal Map Controls */}
          <div className="absolute top-4 left-4 z-10">
            <div className="flex flex-col gap-2">
              {/* Map Style Toggle */}
              <div className="bg-background/90 backdrop-blur-sm rounded-lg border shadow-lg p-1 flex" role="group" aria-label="Map style selection">
                <Button
                  variant={mapStyle === 'satellite' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-3 gap-2"
                  onClick={() => setMapStyle('satellite')}
                  aria-label="Satellite map view"
                  aria-pressed={mapStyle === 'satellite'}
                >
                  <Satellite className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Satellite</span>
                </Button>
                <Button
                  variant={mapStyle === 'streets' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-3 gap-2"
                  onClick={() => setMapStyle('streets')}
                  aria-label="Streets map view"
                  aria-pressed={mapStyle === 'streets'}
                >
                  <Map className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Streets</span>
                </Button>
              </div>

              {/* Status Legend - Compact */}
              <div className="bg-background/95 backdrop-blur-md rounded-lg border border-border/50 shadow-lg px-4 py-2.5" role="img" aria-label="Vehicle status legend: Moving (green), Idle (amber), Stopped (gray), Offline (red)">
                <div className="flex items-center gap-5 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" aria-hidden="true" />
                    <span className="text-foreground/80">Moving</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/40" aria-hidden="true" />
                    <span className="text-foreground/80">Idle</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" aria-hidden="true" />
                    <span className="text-foreground/80">Stopped</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/40" aria-hidden="true" />
                    <span className="text-foreground/80">Offline</span>
                  </div>
                </div>
              </div>

              {/* Trail Toggle Button */}
              <Button
                variant={showTrails ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-9 gap-2 backdrop-blur-sm border shadow-lg font-medium",
                  showTrails 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-white/95 text-foreground border-border"
                )}
                onClick={() => setShowTrails(!showTrails)}
                aria-label="Toggle vehicle trails"
                aria-pressed={showTrails}
              >
                <Route className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Trails</span>
              </Button>

              {/* Nearby Vehicles Search Button */}
              <Button
                variant={showNearbySearch ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-9 gap-2 backdrop-blur-sm border shadow-lg font-medium",
                  showNearbySearch 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-white/95 text-foreground border-border"
                )}
                onClick={() => setShowNearbySearch(!showNearbySearch)}
                aria-label="Search for nearby vehicles"
                aria-pressed={showNearbySearch}
              >
                <Radar className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Nearby</span>
              </Button>
            </div>

            {/* Nearby Vehicles Search Panel */}
            {showNearbySearch && (
              <div className="absolute top-36 left-4 z-10">
                <NearbyVehiclesSearch
                  vehicles={vehicles}
                  onVehicleSelect={(v) => {
                    setSelectedVehicleId(v.id);
                    setShowNearbySearch(false);
                    mapInstance?.flyTo({
                      center: [v.lng, v.lat],
                      zoom: 16,
                      duration: 1200,
                    });
                  }}
                  onClose={() => setShowNearbySearch(false)}
                />
              </div>
            )}
          </div>

          {/* Sidebar Toggle Button */}
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-20 h-10 w-6 rounded-l-lg rounded-r-none shadow-lg transition-all",
              sidebarCollapsed ? "right-0" : "right-80"
            )}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expand vehicle sidebar" : "Collapse vehicle sidebar"}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? <ChevronLeft className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
          </Button>
        </div>

        {/* Side Panel - Clean & Modern */}
        <div className={cn(
          "bg-background border-l flex flex-col transition-all duration-300",
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-80"
        )}>
          {/* Header */}
          <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Vehicles</h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
                    {onlineCount} online
                  </span>
                  <span>{movingCount} moving</span>
                </div>
              </div>
              <Badge variant="outline" className="gap-1.5 text-xs font-normal">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
                Live
              </Badge>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-9 bg-muted/50"
                aria-label="Search vehicles by plate number"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label="Clear search"
                  type="button"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="h-8 flex-1 text-xs" aria-label="Filter by vehicle status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({vehicles.length})</SelectItem>
                  <SelectItem value="moving">Moving ({movingCount})</SelectItem>
                  <SelectItem value="idle">Idle ({idleCount})</SelectItem>
                  <SelectItem value="stopped">Stopped ({stoppedCount})</SelectItem>
                  <SelectItem value="offline">Offline ({offlineCount})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Control */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                <Select value={autoRefresh} onValueChange={setAutoRefresh}>
                  <SelectTrigger className="h-7 w-20 text-xs border-0 bg-transparent p-0" aria-label="Auto-refresh interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10s</SelectItem>
                    <SelectItem value="30">30s</SelectItem>
                    <SelectItem value="60">1m</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-muted-foreground" aria-label="Last updated time">
                {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Vehicle List */}
          <div ref={sidebarRef} className="flex-1 overflow-auto">
            {isInitialLoading ? (
              <div className="p-3">
                <MapSidebarSkeleton count={6} />
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground" role="status" aria-live="polite">
                <p className="text-sm">No vehicles found</p>
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const vehicle = filteredVehicles[virtualRow.index];
                  const isSelected = selectedVehicleId === vehicle.id;
                  
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
                      className="px-3 py-1.5"
                    >
                      <div
                        className={cn(
                          "p-3 rounded-lg cursor-pointer transition-all",
                          "hover:bg-muted/80",
                          isSelected && "bg-primary/10 ring-1 ring-primary/30",
                          vehicle.isOffline && "opacity-50",
                          !vehicle.isOffline && isStaleData(vehicle.lastSeen) && "opacity-70 border-l-2 border-warning"
                        )}
                        onClick={() => handleVehicleClick(vehicle)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleVehicleClick(vehicle); } }}
                        role="button"
                        tabIndex={0}
                        aria-label={`${vehicle.plate}, ${vehicle.isOffline ? 'Offline' : vehicle.status}, ${!vehicle.isOffline ? `${vehicle.speed} km/h, ${vehicle.fuel}% fuel` : ''}`}
                        aria-selected={isSelected}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              vehicle.isOffline ? "bg-muted-foreground" :
                              vehicle.status === 'moving' ? "bg-success animate-pulse" : 
                              vehicle.status === 'idle' ? "bg-warning" : "bg-muted-foreground"
                            )} />
                            <span className="font-medium text-sm">{vehicle.plate}</span>
                          </div>
                        {vehicle.isOffline ? (
                            <Badge variant="secondary" className="text-xs h-5 px-1.5 gap-1">
                              <WifiOff className="w-3 h-3" aria-hidden="true" />
                              Offline
                            </Badge>
                          ) : (
                            <StatusBadge status={vehicle.status} />
                          )}
                        </div>

                        {!vehicle.isOffline && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                {/* Heading compass for moving vehicles */}
                                {vehicle.status === 'moving' && vehicle.heading !== undefined ? (
                                  <div 
                                    className="w-4 h-4 flex items-center justify-center"
                                    title={`Heading: ${Math.round(vehicle.heading)}°`}
                                  >
                                    <Navigation 
                                      className="w-3.5 h-3.5 text-success" 
                                      style={{ transform: `rotate(${vehicle.heading}deg)` }}
                                      aria-hidden="true" 
                                    />
                                  </div>
                                ) : (
                                  <Navigation className="w-3 h-3" aria-hidden="true" />
                                )}
                                <span className={cn(
                                  "font-medium",
                                  vehicle.speedLimit && vehicle.speed > vehicle.speedLimit ? "text-destructive" : 
                                  vehicle.speed > 0 ? "text-foreground" : ""
                                )}>
                                  {vehicle.speed} km/h
                                </span>
                                {vehicle.speedLimit && vehicle.speed > vehicle.speedLimit && (
                                  <span className="text-destructive text-[10px]">⚠</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Fuel className="w-3 h-3" aria-hidden="true" />
                                <span className={vehicle.fuel < 20 ? "text-warning font-medium" : ""}>{vehicle.fuel}%</span>
                              </div>
                            </div>
                            {/* GPS Jamming/Spoofing Indicator */}
                            <GpsJammingIndicator 
                              jammingDetected={vehicle.gps_jamming_detected}
                              spoofingDetected={vehicle.gps_spoofing_detected}
                              showLabel={true}
                            />
                            {/* Last seen time - always show for context */}
                            {vehicle.lastSeen && (
                              <div className={cn(
                                "flex items-center gap-1 text-xs",
                                isStaleData(vehicle.lastSeen) ? "text-warning" : "text-muted-foreground"
                              )}>
                                <Clock className="w-3 h-3" aria-hidden="true" />
                                <span>{formatDistanceToNow(new Date(vehicle.lastSeen), { addSuffix: true })}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
