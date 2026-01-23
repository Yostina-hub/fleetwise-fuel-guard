import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import VehicleDetailModal from "@/components/VehicleDetailModal";
import ClusteredMap from "@/components/map/ClusteredMap";
import { VehicleDetailPanel } from "@/components/vehicles/VehicleDetailPanel";
import {
  Search,
  SlidersHorizontal,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Car,
  Truck,
  Bus,
  Satellite,
  Map,
  Maximize2,
  Minimize2,
  Fuel,
  Gauge,
  MapPin,
  Clock,
  Eye,
  Navigation,
  MapPinned,
} from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import mapboxgl from "mapbox-gl";
import { formatDistanceToNow } from "date-fns";

// Status filter badges configuration
const STATUS_BADGES = [
  { key: "all", label: "ALL", color: "bg-primary text-primary-foreground" },
  { key: "running", label: "RUNNING", color: "bg-green-500 text-white" },
  { key: "stopped", label: "STOPPED", color: "bg-yellow-500 text-white" },
  { key: "overspeed", label: "OVERSPEED", color: "bg-red-500 text-white" },
  { key: "idle", label: "IDLE", color: "bg-orange-400 text-white" },
  { key: "unreachable", label: "UNREACHABLE", color: "bg-red-600 text-white" },
  { key: "new", label: "NEW", color: "bg-gray-400 text-white" },
];

// Trip status pills configuration
const TRIP_STATUS_PILLS = [
  { key: "on_trip", label: "On Trip", color: "border-green-500 text-green-600 bg-green-50" },
  { key: "intransit", label: "Intransit", color: "border-yellow-500 text-yellow-600 bg-yellow-50" },
  { key: "not_on_trip", label: "Not On Trip", color: "border-red-500 text-red-600 bg-red-50" },
  { key: "at_loading", label: "At Loading", color: "border-muted text-muted-foreground bg-muted/20" },
  { key: "at_unloading", label: "At UnLoading", color: "border-muted text-muted-foreground bg-muted/20" },
  { key: "not_recognized", label: "Not Recognized", color: "border-muted text-muted-foreground bg-muted/20" },
  { key: "deviated", label: "Deviated", color: "border-muted text-muted-foreground bg-muted/20" },
];

// Get vehicle type icon
const getVehicleIcon = (make: string, status: string) => {
  const statusColors: Record<string, string> = {
    moving: "text-green-500",
    idle: "text-yellow-500",
    offline: "text-red-500",
    stopped: "text-red-500",
  };
  const color = statusColors[status] || "text-muted-foreground";
  
  // Simple icon selection based on make
  const makeLower = make?.toLowerCase() || "";
  if (makeLower.includes("bus") || makeLower.includes("coaster")) {
    return <Bus className={cn("w-8 h-8", color)} />;
  }
  if (makeLower.includes("truck") || makeLower.includes("lorry")) {
    return <Truck className={cn("w-8 h-8", color)} />;
  }
  return <Car className={cn("w-8 h-8", color)} />;
};

const Vehicles = () => {
  const navigate = useNavigate();
  const { vehicles: dbVehicles, loading } = useVehicles();
  const { telemetry, isVehicleOnline } = useVehicleTelemetry();
  
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tripStatusFilter, setTripStatusFilter] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>();
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  
  const debouncedSearch = useDebounce(searchInput, 300);
  
  // Transform vehicles with telemetry
  const vehicles = useMemo(() => {
    return dbVehicles.map((v) => {
      const vehicleTelemetry = telemetry[v.id];
      const online = isVehicleOnline(v.id);
      
      // Determine status
      let status: 'moving' | 'idle' | 'stopped' | 'offline' = 'offline';
      let speed = 0;
      let lat: number | undefined;
      let lng: number | undefined;
      
      if (vehicleTelemetry && online) {
        speed = vehicleTelemetry.speed_kmh || 0;
        lat = vehicleTelemetry.latitude;
        lng = vehicleTelemetry.longitude;
        
        if (speed > 3) {
          status = 'moving';
        } else if (vehicleTelemetry.engine_on || vehicleTelemetry.ignition_on) {
          status = 'idle';
        } else {
          status = 'stopped';
        }
      }
      
      return {
        id: v.id,
        plate: v.plate_number,
        make: v.make || "Unknown",
        model: v.model || "",
        year: v.year,
        status,
        speed,
        lat,
        lng,
        fuel: vehicleTelemetry?.fuel_level_percent ?? 0,
        heading: vehicleTelemetry?.heading ?? 0,
        lastUpdate: vehicleTelemetry?.last_communication_at,
        deviceConnected: online,
        isOverspeed: speed > 80, // Configurable threshold
      };
    });
  }, [dbVehicles, telemetry, isVehicleOnline]);
  
  // Compute status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: vehicles.length,
      running: vehicles.filter(v => v.status === 'moving').length,
      stopped: vehicles.filter(v => v.status === 'stopped' || v.status === 'offline').length,
      overspeed: vehicles.filter(v => v.isOverspeed).length,
      idle: vehicles.filter(v => v.status === 'idle').length,
      unreachable: vehicles.filter(v => !v.deviceConnected && v.status === 'offline').length,
      new: 0, // Vehicles added recently
    };
    return counts;
  }, [vehicles]);
  
  // Trip status counts (placeholder - would come from dispatch/trips data)
  const tripStatusCounts = useMemo(() => {
    return {
      on_trip: 0,
      intransit: 0,
      not_on_trip: vehicles.length,
      at_loading: 0,
      at_unloading: 0,
      not_recognized: 0,
      deviated: 0,
    };
  }, [vehicles]);
  
  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    let filtered = vehicles;
    
    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(v => 
        v.plate.toLowerCase().includes(query) ||
        v.make.toLowerCase().includes(query) ||
        v.model.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (statusFilter !== "all") {
      switch (statusFilter) {
        case "running":
          filtered = filtered.filter(v => v.status === 'moving');
          break;
        case "stopped":
          filtered = filtered.filter(v => v.status === 'stopped' || v.status === 'offline');
          break;
        case "overspeed":
          filtered = filtered.filter(v => v.isOverspeed);
          break;
        case "idle":
          filtered = filtered.filter(v => v.status === 'idle');
          break;
        case "unreachable":
          filtered = filtered.filter(v => !v.deviceConnected);
          break;
      }
    }
    
    return filtered;
  }, [vehicles, debouncedSearch, statusFilter]);
  
  // Map vehicles data - format for ClusteredMap
  const mapVehicles = useMemo(() => {
    return filteredVehicles
      .filter(v => v.lat && v.lng)
      .map(v => ({
        id: v.id,
        plate: v.plate,
        status: v.status,
        lat: v.lat!,
        lng: v.lng!,
        speed: v.speed,
        fuel: v.fuel,
        heading: v.heading,
      }));
  }, [filteredVehicles]);
  
  const handleVehicleClick = useCallback((vehicle: any) => {
    setSelectedVehicle({
      id: vehicle.plate,
      plate: vehicle.plate,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      status: vehicle.status,
      fuel: vehicle.fuel || 0,
      speed: vehicle.speed,
      vehicleId: vehicle.id,
    });
    setSelectedVehicleId(vehicle.id);
    setDetailModalOpen(true);
  }, []);
  
  const handleVehicleRowClick = useCallback((vehicle: any) => {
    setSelectedVehicleId(vehicle.id);
    
    // Fly to vehicle on map if it has coordinates
    if (vehicle.lat && vehicle.lng && mapInstance) {
      mapInstance.flyTo({
        center: [vehicle.lng, vehicle.lat],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [mapInstance]);
  
  const handleMapVehicleSelect = useCallback((vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
  }, []);
  
  // Get selected vehicle data for detail panel
  const selectedVehicleData = useMemo(() => {
    if (!selectedVehicleId) return null;
    const vehicle = filteredVehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return null;
    
    const vehicleTelemetry = telemetry[vehicle.id];
    
    return {
      id: vehicle.id,
      plate: vehicle.plate,
      make: vehicle.make,
      model: vehicle.model,
      status: vehicle.status,
      speed: vehicle.speed,
      lat: vehicle.lat,
      lng: vehicle.lng,
      fuel: vehicle.fuel,
      heading: vehicle.heading,
      lastUpdate: vehicle.lastUpdate,
      odometer: vehicleTelemetry?.odometer_km,
      todayDistance: undefined, // Would come from trip calculations
      odoDuration: undefined, // Would come from trip calculations
      distanceFromLastStop: undefined,
      durationFromLastStop: undefined,
      ignitionOn: vehicleTelemetry?.ignition_on,
      acOn: false,
      alias: undefined,
    };
  }, [selectedVehicleId, filteredVehicles, telemetry]);

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        {/* Header with Search and Filters */}
        <div className="p-4 border-b bg-background space-y-3">
          {/* Search Bar and Actions */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search Vehicle"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              FILTER
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="w-4 h-4" />
              SETTING
            </Button>
            
            {/* Status Badges */}
            <div className="flex-1 flex items-center justify-end gap-2">
              {STATUS_BADGES.map((badge) => (
                <Badge
                  key={badge.key}
                  variant="secondary"
                  className={cn(
                    "cursor-pointer transition-all px-3 py-1 text-xs font-semibold",
                    statusFilter === badge.key
                      ? badge.color
                      : "bg-muted text-muted-foreground hover:opacity-80",
                    statusFilter === badge.key && "ring-2 ring-offset-1 ring-primary/50"
                  )}
                  onClick={() => setStatusFilter(badge.key)}
                >
                  {statusCounts[badge.key] || 0} {badge.label}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Trip Status Pills */}
          <div className="flex items-center gap-2">
            {TRIP_STATUS_PILLS.map((pill) => (
              <button
                key={pill.key}
                onClick={() => setTripStatusFilter(tripStatusFilter === pill.key ? null : pill.key)}
                className={cn(
                  "px-4 py-1.5 rounded-full border-2 text-sm font-medium transition-all",
                  tripStatusFilter === pill.key
                    ? pill.color
                    : "border-border text-muted-foreground bg-background hover:border-primary/30"
                )}
              >
                {tripStatusCounts[pill.key as keyof typeof tripStatusCounts] || 0} {pill.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Split View: Table + Map */}
        <div className="flex-1 flex overflow-hidden">
          {/* Vehicle Table */}
          <div 
            className={cn(
              "border-r transition-all duration-300 flex flex-col bg-background",
              mapExpanded ? "w-0 overflow-hidden" : sidebarCollapsed ? "w-16" : "flex-1"
            )}
          >
            {!sidebarCollapsed && (
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="bg-primary hover:bg-primary">
                      <TableHead className="text-primary-foreground font-semibold w-12">SN</TableHead>
                      <TableHead className="text-primary-foreground font-semibold w-20">State</TableHead>
                      <TableHead className="text-primary-foreground font-semibold">Branch</TableHead>
                      <TableHead className="text-primary-foreground font-semibold">Vehicle</TableHead>
                      <TableHead className="text-primary-foreground font-semibold">Current_Status</TableHead>
                      <TableHead className="text-primary-foreground font-semibold">Address</TableHead>
                      <TableHead className="text-primary-foreground font-semibold w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={7}>
                            <Skeleton className="h-12 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          No vehicles found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVehicles.map((vehicle, index) => (
                        <HoverCard key={vehicle.id} openDelay={200} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <TableRow
                              className={cn(
                                "cursor-pointer transition-colors",
                                selectedVehicleId === vehicle.id 
                                  ? "bg-primary/10" 
                                  : index % 2 === 0 
                                    ? "bg-background" 
                                    : "bg-muted/30",
                                "hover:bg-primary/5"
                              )}
                              onClick={() => handleVehicleRowClick(vehicle)}
                              onDoubleClick={() => handleVehicleClick(vehicle)}
                            >
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center">
                                  {getVehicleIcon(vehicle.make, vehicle.status)}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {vehicle.make}
                                {vehicle.model && <span className="block text-xs text-muted-foreground">{vehicle.model}</span>}
                              </TableCell>
                              <TableCell className="font-mono font-medium">{vehicle.plate}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs capitalize",
                                    vehicle.status === 'moving' && "border-green-500 text-green-600 bg-green-50",
                                    vehicle.status === 'idle' && "border-yellow-500 text-yellow-600 bg-yellow-50",
                                    vehicle.status === 'stopped' && "border-red-500 text-red-600 bg-red-50",
                                    vehicle.status === 'offline' && "border-muted text-muted-foreground"
                                  )}
                                >
                                  {vehicle.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm max-w-[200px]">
                                <p className="truncate text-muted-foreground">
                                  {vehicle.lat && vehicle.lng 
                                    ? `${vehicle.lat.toFixed(4)}, ${vehicle.lng.toFixed(4)}`
                                    : "No location"}
                                </p>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {vehicle.isOverspeed && (
                                    <AlertTriangle className="w-4 h-4 text-destructive" />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVehicleClick(vehicle);
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          </HoverCardTrigger>
                          <HoverCardContent 
                            side="right" 
                            align="start" 
                            className="w-72 p-0 overflow-hidden animate-scale-in"
                          >
                            {/* Hover Card Header */}
                            <div className={cn(
                              "p-3 text-white",
                              vehicle.status === 'moving' && "bg-gradient-to-r from-green-500 to-green-600",
                              vehicle.status === 'idle' && "bg-gradient-to-r from-yellow-500 to-yellow-600",
                              vehicle.status === 'stopped' && "bg-gradient-to-r from-red-500 to-red-600",
                              vehicle.status === 'offline' && "bg-gradient-to-r from-gray-500 to-gray-600"
                            )}>
                              <div className="flex items-center gap-2">
                                {getVehicleIcon(vehicle.make, vehicle.status)}
                                <div>
                                  <p className="font-bold text-lg">{vehicle.plate}</p>
                                  <p className="text-xs opacity-90">{vehicle.make} {vehicle.model} {vehicle.year}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Hover Card Body */}
                            <div className="p-3 space-y-3">
                              {/* Speed & Fuel Row */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                                  <Gauge className="w-4 h-4 text-primary" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Speed</p>
                                    <p className="font-semibold">{vehicle.speed} km/h</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                                  <Fuel className="w-4 h-4 text-primary" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Fuel</p>
                                    <p className="font-semibold">{vehicle.fuel}%</p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Location */}
                              {vehicle.lat && vehicle.lng && (
                                <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                                  <MapPin className="w-4 h-4 text-primary mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">Location</p>
                                    <p className="text-sm truncate">{vehicle.lat.toFixed(5)}, {vehicle.lng.toFixed(5)}</p>
                                  </div>
                                </div>
                              )}
                              
                              {/* Last Update */}
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                                <Clock className="w-4 h-4 text-primary" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Last Update</p>
                                  <p className="text-sm">
                                    {vehicle.lastUpdate 
                                      ? formatDistanceToNow(new Date(vehicle.lastUpdate), { addSuffix: true })
                                      : "No data"}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Quick Actions */}
                              <div className="flex gap-2 pt-2 border-t">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="flex-1 gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVehicleRowClick(vehicle);
                                  }}
                                >
                                  <Navigation className="w-3 h-3" />
                                  Locate
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="flex-1 gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVehicleClick(vehicle);
                                  }}
                                >
                                  <Eye className="w-3 h-3" />
                                  Details
                                </Button>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
          
          {/* Resize Handle */}
          <div className="relative flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute z-20 -left-3 top-1/2 -translate-y-1/2 h-8 w-6 rounded-full bg-background border shadow-sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
          
          {/* Map Panel */}
          <div className={cn(
            "relative flex-1 min-w-0 transition-all duration-300",
            mapExpanded ? "flex-[2]" : ""
          )}>
            {/* Map Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              {/* Map Options Dropdown */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="gap-2 bg-background shadow-md">
                    <Settings className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-2">
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground px-2">Map Type</div>
                    <button
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm",
                        mapStyle === 'streets' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                      onClick={() => setMapStyle('streets')}
                    >
                      <Map className="w-4 h-4" />
                      Map view
                    </button>
                    <button
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm",
                        mapStyle === 'satellite' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                      onClick={() => setMapStyle('satellite')}
                    >
                      <Satellite className="w-4 h-4" />
                      Satellite view
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Fullscreen Toggle */}
              <Button
                variant="secondary"
                size="icon"
                className="bg-background shadow-md"
                onClick={() => setMapExpanded(!mapExpanded)}
              >
                {mapExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
            
            {/* Map Component */}
            <ClusteredMap
              vehicles={mapVehicles}
              selectedVehicleId={selectedVehicleId}
              onVehicleClick={(v) => handleMapVehicleSelect(v.id)}
              mapStyle={mapStyle}
              onMapReady={setMapInstance}
            />
            
            {/* Redirect to Map Button */}
            {selectedVehicleData && (
              <Button
                variant="default"
                size="sm"
                className="absolute top-4 left-4 z-10 gap-2 shadow-lg"
                onClick={() => navigate(`/map?vehicle=${selectedVehicleId}`)}
              >
                <MapPinned className="w-4 h-4" />
                Redirect to Map
              </Button>
            )}
          </div>
        </div>

        {/* Bottom Vehicle Detail Panel */}
        {selectedVehicleData && (
          <VehicleDetailPanel
            vehicle={selectedVehicleData}
            onClose={() => setSelectedVehicleId(undefined)}
            onDrivers={() => navigate(`/drivers?vehicle=${selectedVehicleId}`)}
            onTrack={() => navigate(`/map?vehicle=${selectedVehicleId}&track=true`)}
            onHistory={() => navigate(`/route-history?vehicle=${selectedVehicleId}`)}
          />
        )}
        
        {/* Vehicle Detail Modal */}
        {selectedVehicle && (
          <VehicleDetailModal
            open={detailModalOpen}
            onOpenChange={setDetailModalOpen}
            vehicle={selectedVehicle}
          />
        )}
      </div>
    </Layout>
  );
};

export default Vehicles;
