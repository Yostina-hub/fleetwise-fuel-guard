import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import LiveTrackingMap from "@/components/map/LiveTrackingMap";
import ClusteredMap from "@/components/map/ClusteredMap";
import { NearbyVehiclesSearch } from "@/components/map/NearbyVehiclesSearch";
import { StreetViewModal } from "@/components/map/StreetViewModal";
import { VehicleInfoPanel } from "@/components/map/VehicleInfoPanel";
import { FleetCommandCenter } from "@/components/map/FleetCommandCenter";
import { FleetStatsBar } from "@/components/map/FleetStatsBar";
import { FleetSidebar } from "@/components/map/FleetSidebar";
import { MapToolbar } from "@/components/map/MapToolbar";
import { useVehicles } from "@/hooks/useVehicles";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { useSpeedGovernor } from "@/hooks/useSpeedGovernor";
import { useVehicleTrail } from "@/hooks/useVehicleTrail";
import { useAlerts } from "@/hooks/useAlerts";
import { cn } from "@/lib/utils";

const CLUSTER_THRESHOLD = 100;

const MapView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { vehicles: dbVehicles, loading, refetch } = useVehicles();
  const { telemetry, isVehicleOnline } = useVehicleTelemetry();
  const { governorConfigs } = useSpeedGovernor();
  const { alerts } = useAlerts();
  
  // URL/state-based vehicle selection
  const urlVehicleId = searchParams.get("vehicle");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(
    location.state?.selectedVehicleId || urlVehicleId || undefined
  );
  
  useEffect(() => {
    if (urlVehicleId && urlVehicleId !== selectedVehicleId) {
      setSelectedVehicleId(urlVehicleId);
    }
  }, [urlVehicleId]);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'moving' | 'idle' | 'stopped' | 'offline'>('all');
  const [showNearbySearch, setShowNearbySearch] = useState(false);
  const [showTrails, setShowTrails] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showGeofences, setShowGeofences] = useState(false);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('satellite');
  const [mapToken] = useState<string>(() => localStorage.getItem('mapbox_token') || '');
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
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
  
  // Helper to ensure valid coordinates
  const safeCoord = (val: number | null | undefined, defaultVal: number): number => {
    if (val === null || val === undefined || !isFinite(val)) return defaultVal;
    return val;
  };
  
  // Transform vehicles for map display with telemetry data
  const vehicles = useMemo(() => {
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
      
      if (!online || !vehicleTelemetry) {
        const lastKnownTelemetry = telemetry[v.id];
        const driver = v.assigned_driver;
        return {
          id: v.id,
          plate: v.plate_number || 'Unknown',
          status: 'offline' as const,
          fuel: lastKnownTelemetry?.fuel_level_percent || 0,
          speed: 0,
          lat: safeCoord(lastKnownTelemetry?.latitude, 9.03),
          lng: safeCoord(lastKnownTelemetry?.longitude, 38.74),
          engine_on: false,
          heading: safeCoord(lastKnownTelemetry?.heading, 0),
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
      
      const driver = v.assigned_driver;
      return {
        id: v.id,
        plate: v.plate_number || 'Unknown',
        status,
        fuel: vehicleTelemetry.fuel_level_percent || 0,
        speed,
        lat: safeCoord(vehicleTelemetry.latitude, 9.03),
        lng: safeCoord(vehicleTelemetry.longitude, 38.74),
        engine_on: engineOn,
        heading: safeCoord(vehicleTelemetry.heading, 0),
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
  const { trails } = useVehicleTrail(vehicleIds);

  // Filter vehicles for display
  const filteredVehicles = useMemo(() => {
    let filtered = vehicles;
    
    if (statusFilter === 'online') {
      filtered = filtered.filter(v => !v.isOffline);
    } else if (statusFilter === 'offline') {
      filtered = filtered.filter(v => v.isOffline);
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => 
        v.plate.toLowerCase().includes(query) ||
        v.driverName?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [vehicles, searchQuery, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const movingVehicles = vehicles.filter(v => v.status === 'moving');
    const avgSpeed = movingVehicles.length > 0 
      ? movingVehicles.reduce((sum, v) => sum + v.speed, 0) / movingVehicles.length 
      : 0;
    const onlineVehicles = vehicles.filter(v => !v.isOffline);
    const avgFuel = onlineVehicles.length > 0
      ? onlineVehicles.reduce((sum, v) => sum + v.fuel, 0) / onlineVehicles.length
      : 0;
    
    return {
      total: vehicles.length,
      moving: movingVehicles.length,
      idle: vehicles.filter(v => v.status === 'idle').length,
      stopped: vehicles.filter(v => v.status === 'stopped').length,
      offline: vehicles.filter(v => v.isOffline).length,
      avgSpeed,
      avgFuel,
    };
  }, [vehicles]);

  // Active alerts count
  const activeAlerts = useMemo(() => {
    return alerts?.filter(a => a.status === 'unacknowledged' || !a.resolved_at)?.length || 0;
  }, [alerts]);

  const isInitialLoading = loading && vehicles.length === 0;
  const useClusteredMap = vehicles.length > CLUSTER_THRESHOLD;

  // Map handlers
  const handleVehicleClick = useCallback((vehicle: any) => {
    setSelectedVehicleId(vehicle.id);
    if (mapInstance) {
      mapInstance.flyTo({
        center: [vehicle.lng, vehicle.lat],
        zoom: 16,
        duration: 1000,
      });
    }
  }, [mapInstance]);

  const handleTripReplay = useCallback((vehicleId: string, plate: string) => {
    const today = new Date().toISOString().split('T')[0];
    navigate(`/route-history?vehicle=${vehicleId}&date=${today}&autoplay=true`);
  }, [navigate]);

  const handleManageAsset = useCallback((vehicleId: string, plate: string) => {
    navigate('/fleet', { state: { selectedVehicleId: vehicleId, openModal: true } });
  }, [navigate]);

  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return filteredVehicles.find(v => v.id === selectedVehicleId) || null;
  }, [selectedVehicleId, filteredVehicles]);

  const handleStreetView = useCallback((lat: number, lng: number, plate: string) => {
    setStreetViewModal({ open: true, lat, lng, plate, type: 'streetview' });
  }, []);

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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setStreetViewModal((prev) => ({
            ...prev,
            originLat: pos.coords.latitude,
            originLng: pos.coords.longitude,
          }));
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
      );
    }
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Map control handlers
  const handleZoomIn = useCallback(() => {
    mapInstance?.zoomIn();
  }, [mapInstance]);

  const handleZoomOut = useCallback(() => {
    mapInstance?.zoomOut();
  }, [mapInstance]);

  const handleResetBearing = useCallback(() => {
    mapInstance?.resetNorth();
  }, [mapInstance]);

  const handleCenterOnFleet = useCallback(() => {
    if (!mapInstance || filteredVehicles.length === 0) return;
    
    const bounds = filteredVehicles.reduce((acc, v) => {
      return {
        minLng: Math.min(acc.minLng, v.lng),
        maxLng: Math.max(acc.maxLng, v.lng),
        minLat: Math.min(acc.minLat, v.lat),
        maxLat: Math.max(acc.maxLat, v.lat),
      };
    }, { minLng: 180, maxLng: -180, minLat: 90, maxLat: -90 });
    
    mapInstance.fitBounds(
      [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
      { padding: 100, duration: 1000 }
    );
  }, [mapInstance, filteredVehicles]);

  return (
    <Layout>
      <div className={cn(
        "relative h-[calc(100vh-1px)] overflow-hidden",
        isFullscreen && "fixed inset-0 z-50"
      )}>
        {/* Map Layer */}
        <div className="absolute inset-0">
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
        </div>

        {/* Command Center - Top Center */}
        <FleetCommandCenter
          onSearch={setSearchQuery}
          onEmergencyBroadcast={() => navigate('/alerts')}
          onLocateAll={handleCenterOnFleet}
          onRefresh={refetch}
          onFullscreen={toggleFullscreen}
          onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
          activeAlerts={activeAlerts}
          sosActive={false}
          searchQuery={searchQuery}
        />

        {/* Map Toolbar - Left Side */}
        <MapToolbar
          mapStyle={mapStyle}
          onStyleChange={setMapStyle}
          showTrails={showTrails}
          onTrailsToggle={() => setShowTrails(!showTrails)}
          showNearby={showNearbySearch}
          onNearbyToggle={() => setShowNearbySearch(!showNearbySearch)}
          showHeatmap={showHeatmap}
          onHeatmapToggle={() => setShowHeatmap(!showHeatmap)}
          showGeofences={showGeofences}
          onGeofencesToggle={() => setShowGeofences(!showGeofences)}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetBearing={handleResetBearing}
          onCenterOnFleet={handleCenterOnFleet}
          className="top-24"
        />

        {/* Nearby Vehicles Search Panel */}
        {showNearbySearch && (
          <div className="absolute top-24 left-[120px] z-20">
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

        {/* Fleet Stats Bar - Bottom Left */}
        <FleetStatsBar
          totalVehicles={stats.total}
          movingVehicles={stats.moving}
          idleVehicles={stats.idle}
          stoppedVehicles={stats.stopped}
          offlineVehicles={stats.offline}
          avgSpeed={stats.avgSpeed}
          avgFuel={stats.avgFuel}
          activeAlerts={activeAlerts}
        />

        {/* Fleet Sidebar - Right Side */}
        <FleetSidebar
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onVehicleSelect={handleVehicleClick}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          isLoading={isInitialLoading}
        />

        {/* Vehicle Info Panel - Bottom Center */}
        <VehicleInfoPanel
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicleId(undefined)}
          onStreetView={handleStreetView}
          onDirections={handleDirections}
          onTripReplay={handleTripReplay}
          onManageAsset={handleManageAsset}
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
      </div>
    </Layout>
  );
};

export default MapView;
