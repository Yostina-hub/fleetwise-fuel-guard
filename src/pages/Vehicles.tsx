import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
import { VehicleQuickInfoPopup } from "@/components/vehicles/VehicleQuickInfoPopup";
import { VehiclesTabSwitcher } from "@/components/vehicles/VehiclesTabSwitcher";
import { MobileVehiclesList } from "@/components/mobile/MobileVehiclesList";
import FleetVitalsDashboard from "@/components/vehicles/FleetVitalsDashboard";
import FleetBulkActions from "@/components/vehicles/FleetBulkActions";
import VehicleFuelSparkline from "@/components/vehicles/VehicleFuelSparkline";
import VehicleAlertBadge from "@/components/vehicles/VehicleAlertBadge";
import FleetRefreshTimer from "@/components/vehicles/FleetRefreshTimer";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
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
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Zap,
  Power,
  Route,
  Radio,
  LocateFixed,
  ShieldAlert,
  IdCard,
} from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { useVehicleCalculatedMetrics } from "@/hooks/useVehicleCalculatedMetrics";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import FleetHealthRing from "@/components/vehicles/FleetHealthRing";
import VehicleActivityMinibar from "@/components/vehicles/VehicleActivityMinibar";
import VehicleHeadingArrow from "@/components/vehicles/VehicleHeadingArrow";
import ColumnVisibilityToggle, { type ColumnConfig } from "@/components/vehicles/ColumnVisibilityToggle";
import { useVehicle24hActivity } from "@/hooks/useVehicle24hActivity";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import maplibregl from "maplibre-gl";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";

const ITEMS_PER_PAGE = 20; // Updated to 20 items per page

// Status filter badges configuration - horizontal compact style
const STATUS_BADGES = [
  { key: "all", label: "ALL", color: "bg-primary/20 text-primary border-primary/30" },
  { key: "running", label: "RUNNING", color: "bg-success/20 text-success border-success/30" },
  { key: "stopped", label: "STOPPED", color: "bg-warning/20 text-warning border-warning/30" },
  { key: "overspeed", label: "OVERSPEED", color: "bg-destructive/20 text-destructive border-destructive/30" },
  { key: "idle", label: "IDLE", color: "bg-orange-500/20 text-orange-500 border-orange-500/30" },
  { key: "unreachable", label: "UNREACHABLE", color: "bg-red-600/20 text-red-600 border-red-600/30" },
  { key: "new", label: "NEW", color: "bg-muted text-muted-foreground border-border" },
];

// Trip status pills configuration
const TRIP_STATUS_PILLS = [
  { key: "on_trip", label: "On Trip", color: "bg-success/10 text-success border-success/30" },
  { key: "intransit", label: "Intransit", color: "bg-warning/10 text-warning border-warning/30" },
  { key: "not_on_trip", label: "Not On Trip", color: "bg-destructive/10 text-destructive border-destructive/30" },
  { key: "at_loading", label: "At Loading", color: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  { key: "at_unloading", label: "At UnLoading", color: "bg-purple-500/10 text-purple-500 border-purple-500/30" },
  { key: "not_recognized", label: "Not Recognized", color: "bg-muted text-muted-foreground border-border" },
  { key: "deviated", label: "Deviated", color: "bg-orange-500/10 text-orange-500 border-orange-500/30" },
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { vehicles: dbVehicles, loading } = useVehicles();
  const { telemetry, isVehicleOnline } = useVehicleTelemetry();
  
  // Get all vehicle IDs for calculated metrics
  const allVehicleIds = useMemo(() => dbVehicles.map(v => v.id), [dbVehicles]);
  const { getMetrics } = useVehicleCalculatedMetrics(allVehicleIds);
  const activityMap = useVehicle24hActivity(allVehicleIds);
  
  
  // Persisted UI prefs (#29/#30) — defaults: newest first, all statuses
  const VEH_PREFS_KEY = "vehicles.listPrefs.v1";
  const persistedPrefs = (() => {
    try { return JSON.parse(localStorage.getItem(VEH_PREFS_KEY) || "{}"); } catch { return {}; }
  })();

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(persistedPrefs.statusFilter ?? "all");
  const [tripStatusFilter, setTripStatusFilter] = useState<string | null>(persistedPrefs.tripStatusFilter ?? null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>();
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'list'>(persistedPrefs.viewMode ?? 'table');
  const [showQuickInfo, setShowQuickInfo] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>(persistedPrefs.sortColumn ?? "newest");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(persistedPrefs.sortDirection ?? 'desc');
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([
    { key: 'sn', label: '#', visible: true, locked: true },
    { key: 'ignition', label: 'Ignition', visible: true },
    { key: 'vehicle', label: 'Vehicle', visible: true, locked: true },
    { key: 'driver', label: 'Driver', visible: true },
    { key: 'status', label: 'Status', visible: true },
    { key: 'fuel', label: 'Fuel', visible: true },
    { key: 'speed', label: 'Speed', visible: true },
    { key: 'heading', label: 'Heading', visible: true },
    { key: 'distance', label: 'Today Dist.', visible: true },
    { key: 'lastSeen', label: 'Last Seen', visible: true },
    { key: 'activity', label: '24h Activity', visible: true },
    { key: 'alerts', label: 'Alerts', visible: true },
    { key: 'fuelTrend', label: 'Fuel Trend', visible: true },
    { key: 'actions', label: 'Actions', visible: true, locked: true },
  ]);
  
  const isColVisible = useCallback((key: string) => columnConfig.find(c => c.key === key)?.visible ?? true, [columnConfig]);
  
  const debouncedSearch = useDebounce(searchInput, 300);

  // Persist user prefs (#29/#30)
  useEffect(() => {
    try {
      localStorage.setItem(VEH_PREFS_KEY, JSON.stringify({
        statusFilter,
        tripStatusFilter,
        viewMode,
        sortColumn,
        sortDirection,
      }));
    } catch {}
  }, [statusFilter, tripStatusFilter, viewMode, sortColumn, sortDirection]);
  
  // Mobile view handler
  const handleMobileVehicleSelect = useCallback((vehicleId: string) => {
    navigate(`/map?vehicle=${vehicleId}`);
  }, [navigate]);
  
  // Transform vehicles with telemetry
  const vehicles = useMemo(() => {
    return dbVehicles.map((v) => {
      const vehicleTelemetry = telemetry[v.id];
      const online = isVehicleOnline(v.id);
      const calculatedMetrics = getMetrics(v.id);
      
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
      
      const driverName = v.assigned_driver
        ? `${v.assigned_driver.first_name} ${v.assigned_driver.last_name}`
        : null;
      
      const lastComm = vehicleTelemetry?.last_communication_at;
      const lastSeen = lastComm ? formatDistanceToNow(new Date(lastComm), { addSuffix: true }) : null;
      
      return {
        id: v.id,
        plate: v.plate_number,
        make: v.make || "Unknown",
        model: v.model || "",
        year: v.year,
        vehicleType: v.vehicle_type || "Vehicle",
        fuelType: v.fuel_type || "",
        branch: v.depot?.name || "Head Office",
        driverName,
        status,
        speed,
        lat,
        lng,
        fuel: vehicleTelemetry?.fuel_level_percent ?? 0,
        heading: vehicleTelemetry?.heading ?? 0,
        lastUpdate: vehicleTelemetry?.last_communication_at,
        lastSeen,
        deviceConnected: online,
        ignitionOn: vehicleTelemetry?.ignition_on || vehicleTelemetry?.engine_on || false,
        isOverspeed: speed > 80,
        todayDistance: calculatedMetrics.todayDistance || 0,
        odometer: vehicleTelemetry?.odometer_km ?? 0,
        createdAt: v.created_at,
        ownershipType: v.ownership_type,
      };
    });
  }, [dbVehicles, telemetry, isVehicleOnline, getMetrics]);
  
  // Compute status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: vehicles.length,
      running: vehicles.filter(v => v.status === 'moving').length,
      stopped: vehicles.filter(v => v.status === 'stopped' || v.status === 'offline').length,
      overspeed: vehicles.filter(v => v.isOverspeed).length,
      idle: vehicles.filter(v => v.status === 'idle').length,
      unreachable: vehicles.filter(v => !v.deviceConnected && v.status === 'offline').length,
      new: 0,
    };
    return counts;
  }, [vehicles]);
  
  // Trip status counts from dispatch_jobs (active trips)
  const [tripStatusCounts, setTripStatusCounts] = useState({
    on_trip: 0, intransit: 0, not_on_trip: 0, at_loading: 0, at_unloading: 0, not_recognized: 0, deviated: 0,
  });

  useEffect(() => {
    const fetchTripCounts = async () => {
      const { data } = await supabase
        .from("dispatch_jobs")
        .select("status, vehicle_id")
        .in("status", ["dispatched", "in_transit", "at_pickup", "at_dropoff", "completed"]);
      
      const vehicleIdsWithTrips = new Set((data || []).filter(d => d.vehicle_id).map(d => d.vehicle_id));
      const activeTrips = (data || []).filter(d => !["completed", "cancelled"].includes(d.status));
      
      setTripStatusCounts({
        on_trip: activeTrips.length,
        intransit: (data || []).filter(d => d.status === "in_transit").length,
        not_on_trip: Math.max(0, vehicles.length - vehicleIdsWithTrips.size),
        at_loading: (data || []).filter(d => d.status === "at_pickup").length,
        at_unloading: (data || []).filter(d => d.status === "at_dropoff").length,
        not_recognized: 0,
        deviated: 0,
      });
    };
    if (vehicles.length > 0) fetchTripCounts();
  }, [vehicles.length]);
  
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
    
    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortColumn) {
        case 'newest':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'plate': aVal = a.plate; bVal = b.plate; break;
        case 'speed': aVal = a.speed; bVal = b.speed; break;
        case 'fuel': aVal = a.fuel; bVal = b.fuel; break;
        case 'status': aVal = a.status; bVal = b.status; break;
        case 'driver': aVal = a.driverName || ''; bVal = b.driverName || ''; break;
        case 'distance': aVal = a.todayDistance; bVal = b.todayDistance; break;
        default:
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [vehicles, debouncedSearch, statusFilter, sortColumn, sortDirection]);
  
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

  // Sort toggle handler
  const toggleSort = useCallback((col: string) => {
    if (sortColumn === col) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  // Bulk selection handlers
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredVehicles.map(v => v.id)));
  }, [filteredVehicles]);
  
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  
  const handleVehicleRowClick = useCallback((vehicle: any) => {
    setSelectedVehicleId(vehicle.id);
    setShowQuickInfo(true);
    
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
    setShowQuickInfo(true);
  }, []);
  
  // Get selected vehicle data for detail panel
  const selectedVehicleData = useMemo(() => {
    if (!selectedVehicleId) return null;
    const vehicle = filteredVehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return null;
    
    const vehicleTelemetry = telemetry[vehicle.id];
    const calculatedMetrics = getMetrics(vehicle.id);
    
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
      todayDistance: calculatedMetrics.todayDistance || undefined,
      odoDuration: undefined, // Would need engine hours tracking
      distanceFromLastStop: calculatedMetrics.distanceFromLastStop ?? undefined,
      durationFromLastStop: calculatedMetrics.durationFromLastStop ?? undefined,
      ignitionOn: vehicleTelemetry?.ignition_on,
      acOn: false,
      alias: undefined,
    };
  }, [selectedVehicleId, filteredVehicles, telemetry, getMetrics]);

  // Render mobile view
  if (isMobile) {
    return (
      <Layout>
        <div className="px-4 pt-3 pb-2 border-b bg-background/80 backdrop-blur">
          <VehiclesTabSwitcher active="owned" />
        </div>
        <div className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
          <MobileVehiclesList onVehicleSelect={handleMobileVehicleSelect} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        {/* Owned Fleet ↔ Rental Vehicles tab switcher */}
        <div className="px-4 pt-3 pb-2 border-b bg-background/80 backdrop-blur">
          <VehiclesTabSwitcher active="owned" />
        </div>

        {/* Fleet Vitals Dashboard + Health Ring */}
        <div className="px-4 pt-3 pb-1 border-b bg-background/80 backdrop-blur flex items-center gap-4">
          <FleetHealthRing
            moving={statusCounts.running}
            idle={statusCounts.idle}
            stopped={vehicles.filter(v => v.status === 'stopped').length}
            offline={vehicles.filter(v => v.status === 'offline').length}
            total={vehicles.length}
          />
          <div className="flex-1 overflow-hidden">
            <FleetVitalsDashboard
              vehicles={vehicles}
              onCardClick={(key) => {
                switch (key) {
                  case "online":
                    setStatusFilter("unreachable");
                    break;
                  case "moving":
                  case "speed":
                    setStatusFilter("running");
                    break;
                  case "utilization":
                    setStatusFilter("all");
                    break;
                  case "overspeed":
                    setStatusFilter("overspeed");
                    break;
                  case "health":
                  case "fuel":
                  default:
                    setStatusFilter("all");
                    break;
                }
              }}
              onFleetMixClick={(segment) => {
                if (segment === "rental") {
                  navigate("/rental-vehicles");
                } else {
                  setStatusFilter("all");
                }
              }}
            />
          </div>
          <FleetRefreshTimer intervalSeconds={30} />
        </div>

        {/* Header with Search and Filters */}
        <div className="p-4 border-b bg-background space-y-3">
          {/* Row 1: Search, Count Badge, Filter, View Toggle, Bulk Actions, Status Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative min-w-[200px] max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('vehicles.smartSearch', 'Smart search...')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9 bg-background/50 border-border/50"
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
            
            {/* Result Count Badge */}
            <Badge 
              variant="default" 
              className="px-3 py-1.5 text-sm font-semibold bg-primary text-primary-foreground"
            >
              {filteredVehicles.length} / {vehicles.length} {t('map.vehicles').toLowerCase()}
            </Badge>
            
            {/* Bulk Actions + Export */}
            <FleetBulkActions
              selectedIds={selectedIds}
              vehicles={filteredVehicles}
              onClearSelection={clearSelection}
              onSelectAll={selectAll}
              allSelected={selectedIds.size === filteredVehicles.length && filteredVehicles.length > 0}
            />
            
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-none h-9 px-3",
                  viewMode === 'table' && "bg-muted"
                )}
                onClick={() => setViewMode('table')}
                aria-label="List view"
              >
                <LayoutList className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-none h-9 px-3",
                  viewMode === 'list' && "bg-muted"
                )}
                onClick={() => setViewMode('list')}
                aria-label="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Column Visibility */}
            <ColumnVisibilityToggle columns={columnConfig} onChange={setColumnConfig} />
            
            {/* Spacer */}
            <div className="flex-1" />
            
            {/* Status Badges - Horizontal */}
            <div className="flex items-center gap-2">
              {STATUS_BADGES.map((badge) => (
                <button
                  key={badge.key}
                  onClick={() => setStatusFilter(badge.key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                    badge.color,
                    statusFilter === badge.key && "ring-2 ring-offset-2 ring-offset-background ring-primary/50"
                  )}
                >
                  <span className="font-bold">{statusCounts[badge.key] || 0}</span>
                  <span>{badge.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Row 2: Trip Status Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {TRIP_STATUS_PILLS.map((pill) => (
              <button
                key={pill.key}
                onClick={() => setTripStatusFilter(tripStatusFilter === pill.key ? null : pill.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-medium transition-all",
                  tripStatusFilter === pill.key
                    ? pill.color
                    : "border-border text-muted-foreground bg-background hover:border-primary/30"
                )}
              >
                <span className="font-bold">{tripStatusCounts[pill.key as keyof typeof tripStatusCounts] || 0}</span>
                <span>{pill.label}</span>
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
              mapExpanded ? "w-0 overflow-hidden" : sidebarCollapsed ? "w-14" : "flex-1"
            )}
          >
            {/* Collapsed state - show toggle only */}
            {sidebarCollapsed && !mapExpanded && (
              <div className="flex flex-col items-center py-4 gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-primary/10"
                  onClick={() => setSidebarCollapsed(false)}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
                <span className="text-xs text-muted-foreground writing-mode-vertical rotate-180" style={{ writingMode: 'vertical-rl' }}>
                  {filteredVehicles.length} {t('map.vehicles')}
                </span>
              </div>
            )}
            
            {!sidebarCollapsed && (
              <div className="flex-1 overflow-auto">
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
                          onProfile={() => navigate(`/vehicle-profile?id=${vehicle.id}`)}
                        />
                      ))
                    )}
                  </div>
                ) : (
                  /* Table View (List in UI terminology) */
                  <TooltipProvider>
                  <Table className="min-w-[1200px]">
                    <TableHeader className="sticky top-0 z-10">
                      <TableRow className="bg-primary/10 hover:bg-primary/10">
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectedIds.size === paginatedVehicles.length && paginatedVehicles.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds(new Set(filteredVehicles.map(v => v.id)));
                              } else {
                                setSelectedIds(new Set());
                              }
                            }}
                          />
                        </TableHead>
                        {isColVisible('sn') && (
                          <TableHead
                            className="text-foreground font-semibold w-12 cursor-pointer select-none"
                            onClick={() => toggleSort('newest')}
                            title="Sort by date added"
                          >
                            <div className="flex items-center gap-1">SN {sortColumn === 'newest' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}</div>
                          </TableHead>
                        )}
                        {isColVisible('ignition') && (
                          <TableHead className="text-foreground font-semibold w-12">
                            <Power className="w-3.5 h-3.5 mx-auto" />
                          </TableHead>
                        )}
                        {isColVisible('vehicle') && (
                          <TableHead className="text-foreground font-semibold cursor-pointer select-none" onClick={() => toggleSort('plate')}>
                            <div className="flex items-center gap-1">Vehicle {sortColumn === 'plate' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}</div>
                          </TableHead>
                        )}
                        {isColVisible('driver') && (
                          <TableHead className="text-foreground font-semibold cursor-pointer select-none" onClick={() => toggleSort('driver')}>
                            <div className="flex items-center gap-1">Driver {sortColumn === 'driver' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}</div>
                          </TableHead>
                        )}
                        {isColVisible('status') && (
                          <TableHead className="text-foreground font-semibold cursor-pointer select-none" onClick={() => toggleSort('status')}>
                            <div className="flex items-center gap-1">Status {sortColumn === 'status' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}</div>
                          </TableHead>
                        )}
                        {isColVisible('fuel') && (
                          <TableHead className="text-foreground font-semibold w-24 cursor-pointer select-none" onClick={() => toggleSort('fuel')}>
                            <div className="flex items-center gap-1">Fuel {sortColumn === 'fuel' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}</div>
                          </TableHead>
                        )}
                        {isColVisible('speed') && (
                          <TableHead className="text-foreground font-semibold cursor-pointer select-none" onClick={() => toggleSort('speed')}>
                            <div className="flex items-center gap-1">Speed {sortColumn === 'speed' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}</div>
                          </TableHead>
                        )}
                        {isColVisible('heading') && (
                          <TableHead className="text-foreground font-semibold w-14">Dir</TableHead>
                        )}
                        {isColVisible('distance') && (
                          <TableHead className="text-foreground font-semibold cursor-pointer select-none" onClick={() => toggleSort('distance')}>
                            <div className="flex items-center gap-1">Today <Route className="w-3 h-3" /> {sortColumn === 'distance' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}</div>
                          </TableHead>
                        )}
                        {isColVisible('lastSeen') && <TableHead className="text-foreground font-semibold">Last Seen</TableHead>}
                        {isColVisible('activity') && <TableHead className="text-foreground font-semibold w-[100px]">24h Activity</TableHead>}
                        {isColVisible('alerts') && (
                          <TableHead className="text-foreground font-semibold w-10">
                            <ShieldAlert className="w-3.5 h-3.5 mx-auto" />
                          </TableHead>
                        )}
                        {isColVisible('fuelTrend') && <TableHead className="text-foreground font-semibold w-[70px]">Fuel Trend</TableHead>}
                        {isColVisible('actions') && <TableHead className="text-foreground font-semibold w-20">{t('common.actions', 'Actions')}</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={15}>
                              <Skeleton className="h-12 w-full" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : paginatedVehicles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={15} className="text-center py-12 text-muted-foreground">
                            {filteredVehicles.length === 0 && searchInput 
                              ? `No vehicles match "${searchInput}"`
                              : "No vehicles found"
                            }
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedVehicles.map((vehicle, index) => (
                          <ContextMenu>
                            <ContextMenuTrigger asChild>
                          <motion.tr
                            key={vehicle.id}
                            initial={false}
                            animate={{ 
                              backgroundColor: selectedVehicleId === vehicle.id 
                                ? "hsl(var(--primary) / 0.1)" 
                                : selectedIds.has(vehicle.id)
                                  ? "hsl(var(--primary) / 0.05)"
                                  : index % 2 === 0 
                                    ? "transparent" 
                                    : "hsl(var(--muted) / 0.3)"
                            }}
                            className={cn(
                              "cursor-pointer hover:bg-primary/5 border-b transition-colors",
                              vehicle.isOverspeed && "border-l-2 border-l-destructive",
                              vehicle.fuel > 0 && vehicle.fuel < 15 && !vehicle.isOverspeed && "border-l-2 border-l-warning",
                              !vehicle.deviceConnected && vehicle.status === 'offline' && !vehicle.isOverspeed && vehicle.fuel >= 15 && "border-l-2 border-l-muted-foreground/40"
                            )}
                            onClick={() => handleVehicleRowClick(vehicle)}
                            onDoubleClick={() => handleVehicleClick(vehicle)}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleVehicleClick(vehicle);
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                (e.currentTarget.nextElementSibling as HTMLElement)?.focus();
                              }
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                (e.currentTarget.previousElementSibling as HTMLElement)?.focus();
                              }
                            }}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.has(vehicle.id)}
                                onCheckedChange={() => toggleSelection(vehicle.id)}
                              />
                            </TableCell>
                            {isColVisible('sn') && (
                              <TableCell className="font-medium text-xs">
                                {startIndex + index + 1}
                              </TableCell>
                            )}
                            {isColVisible('ignition') && (
                              <TableCell>
                                <div className="flex items-center justify-center">
                                  {vehicle.ignitionOn ? (
                                    <motion.div
                                      animate={{ opacity: [1, 0.5, 1] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                    >
                                      <Zap className="w-4 h-4 text-success" />
                                    </motion.div>
                                  ) : (
                                    <Power className="w-4 h-4 text-muted-foreground/40" />
                                  )}
                                </div>
                              </TableCell>
                            )}
                            {isColVisible('vehicle') && (
                              <TableCell>
                                <HoverCard openDelay={300} closeDelay={100}>
                                  <HoverCardTrigger asChild>
                                    <div className="cursor-pointer hover:text-primary">
                                      <span className="font-mono font-semibold text-sm">{vehicle.plate}</span>
                                      <div className="text-[10px] text-muted-foreground">{vehicle.make} {vehicle.model}</div>
                                    </div>
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
                            )}
                            {isColVisible('driver') && (
                              <TableCell>
                                {vehicle.driverName ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                      <User className="w-2.5 h-2.5 text-primary" />
                                    </div>
                                    <span className="text-xs font-medium truncate max-w-[90px]">{vehicle.driverName}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground italic">—</span>
                                )}
                              </TableCell>
                            )}
                            {isColVisible('status') && (
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <motion.div
                                    animate={vehicle.status === 'moving' ? { scale: [1, 1.2, 1] } : {}}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className={cn(
                                      "w-2 h-2 rounded-full shrink-0",
                                      vehicle.status === 'moving' && "bg-success",
                                      vehicle.status === 'idle' && "bg-warning",
                                      vehicle.status === 'stopped' && "bg-destructive",
                                      vehicle.status === 'offline' && "bg-muted-foreground/50"
                                    )}
                                  />
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[10px] capitalize px-1.5 py-0",
                                      vehicle.status === 'moving' && "border-success text-success bg-success/10",
                                      vehicle.status === 'idle' && "border-warning text-warning bg-warning/10",
                                      vehicle.status === 'stopped' && "border-destructive text-destructive bg-destructive/10",
                                      vehicle.status === 'offline' && "border-muted text-muted-foreground"
                                    )}
                                  >
                                    {vehicle.status}
                                  </Badge>
                                </div>
                              </TableCell>
                            )}
                            {isColVisible('fuel') && (
                              <TableCell>
                                <div className="flex items-center gap-1.5 min-w-[80px]">
                                  <Fuel className={cn(
                                    "w-3 h-3 shrink-0",
                                    vehicle.fuel > 50 ? "text-success" : vehicle.fuel > 20 ? "text-warning" : "text-destructive"
                                  )} />
                                  <div className="flex-1">
                                    <Progress value={vehicle.fuel} className="h-1.5" />
                                  </div>
                                  <span className="text-[10px] font-mono font-medium w-8 text-right">
                                    {vehicle.fuel}%
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            {isColVisible('speed') && (
                              <TableCell>
                                <span className={cn(
                                  "text-xs font-mono font-medium",
                                  vehicle.isOverspeed && "text-destructive font-bold"
                                )}>
                                  {vehicle.speed} <span className="text-muted-foreground text-[10px]">km/h</span>
                                </span>
                                {vehicle.isOverspeed && (
                                  <AlertTriangle className="w-3 h-3 text-destructive inline-block ml-1 animate-pulse" />
                                )}
                              </TableCell>
                            )}
                            {isColVisible('heading') && (
                              <TableCell>
                                <VehicleHeadingArrow heading={vehicle.heading} speed={vehicle.speed} />
                              </TableCell>
                            )}
                            {isColVisible('distance') && (
                              <TableCell>
                                <span className="text-xs font-mono text-muted-foreground">
                                  {vehicle.todayDistance > 0 ? `${vehicle.todayDistance.toFixed(1)} km` : "—"}
                                </span>
                              </TableCell>
                            )}
                            {isColVisible('lastSeen') && (
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Radio className={cn("w-3 h-3", vehicle.deviceConnected ? "text-success" : "text-muted-foreground/40")} />
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                                    {vehicle.lastSeen || "Never"}
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            {isColVisible('activity') && (
                              <TableCell>
                                <VehicleActivityMinibar 
                                  hourlyStatus={activityMap[vehicle.id]} 
                                  className="w-[90px]" 
                                />
                              </TableCell>
                            )}
                            {isColVisible('alerts') && (
                              <TableCell>
                                <VehicleAlertBadge vehicleId={vehicle.id} />
                              </TableCell>
                            )}
                            {isColVisible('fuelTrend') && (
                              <TableCell>
                                <VehicleFuelSparkline vehicleId={vehicle.id} currentFuel={vehicle.fuel} />
                              </TableCell>
                            )}
                            {isColVisible('actions') && (
                              <TableCell>
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    title="Track on Map"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/map?vehicle=${vehicle.id}&track=true`);
                                    }}
                                  >
                                    <LocateFixed className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    title="Quick Details"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVehicleClick(vehicle);
                                    }}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    title="Open Vehicle Profile"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/vehicle-profile?id=${vehicle.id}`);
                                    }}
                                  >
                                    <IdCard className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    title="Route History"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/route-history?vehicle=${vehicle.id}`);
                                    }}
                                  >
                                    <Route className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </motion.tr>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-52">
                              <ContextMenuItem onClick={() => handleVehicleClick(vehicle)}>
                                <Eye className="w-4 h-4 mr-2" /> Quick Details
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => navigate(`/vehicle-profile?id=${vehicle.id}`)}>
                                <IdCard className="w-4 h-4 mr-2" /> Open Vehicle Profile
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => navigate(`/map?vehicle=${vehicle.id}&track=true`)}>
                                <LocateFixed className="w-4 h-4 mr-2" /> Track on Map
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => navigate(`/route-history?vehicle=${vehicle.id}`)}>
                                <Route className="w-4 h-4 mr-2" /> Route History
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem onClick={() => navigate(`/drivers?vehicle=${vehicle.id}`)}>
                                <User className="w-4 h-4 mr-2" /> Assign Driver
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => navigate("/maintenance")}>
                                <Gauge className="w-4 h-4 mr-2" /> Maintenance
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem onClick={() => {
                                if (vehicle.lat && vehicle.lng) {
                                  navigator.clipboard.writeText(`${vehicle.lat},${vehicle.lng}`);
                                }
                              }}>
                                <MapPin className="w-4 h-4 mr-2" /> Copy Coordinates
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </TooltipProvider>
                )}
                
                {/* Pagination */}
                <TablePagination
                  currentPage={currentPage}
                  totalItems={filteredVehicles.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
          
          {/* Quick Info Popup Panel */}
          {showQuickInfo && selectedVehicleData && (
            <div className="w-[340px] border-r bg-background overflow-hidden">
              <VehicleQuickInfoPopup
                vehicle={selectedVehicleData}
                onClose={() => {
                  setShowQuickInfo(false);
                  setSelectedVehicleId(undefined);
                }}
                onDrivers={() => navigate(`/drivers?vehicle=${selectedVehicleId}`)}
                onTrack={() => navigate(`/map?vehicle=${selectedVehicleId}&track=true`)}
                onHistory={() => navigate(`/route-history?vehicle=${selectedVehicleId}`)}
              />
            </div>
          )}
          
          {/* Sidebar Toggle Handle */}
          {!mapExpanded && (
            <div className="relative flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="absolute z-20 -left-3 top-1/2 -translate-y-1/2 h-8 w-6 rounded-full bg-background border shadow-md hover:bg-primary/10 transition-colors"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
            </div>
          )}
          
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
