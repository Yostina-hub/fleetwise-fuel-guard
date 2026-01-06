import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import { StreetViewModal } from "@/components/map/StreetViewModal";
import { VehicleInfoPanel } from "@/components/map/VehicleInfoPanel";
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
  Route,
  Crosshair,
  Focus
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
  const [searchParams] = useSearchParams();
  const { vehicles: dbVehicles, loading, refetch } = useVehicles();
  const { telemetry, isVehicleOnline } = useVehicleTelemetry();
  const { governorConfigs } = useSpeedGovernor();
  
  // Support both location.state and URL query params for vehicle selection
  const urlVehicleId = searchParams.get("vehicle");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(
    location.state?.selectedVehicleId || urlVehicleId || undefined
  );
  
  // Update selection when URL param changes
  useEffect(() => {
    if (urlVehicleId && urlVehicleId !== selectedVehicleId) {
      setSelectedVehicleId(urlVehicleId);
    }
  }, [urlVehicleId]);
  const [autoRefresh, setAutoRefresh] = useState("30");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'moving' | 'idle' | 'stopped' | 'offline'>('all');
  const [showNearbySearch, setShowNearbySearch] = useState(false);
  const [showTrails, setShowTrails] = useState(true);
  const [followMode, setFollowMode] = useState(false);
  
  // Street View / Directions Modal state
  const [streetViewModal, setStreetViewModal] = useState<{
    open: boolean;
    lat: number;
    lng: number;
    plate: string;
    type: 'streetview' | 'directions';
    originLat?: number;
    originLng?: number;
  }>({ open: false, lat: 0, lng: 0, plate: '', type: 'streetview' });
  
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

    // Helper to check if coordinates are valid (not null/undefined/NaN and within bounds)
    const hasValidCoords = (lat: number | null | undefined, lng: number | null | undefined): boolean => {
      return (
        lat !== null && lat !== undefined && isFinite(lat) &&
        lng !== null && lng !== undefined && isFinite(lng) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      );
    };
    
    return dbVehicles
      .map((v) => {
        const vehicleTelemetry = telemetry[v.id];
        const online = isVehicleOnline(v.id);
        const speedLimit = speedLimitMap[v.id];
        const driver = v.assigned_driver;
        
        // Get coordinates from telemetry (could be current or last known)
        const lat = vehicleTelemetry?.latitude;
        const lng = vehicleTelemetry?.longitude;
        
        // Skip vehicles without valid GPS coordinates entirely
        // This prevents markers from stacking at default coordinates
        if (!hasValidCoords(lat, lng)) {
          return null; // Will be filtered out
        }
        
        // For offline vehicles, preserve last known position
        if (!online || !vehicleTelemetry) {
          return {
            id: v.id,
            plate: v.plate_number || 'Unknown',
            status: 'offline' as const,
            fuel: vehicleTelemetry?.fuel_level_percent || 0,
            speed: 0,
            lat: lat!,
            lng: lng!,
            engine_on: false,
            heading: vehicleTelemetry?.heading || 0,
            isOffline: true,
            gps_signal_strength: 0,
            gps_satellites_count: 0,
            lastSeen: vehicleTelemetry?.last_communication_at,
            gps_jamming_detected: false,
            gps_spoofing_detected: false,
            speedLimit,
            driverName: driver ? `${driver.first_name} ${driver.last_name}` : undefined,
            driverPhone: driver?.phone,
            hasGps: true,
          };
        }
        
        // Determine status based on speed (primary) and engine state (secondary)
        const speed = vehicleTelemetry.speed_kmh || 0;
        const engineOn = vehicleTelemetry.engine_on || vehicleTelemetry.ignition_on;
        let status: 'moving' | 'idle' | 'stopped' | 'offline';
        
        if (speed > 3) {
          status = 'moving';
        } else if (engineOn) {
          status = 'idle';
        } else {
          status = 'stopped';
        }
        
        return {
          id: v.id,
          plate: v.plate_number || 'Unknown',
          status,
          fuel: vehicleTelemetry.fuel_level_percent || 0,
          speed,
          lat: lat!,
          lng: lng!,
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
          hasGps: true,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null); // Remove vehicles without GPS
  }, [dbVehicles, telemetry, isVehicleOnline, governorConfigs]);

  // Get vehicle IDs for trail tracking
  const vehicleIds = useMemo(() => vehicles.map(v => v.id), [vehicles]);
  
  // Use vehicle trail hook for live path drawing
  const { trails, clearAllTrails } = useVehicleTrail(vehicleIds);

  // Filter vehicles by search and status
  const filteredVehicles = useMemo(() => {
    let filtered = vehicles;
    
    // Apply status filter
    if (statusFilter === 'online') {
      // Live = all non-offline vehicles
      filtered = filtered.filter(v => !v.isOffline);
    } else if (statusFilter === 'offline') {
      filtered = filtered.filter(v => v.isOffline);
    } else if (statusFilter !== 'all') {
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

  // Follow mode: automatically pan map to follow selected vehicle
  useEffect(() => {
    if (!followMode || !selectedVehicleId || !mapInstance) return;
    
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!selectedVehicle || !isFinite(selectedVehicle.lat) || !isFinite(selectedVehicle.lng)) return;

    // Smoothly pan to the vehicle's current position
    mapInstance.easeTo({
      center: [selectedVehicle.lng, selectedVehicle.lat],
      duration: 500,
      essential: true,
    });
  }, [followMode, selectedVehicleId, vehicles, mapInstance]);

  // Disable follow mode when user manually interacts with the map
  useEffect(() => {
    if (!mapInstance || !followMode) return;

    const handleDragStart = () => setFollowMode(false);
    const handleZoomStart = (e: any) => {
      // Only disable if user-initiated zoom (not programmatic)
      if (!e.originalEvent) return;
      setFollowMode(false);
    };

    mapInstance.on('dragstart', handleDragStart);
    mapInstance.on('zoomstart', handleZoomStart);

    return () => {
      mapInstance.off('dragstart', handleDragStart);
      mapInstance.off('zoomstart', handleZoomStart);
    };
  }, [mapInstance, followMode]);

  const handleVehicleClick = useCallback((vehicle: any) => {
    setSelectedVehicleId(vehicle.id);
    // Pan map to vehicle
    if (mapInstance) {
      mapInstance.flyTo({
        center: [vehicle.lng, vehicle.lat],
        zoom: 16,
        duration: 800,
      });
    }
  }, [mapInstance]);

  // Handle Trip Replay from info panel - navigate with URL params for automatic selection
  const handleTripReplay = useCallback((vehicleId: string, plate: string) => {
    const today = new Date().toISOString().split('T')[0];
    navigate(`/route-history?vehicle=${vehicleId}&date=${today}&autoplay=true`);
  }, [navigate]);

  // Handle Manage Asset from info panel
  const handleManageAsset = useCallback((vehicleId: string, plate: string) => {
    navigate('/fleet', { state: { selectedVehicleId: vehicleId, openModal: true } });
  }, [navigate]);

  // Get selected vehicle for info panel
  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return filteredVehicles.find(v => v.id === selectedVehicleId) || null;
  }, [selectedVehicleId, filteredVehicles]);

  // Handle Street View from info panel
  const handleStreetView = useCallback((lat: number, lng: number, plate: string) => {
    setStreetViewModal({
      open: true,
      lat,
      lng,
      plate,
      type: 'streetview'
    });
  }, []);

  // Handle Directions from info panel
  const handleDirections = useCallback((lat: number, lng: number, plate: string) => {
    setStreetViewModal({
      open: true,
      lat,
      lng,
      plate,
      type: 'directions',
      originLat: undefined,
      originLng: undefined,
    });

    // Try to use the user's current location as origin (best effort)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setStreetViewModal((prev) => {
            if (!prev.open || prev.type !== 'directions') return prev;
            if (prev.lat !== lat || prev.lng !== lng) return prev;
            return {
              ...prev,
              originLat: pos.coords.latitude,
              originLng: pos.coords.longitude,
            };
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
      );
    }
  }, []);

  // Stats
  const onlineCount = vehicles.filter(v => !v.isOffline).length;
  const movingCount = vehicles.filter(v => v.status === 'moving').length;
  const idleCount = vehicles.filter(v => v.status === 'idle').length;
  const stoppedCount = vehicles.filter(v => v.status === 'stopped').length;
  const offlineCount = vehicles.filter(v => v.isOffline).length;

  return (
    <Layout>
      <div className="flex h-[calc(100vh-1px)] overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 relative">
          {useClusteredMap ? (
            <ClusteredMap
              vehicles={filteredVehicles.map(v => ({
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
              onVehicleClick={handleVehicleClick}
              mapStyle={mapStyle}
              onMapReady={setMapInstance}
              showTrails={showTrails}
              trails={trails}
              disablePopups
            />
          ) : (
            <LiveTrackingMap
              vehicles={filteredVehicles}
              selectedVehicleId={selectedVehicleId}
              onVehicleClick={handleVehicleClick}
              token={mapToken || envToken}
              mapStyle={mapStyle}
              onMapReady={setMapInstance}
              showTrails={showTrails}
              trails={trails}
              disablePopups
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

              {/* Follow Mode Toggle - Only show when vehicle selected */}
              {selectedVehicleId && (
                <Button
                  variant={followMode ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-9 gap-2 backdrop-blur-sm border shadow-lg font-medium",
                    followMode 
                      ? "bg-blue-600 text-white hover:bg-blue-700" 
                      : "bg-white/95 text-foreground border-border"
                  )}
                  onClick={() => setFollowMode(!followMode)}
                  aria-label="Toggle follow vehicle mode"
                  aria-pressed={followMode}
                >
                  <Focus className={cn("w-4 h-4", followMode && "animate-pulse")} aria-hidden="true" />
                  <span className="hidden sm:inline">{followMode ? 'Following' : 'Follow'}</span>
                </Button>
              )}
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

            {/* Status Filter - affects both sidebar and map */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="h-8 flex-1 text-xs" aria-label="Filter by vehicle status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({vehicles.length})</SelectItem>
                  <SelectItem value="online">
                    <span className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      Live ({onlineCount})
                    </span>
                  </SelectItem>
                  <SelectItem value="moving">
                    <span className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Moving ({movingCount})
                    </span>
                  </SelectItem>
                  <SelectItem value="idle">
                    <span className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      Idle ({idleCount})
                    </span>
                  </SelectItem>
                  <SelectItem value="stopped">
                    <span className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                      Stopped ({stoppedCount})
                    </span>
                  </SelectItem>
                  <SelectItem value="offline">
                    <span className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      Offline ({offlineCount})
                    </span>
                  </SelectItem>
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

      {/* Detached Vehicle Info Panel */}
      <VehicleInfoPanel
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicleId(undefined)}
        onStreetView={handleStreetView}
        onDirections={handleDirections}
        onTripReplay={handleTripReplay}
        onManageAsset={handleManageAsset}
        followMode={followMode}
        onToggleFollow={() => setFollowMode(!followMode)}
      />

      {/* Street View / Directions Modal */}
      <StreetViewModal
        open={streetViewModal.open}
        onOpenChange={(open) => setStreetViewModal(prev => ({ ...prev, open }))}
        lat={streetViewModal.lat}
        lng={streetViewModal.lng}
        plate={streetViewModal.plate}
        type={streetViewModal.type}
        originLat={streetViewModal.originLat}
        originLng={streetViewModal.originLng}
      />
    </Layout>
  );
};

export default MapView;
