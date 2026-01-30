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
import { VehicleMapInfoCard } from "@/components/vehicles/VehicleMapInfoCard";
import { VehicleHoverCard } from "@/components/vehicles/VehicleHoverCard";
import { VehicleListItem } from "@/components/vehicles/VehicleListItem";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
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
  X,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import mapboxgl from "mapbox-gl";
import { formatDistanceToNow } from "date-fns";

const ITEMS_PER_PAGE = 10;

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
  const [viewMode, setViewMode] = useState<'table' | 'list'>('list');
  
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
        ignitionOn: vehicleTelemetry?.ignition_on || vehicleTelemetry?.engine_on,
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
  
  // Filter vehicles with smart search
  const filteredVehicles = useMemo(() => {
    let filtered = vehicles;
    
    // Smart search filter - search across multiple fields
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase().trim();
      const searchTerms = query.split(/\s+/); // Split by whitespace for multi-term search
      
      filtered = filtered.filter(v => {
        const searchableText = [
          v.plate,
          v.make,
          v.model,
          v.status,
          v.speed.toString(),
          v.lat?.toString() || '',
          v.lng?.toString() || '',
        ].join(' ').toLowerCase();
        
        // All search terms must match
        return searchTerms.every(term => searchableText.includes(term));
      });
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
  
  // Pagination
  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(
    filteredVehicles.length,
    ITEMS_PER_PAGE
  );
  
  // Paginated vehicles for table display
  const paginatedVehicles = useMemo(() => {
    return filteredVehicles.slice(startIndex, endIndex);
  }, [filteredVehicles, startIndex, endIndex]);
  
  // Map vehicles data - format for ClusteredMap (use all filtered, not paginated)
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
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Smart search: plate, make, model, status..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchInput && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchInput("")}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            
            {/* Result Count */}
            <Badge variant="secondary" className="text-xs px-3 py-1">
              {filteredVehicles.length} / {vehicles.length} vehicles
            </Badge>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              FILTER
            </Button>
            
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-2 rounded-r-none"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-2 rounded-l-none"
                onClick={() => setViewMode('table')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
            
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
                {viewMode === 'list' ? (
                  /* Card List View */
                  <div className="p-3 space-y-3">
                    {loading ? (
                      Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                        <div key={i} className="border rounded-lg p-3">
                          <Skeleton className="h-24 w-full" />
                        </div>
                      ))
                    ) : paginatedVehicles.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        {filteredVehicles.length === 0 && searchInput 
                          ? `No vehicles match "${searchInput}"`
                          : "No vehicles found"
                        }
                      </div>
                    ) : (
                      paginatedVehicles.map((vehicle) => (
                        <VehicleListItem
                          key={vehicle.id}
                          vehicle={{
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
                            ignitionOn: vehicle.ignitionOn,
                            acOn: false,
                            deviceConnected: vehicle.deviceConnected,
                          }}
                          isSelected={selectedVehicleId === vehicle.id}
                          onClick={() => handleVehicleRowClick(vehicle)}
                          onDoubleClick={() => handleVehicleClick(vehicle)}
                        />
                      ))
                    )}
                  </div>
                ) : (
                  /* Table View */
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
                        Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={7}>
                              <Skeleton className="h-12 w-full" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : paginatedVehicles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                            {filteredVehicles.length === 0 && searchInput 
                              ? `No vehicles match "${searchInput}"`
                              : "No vehicles found"
                            }
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedVehicles.map((vehicle, index) => (
                          <TableRow
                            key={vehicle.id}
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
                            <TableCell className="font-medium">
                              {startIndex + index + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center">
                                {getVehicleIcon(vehicle.make, vehicle.status)}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {vehicle.make}
                              {vehicle.model && <span className="block text-xs text-muted-foreground">{vehicle.model}</span>}
                            </TableCell>
                            <TableCell>
                              {/* Hover card on plate number */}
                              <HoverCard openDelay={300} closeDelay={100}>
                                <HoverCardTrigger asChild>
                                  <span className="font-mono font-medium cursor-pointer hover:text-primary hover:underline">
                                    {vehicle.plate}
                                  </span>
                                </HoverCardTrigger>
                                <HoverCardContent 
                                  side="right" 
                                  align="start" 
                                  className="w-[450px] p-4 shadow-xl border-border/50"
                                  sideOffset={12}
                                >
                                  <VehicleHoverCard vehicle={vehicle} />
                                </HoverCardContent>
                              </HoverCard>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs capitalize",
                                  vehicle.status === 'moving' && "border-success text-success bg-success/10",
                                  vehicle.status === 'idle' && "border-warning text-warning bg-warning/10",
                                  vehicle.status === 'stopped' && "border-destructive text-destructive bg-destructive/10",
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
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
                
                {/* Pagination */}
                <TablePagination
                  currentPage={currentPage}
                  totalItems={filteredVehicles.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
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

            {/* Map Side Info Card */}
            {selectedVehicleData && (
              <VehicleMapInfoCard
                plate={selectedVehicleData.plate}
                speed={selectedVehicleData.speed}
                ignitionOn={selectedVehicleData.ignitionOn}
                acOn={selectedVehicleData.acOn}
                fuel={selectedVehicleData.fuel}
                lastUpdate={selectedVehicleData.lastUpdate}
                onToday={() => navigate(`/route-history?vehicle=${selectedVehicleId}&date=today`)}
                onAddPOI={() => navigate(`/geofences?add=true&lat=${selectedVehicleData.lat}&lng=${selectedVehicleData.lng}`)}
              />
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
