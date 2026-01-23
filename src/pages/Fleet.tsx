import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import VehicleDetailModal from "@/components/VehicleDetailModal";
import CreateVehicleDialog from "@/components/fleet/CreateVehicleDialog";
import EditVehicleDialog from "@/components/fleet/EditVehicleDialog";
import DeleteVehicleDialog from "@/components/fleet/DeleteVehicleDialog";
import BulkActionsToolbar from "@/components/fleet/BulkActionsToolbar";
import AssignDriverDialog from "@/components/fleet/AssignDriverDialog";
import BulkImportDialog from "@/components/fleet/BulkImportDialog";
import { VehicleControlPanel } from "@/components/fleet/VehicleControlPanel";
import { GPSDeviceDialog } from "@/components/fleet/GPSDeviceDialog";
import { TerminalSettingsPanel } from "@/components/fleet/TerminalSettingsPanel";
import { VehicleVirtualGrid } from "@/components/fleet/VehicleVirtualGrid";
import { VehicleTableView } from "@/components/fleet/VehicleTableView";
import { useFleetExport } from "@/components/fleet/FleetExportUtils";
import FleetQuickStats from "@/components/fleet/FleetQuickStats";
import FleetQuickActions from "@/components/fleet/FleetQuickActions";
import FleetStatusBadges from "@/components/fleet/FleetStatusBadges";
import TripStatusFilters from "@/components/fleet/TripStatusFilters";
import FleetMiniMap from "@/components/fleet/FleetMiniMap";
import { VehicleGridSkeleton, StatsRowSkeleton } from "@/components/ui/skeletons";
import { supabase } from "@/integrations/supabase/client";
import { 
  Truck, 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  LayoutGrid,
  List,
  X,
  SlidersHorizontal,
  Download,
  Upload
} from "lucide-react";
import { useVehiclesPaginated } from "@/hooks/useVehiclesPaginated";
import { useFleetStats } from "@/hooks/useFleetStats";
import { useDebounce } from "@/hooks/useDebounce";
import { useDrivers } from "@/hooks/useDrivers";
import { useVehicleTelemetryBatch } from "@/hooks/useVehicleTelemetryBatch";
import { useNextServiceDate } from "@/hooks/useNextServiceDate";

const VEHICLE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "automobile", label: "Automobile" },
  { value: "truck", label: "Truck" },
  { value: "bus", label: "Bus" },
  { value: "van", label: "Van" },
  { value: "pickup", label: "Pickup" },
  { value: "trailer", label: "Trailer" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "heavy_equipment", label: "Heavy Equipment" },
];

const FUEL_TYPES = [
  { value: "all", label: "All Fuel Types" },
  { value: "diesel", label: "Diesel" },
  { value: "petrol", label: "Petrol" },
  { value: "electric", label: "Electric" },
  { value: "hybrid", label: "Hybrid" },
];

const OWNERSHIP_TYPES = [
  { value: "all", label: "All Ownership" },
  { value: "owned", label: "Owned" },
  { value: "leased", label: "Leased" },
  { value: "rented", label: "Rented" },
];

const DRIVER_FILTER = [
  { value: "all", label: "All Vehicles" },
  { value: "assigned", label: "With Driver" },
  { value: "unassigned", label: "Without Driver" },
];

const Fleet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { drivers } = useDrivers();
  const { handleExport, handleExportAll, exporting } = useFleetExport();
  
  // Check if we're coming from "Manage" action with a specific vehicle
  const locationState = location.state as { selectedVehicleId?: string; openModal?: boolean } | null;
  const [focusedVehicleId, setFocusedVehicleId] = useState<string | null>(
    locationState?.selectedVehicleId || null
  );
  
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDriverDialogOpen, setAssignDriverDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [terminalSettingsOpen, setTerminalSettingsOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<any>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<any>(null);
  const [vehicleToAssign, setVehicleToAssign] = useState<any>(null);
  const [vehicleForCommand, setVehicleForCommand] = useState<any>(null);
  const [vehicleForDevice, setVehicleForDevice] = useState<any>(null);
  const [vehicleForTerminal, setVehicleForTerminal] = useState<any>(null);
  
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");
  const [fuelTypeFilter, setFuelTypeFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showMap, setShowMap] = useState(true);
  
  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Driver assignments map
  const [driverAssignments, setDriverAssignments] = useState<Record<string, string>>({});

  // Debounce search to avoid too many queries
  const debouncedSearch = useDebounce(searchInput, 300);

  // Use paginated hook for scalability - fixed 10 items per page with server-side filters
  const PAGE_SIZE = 10;
  const {
    vehicles: dbVehicles,
    loading,
    totalCount,
    currentPage,
    totalPages,
    hasMore,
    loadPage,
    loadMore,
  } = useVehiclesPaginated({
    pageSize: PAGE_SIZE,
    searchQuery: debouncedSearch,
    statusFilter,
    vehicleTypeFilter,
    fuelTypeFilter,
    ownershipFilter,
    sortField,
    sortDirection,
    vehicleIdFilter: focusedVehicleId, // Filter to specific vehicle when coming from "Manage"
  });

  // Get vehicle IDs for telemetry and service date queries
  const vehicleIds = useMemo(() => dbVehicles.map(v => v.id), [dbVehicles]);

  // Fetch real-time telemetry data
  const { telemetryMap } = useVehicleTelemetryBatch(vehicleIds);

  // Fetch next service dates
  const { nextServiceMap } = useNextServiceDate(vehicleIds);

  // Fleet-wide stats (not just current page)
  const { stats: fleetStats, loading: statsLoading, error: statsError } = useFleetStats({
    statusFilter,
    vehicleTypeFilter,
    fuelTypeFilter,
    ownershipFilter,
    searchQuery: debouncedSearch,
  });

  // Driver assignments - now uses assigned_driver from vehicle join
  // This effect is kept for fallback via trip history when assigned_driver_id is not set
  useEffect(() => {
    const fetchDriverAssignments = async () => {
      if (dbVehicles.length === 0) return;
      
      // Only fetch for vehicles without assigned_driver from the join
      const vehiclesNeedingDrivers = dbVehicles.filter(v => !v.assigned_driver);
      if (vehiclesNeedingDrivers.length === 0) return;
      
      const idsNeeding = vehiclesNeedingDrivers.map(v => v.id);
      
      // Get latest trip assignments with drivers - limit to most recent per vehicle
      const { data } = await supabase
        .from("trips")
        .select("vehicle_id, driver_id")
        .in("vehicle_id", idsNeeding)
        .not("driver_id", "is", null)
        .order("start_time", { ascending: false })
        .limit(idsNeeding.length * 3); // Reasonable limit

      if (data) {
        const assignments: Record<string, string> = {};
        data.forEach(trip => {
          if (trip.driver_id && !assignments[trip.vehicle_id]) {
            const driver = drivers.find(d => d.id === trip.driver_id);
            if (driver) {
              assignments[trip.vehicle_id] = `${driver.first_name} ${driver.last_name}`;
            }
          }
        });
        setDriverAssignments(assignments);
      }
    };

    fetchDriverAssignments();
  }, [dbVehicles, drivers]);

  // Transform DB vehicles to display format with real telemetry
  const vehicles = useMemo(() => {
    let filtered = dbVehicles.map((v) => {
      const telemetry = telemetryMap[v.id];
      const nextService = nextServiceMap[v.id];
      
      // Check if telemetry is stale (older than 15 minutes)
      const isDataFresh = telemetry?.last_communication_at 
        ? (Date.now() - new Date(telemetry.last_communication_at).getTime()) < 15 * 60 * 1000
        : false;
      
      // Determine status from telemetry - must have fresh data
      let status: "moving" | "idle" | "offline" = "offline";
      if (telemetry && isDataFresh && telemetry.device_connected) {
        // Use speed-based logic: speed > 3 km/h = moving
        const speed = telemetry.speed_kmh || 0;
        if (speed > 3) {
          status = "moving";
        } else if (telemetry.engine_on || telemetry.ignition_on) {
          status = "idle";
        } else {
          status = "offline"; // Engine off, not moving = stopped/offline
        }
      }

      // Get driver name from join or fallback to trip-based assignment
      const driverFromJoin = v.assigned_driver 
        ? `${v.assigned_driver.first_name} ${v.assigned_driver.last_name}`
        : null;
      const driverName = driverFromJoin || driverAssignments[v.id] || "";
      const driverId = v.assigned_driver?.id || null;
      
      return {
        id: v.plate_number,
        plate: v.plate_number,
        make: v.make || "Unknown",
        model: v.model || "",
        year: v.year || new Date().getFullYear(),
        status,
        fuel: telemetry?.fuel_level_percent ?? null,
        odometer: v.odometer_km || 0,
        nextService: nextService || null,
        vehicleId: v.id,
        vehicleType: v.vehicle_type || "",
        fuelType: v.fuel_type || "",
        ownershipType: v.ownership_type || "",
        assignedDriver: driverName,
        driverId,
        vin: v.vin || "",
        // Additional telemetry data
        speed: telemetry?.speed_kmh || 0,
        latitude: telemetry?.latitude || null,
        longitude: telemetry?.longitude || null,
        lastSeen: telemetry?.last_communication_at || null,
        deviceConnected: telemetry?.device_connected || false,
      };
    });

    // Apply driver filter client-side (since it depends on trip data)
    if (driverFilter === "assigned") {
      filtered = filtered.filter((v) => v.assignedDriver);
    } else if (driverFilter === "unassigned") {
      filtered = filtered.filter((v) => !v.assignedDriver);
    }

    return filtered;
  }, [dbVehicles, driverFilter, driverAssignments, telemetryMap, nextServiceMap]);

  const handleVehicleClick = useCallback((vehicle: any) => {
    setSelectedVehicle(vehicle);
  }, []);

  const handleEditVehicle = useCallback((vehicle: any) => {
    setVehicleToEdit(vehicle);
    setEditDialogOpen(true);
  }, []);

  const handleDeleteVehicle = useCallback((vehicle: any) => {
    setVehicleToDelete(vehicle);
    setDeleteDialogOpen(true);
  }, []);

  const handleAssignDriver = useCallback((vehicle: any) => {
    setVehicleToAssign(vehicle);
    setAssignDriverDialogOpen(true);
  }, []);

  const handleFuelHistory = useCallback((vehicle: any) => {
    navigate('/fuel-monitoring', { state: { vehicleId: vehicle.vehicleId } });
  }, [navigate]);

  const handleTripHistory = useCallback((vehicle: any) => {
    navigate('/route-history', { state: { vehicleId: vehicle.vehicleId } });
  }, [navigate]);

  const handleSendCommand = useCallback((vehicle: any) => {
    setVehicleForCommand(vehicle);
    setCommandDialogOpen(true);
  }, []);

  const handleAssignDevice = useCallback((vehicle: any) => {
    setVehicleForDevice(vehicle);
    setDeviceDialogOpen(true);
  }, []);

  const handleTerminalSettings = useCallback((vehicle: any) => {
    setVehicleForTerminal({
      vehicleId: vehicle.id,
      plate: vehicle.plate_number,
      make: vehicle.make,
      model: vehicle.model,
      phoneNumber: vehicle.phoneNumber || null,
    });
    setTerminalSettingsOpen(true);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    loadPage(page);
    setSelectedIds([]); // Clear selection on page change
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [loadPage]);

  const clearFilters = () => {
    setSearchInput("");
    setStatusFilter("all");
    setVehicleTypeFilter("all");
    setFuelTypeFilter("all");
    setOwnershipFilter("all");
    setDriverFilter("all");
  };

  const activeFilterCount = [
    statusFilter !== "all",
    vehicleTypeFilter !== "all",
    fuelTypeFilter !== "all",
    ownershipFilter !== "all",
    driverFilter !== "all",
  ].filter(Boolean).length;

  const handleExportSelected = () => {
    const selectedVehicles = vehicles.filter(v => selectedIds.includes(v.vehicleId));
    handleExport(selectedVehicles, true);
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds([]);
  }, [statusFilter, vehicleTypeFilter, fuelTypeFilter, ownershipFilter, driverFilter, debouncedSearch]);

  // Auto-open modal when coming from "Manage" action and vehicle is loaded
  useEffect(() => {
    if (locationState?.openModal && focusedVehicleId && vehicles.length > 0 && !selectedVehicle) {
      const targetVehicle = vehicles.find(v => v.vehicleId === focusedVehicleId);
      if (targetVehicle) {
        setSelectedVehicle(targetVehicle);
        // Clear the location state to prevent re-opening on navigation
        navigate(location.pathname, { replace: true, state: null });
      }
    }
  }, [locationState?.openModal, focusedVehicleId, vehicles, selectedVehicle, navigate, location.pathname]);

  // Handler to clear focused vehicle and show all
  const handleShowAllVehicles = useCallback(() => {
    setFocusedVehicleId(null);
    navigate(location.pathname, { replace: true, state: null });
  }, [navigate, location.pathname]);

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        {/* Focused Vehicle Banner */}
        {focusedVehicleId && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-primary font-medium">
              Viewing selected vehicle. Click on it to see details.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShowAllVehicles}
              className="gap-2"
            >
              <List className="w-4 h-4" />
              Show All Vehicles
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              Fleet Management
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {focusedVehicleId 
                ? "1 vehicle selected" 
                : `${totalCount.toLocaleString()} vehicles in your fleet`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportAll} disabled={exporting}>
              <Download className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export All'}</span>
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Vehicle
            </Button>
          </div>
        </div>

        {/* Fleet Status Badges - Like Reference Image */}
        <Card className="border-border/50">
          <CardContent className="py-4">
            <FleetStatusBadges
              total={fleetStats.total}
              running={fleetStats.moving}
              stopped={fleetStats.offline}
              overspeed={0}
              idle={fleetStats.idle}
              unreachable={fleetStats.offline}
              newVehicles={0}
            />
          </CardContent>
        </Card>

        {/* Trip Status Filters */}
        <Card className="border-border/50">
          <CardContent className="py-4">
            <TripStatusFilters
              onTrip={0}
              inTransit={0}
              notOnTrip={fleetStats.total}
              atLoading={0}
              atUnloading={0}
              notRecognized={0}
              deviated={0}
            />
          </CardContent>
        </Card>

        {/* Bulk Actions Toolbar */}
        {selectedIds.length > 0 && (
          <BulkActionsToolbar
            selectedIds={selectedIds}
            onClearSelection={() => setSelectedIds([])}
            onExport={handleExportSelected}
            totalCount={fleetStats.total}
          />
        )}

        {/* Search, Filters & View Toggle */}
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col gap-3">
              {/* Main Row: Search, Quick Filters, View Toggle */}
              <div className="flex gap-3 flex-wrap items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="fleet-search"
                    aria-label="Search vehicles by plate, make, or model"
                    placeholder="Search plates, make, model..."
                    className="pl-9 h-9 bg-muted/30"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  {searchInput && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchInput("")}
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                {/* Advanced Filters Popover */}
                <Popover open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 h-9 relative"
                      aria-label="Advanced filters"
                      aria-expanded={showAdvancedFilters}
                      aria-haspopup="dialog"
                    >
                      <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Filters</span>
                      {activeFilterCount > 0 && (
                        <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Advanced Filters</h4>
                        {activeFilterCount > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-xs"
                            onClick={clearFilters}
                          >
                            Clear All
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Vehicle Type
                          </label>
                          <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {VEHICLE_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Fuel Type
                          </label>
                          <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select fuel type" />
                            </SelectTrigger>
                            <SelectContent>
                              {FUEL_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Ownership
                          </label>
                          <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select ownership" />
                            </SelectTrigger>
                            <SelectContent>
                              {OWNERSHIP_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Driver Assignment
                          </label>
                          <Select value={driverFilter} onValueChange={setDriverFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select filter" />
                            </SelectTrigger>
                            <SelectContent>
                              {DRIVER_FILTER.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* View Toggle */}
                <div className="flex items-center gap-2 ml-auto">
                  <ToggleGroup 
                    type="single" 
                    value={viewMode} 
                    onValueChange={(v) => v && setViewMode(v as "grid" | "table")}
                    className="border rounded-lg h-9"
                  >
                    <ToggleGroupItem value="grid" aria-label="Grid view" className="px-3 h-8">
                      <LayoutGrid className="w-4 h-4" aria-hidden="true" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="table" aria-label="Table view" className="px-3 h-8">
                      <List className="w-4 h-4" aria-hidden="true" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>

              {/* Active Filters Display */}
              {(searchInput || activeFilterCount > 0) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {searchInput && (
                    <Badge variant="secondary" className="gap-1">
                      Search: "{searchInput}"
                      <button type="button" onClick={() => setSearchInput("")} aria-label="Remove search filter">
                        <X className="w-3 h-3 cursor-pointer" aria-hidden="true" />
                      </button>
                    </Badge>
                  )}
                  {statusFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Status: {statusFilter}
                      <button type="button" onClick={() => setStatusFilter("all")} aria-label="Remove status filter">
                        <X className="w-3 h-3 cursor-pointer" aria-hidden="true" />
                      </button>
                    </Badge>
                  )}
                  {vehicleTypeFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Type: {VEHICLE_TYPES.find(t => t.value === vehicleTypeFilter)?.label}
                      <button type="button" onClick={() => setVehicleTypeFilter("all")} aria-label="Remove vehicle type filter">
                        <X className="w-3 h-3 cursor-pointer" aria-hidden="true" />
                      </button>
                    </Badge>
                  )}
                  {fuelTypeFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Fuel: {FUEL_TYPES.find(t => t.value === fuelTypeFilter)?.label}
                      <button type="button" onClick={() => setFuelTypeFilter("all")} aria-label="Remove fuel type filter">
                        <X className="w-3 h-3 cursor-pointer" aria-hidden="true" />
                      </button>
                    </Badge>
                  )}
                  {ownershipFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Ownership: {OWNERSHIP_TYPES.find(t => t.value === ownershipFilter)?.label}
                      <button type="button" onClick={() => setOwnershipFilter("all")} aria-label="Remove ownership filter">
                        <X className="w-3 h-3 cursor-pointer" aria-hidden="true" />
                      </button>
                    </Badge>
                  )}
                  {driverFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Driver: {DRIVER_FILTER.find(t => t.value === driverFilter)?.label}
                      <button type="button" onClick={() => setDriverFilter("all")} aria-label="Remove driver filter">
                        <X className="w-3 h-3 cursor-pointer" aria-hidden="true" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Show skeletons during initial load, but keep showing data during pagination */}
        {loading && vehicles.length === 0 ? (
          <div className="space-y-6">
            <StatsRowSkeleton count={4} />
            <VehicleGridSkeleton count={10} />
          </div>
        ) : vehicles.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground" role="status" aria-live="polite">
              <Truck className="w-16 h-16 mx-auto mb-4 opacity-50" aria-hidden="true" />
              <h3 className="text-lg font-semibold mb-2">No vehicles found</h3>
              <p className="text-sm">Try adjusting your search criteria</p>
              {activeFilterCount > 0 && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <>
            {/* Split View: Table + Map */}
            <div className={`grid gap-4 ${showMap ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Left: Vehicle List */}
              <div className="space-y-4">
                {viewMode === "grid" ? (
                  <VehicleVirtualGrid
                    vehicles={vehicles}
                    onVehicleClick={handleVehicleClick}
                    onEditVehicle={handleEditVehicle}
                    onDeleteVehicle={handleDeleteVehicle}
                    onAssignDriver={handleAssignDriver}
                    onFuelHistory={handleFuelHistory}
                    onTripHistory={handleTripHistory}
                    onSendCommand={handleSendCommand}
                    onAssignDevice={handleAssignDevice}
                    onTerminalSettings={handleTerminalSettings}
                    hasMore={hasMore}
                    onLoadMore={loadMore}
                    loading={loading}
                    columns={showMap ? 1 : 3}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                  />
                ) : (
                  <VehicleTableView
                    vehicles={vehicles}
                    onVehicleClick={handleVehicleClick}
                    onEditVehicle={handleEditVehicle}
                    onDeleteVehicle={handleDeleteVehicle}
                    onAssignDriver={handleAssignDriver}
                    onFuelHistory={handleFuelHistory}
                    onTripHistory={handleTripHistory}
                    onSendCommand={handleSendCommand}
                    onAssignDevice={handleAssignDevice}
                    onTerminalSettings={handleTerminalSettings}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    sortField={sortField as any}
                    sortDirection={sortDirection}
                    onSortChange={(field, direction) => {
                      setSortField(field);
                      setSortDirection(direction);
                    }}
                  />
                )}
              </div>
              
              {/* Right: Mini Map */}
              {showMap && (
                <div className="hidden lg:block sticky top-4">
                  <FleetMiniMap
                    vehicles={vehicles.map(v => ({
                      id: v.vehicleId,
                      plate: v.plate,
                      lat: v.latitude || 0,
                      lng: v.longitude || 0,
                      status: v.status,
                    }))}
                    onVehicleClick={(vehicleId) => {
                      const vehicle = vehicles.find(v => v.vehicleId === vehicleId);
                      if (vehicle) handleVehicleClick(vehicle);
                    }}
                    className="h-[600px]"
                  />
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * PAGE_SIZE) + 1} to{" "}
                    {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} vehicles
                    {driverFilter !== "all" && vehicles.length < PAGE_SIZE && ` (${vehicles.length} after driver filter)`}
                  </p>
                  {loading && (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading vehicles" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    aria-label="Go to previous page"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                          className="w-8"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                    aria-label="Go to next page"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Dialogs */}
        <VehicleDetailModal
          vehicle={selectedVehicle}
          open={!!selectedVehicle}
          onOpenChange={(open) => !open && setSelectedVehicle(null)}
        />

        <CreateVehicleDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        <EditVehicleDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          vehicle={vehicleToEdit}
        />

        <DeleteVehicleDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          vehicle={vehicleToDelete}
          onSuccess={() => setSelectedIds(prev => prev.filter(id => id !== vehicleToDelete?.vehicleId))}
        />

        <AssignDriverDialog
          open={assignDriverDialogOpen}
          onOpenChange={setAssignDriverDialogOpen}
          vehicle={vehicleToAssign}
        />

        <BulkImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
        />

        <VehicleControlPanel
          open={commandDialogOpen}
          onOpenChange={setCommandDialogOpen}
          vehicle={vehicleForCommand}
        />

        <GPSDeviceDialog
          open={deviceDialogOpen}
          onOpenChange={setDeviceDialogOpen}
          vehicle={vehicleForDevice}
        />

        <TerminalSettingsPanel
          open={terminalSettingsOpen}
          onOpenChange={setTerminalSettingsOpen}
          vehicle={vehicleForTerminal}
        />
      </div>
    </Layout>
  );
};

export default Fleet;
