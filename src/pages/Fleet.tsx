import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { VehicleVirtualGrid } from "@/components/fleet/VehicleVirtualGrid";
import { VehicleTableView } from "@/components/fleet/VehicleTableView";
import { VehicleGridSkeleton, StatsRowSkeleton } from "@/components/ui/skeletons";
import { 
  Truck, 
  Search, 
  Plus, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  LayoutGrid,
  List,
  X,
  SlidersHorizontal
} from "lucide-react";
import { useVehiclesPaginated } from "@/hooks/useVehiclesPaginated";
import { useDebounce } from "@/hooks/useDebounce";

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

const Fleet = () => {
  const navigate = useNavigate();
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");
  const [fuelTypeFilter, setFuelTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Debounce search to avoid too many queries
  const debouncedSearch = useDebounce(searchInput, 300);

  // Use paginated hook for scalability
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
    pageSize: viewMode === "table" ? 20 : 10,
    searchQuery: debouncedSearch,
    statusFilter,
  });

  // Transform DB vehicles to display format
  const vehicles = useMemo(() => {
    let filtered = dbVehicles.map((v) => ({
      id: v.plate_number,
      plate: v.plate_number,
      make: v.make || "Unknown",
      model: v.model || "",
      year: v.year || new Date().getFullYear(),
      status: (v.status === "active"
        ? "moving"
        : v.status === "maintenance"
        ? "idle"
        : "offline") as "moving" | "idle" | "offline",
      fuel: 50,
      odometer: v.odometer_km || 0,
      nextService: "2025-03-01",
      vehicleId: v.id,
      vehicleType: v.vehicle_type || "",
      fuelType: v.fuel_type || "",
    }));

    // Apply client-side filters for vehicle type and fuel type
    if (vehicleTypeFilter !== "all") {
      filtered = filtered.filter((v) => v.vehicleType === vehicleTypeFilter);
    }
    if (fuelTypeFilter !== "all") {
      filtered = filtered.filter((v) => v.fuelType === fuelTypeFilter);
    }

    return filtered;
  }, [dbVehicles, vehicleTypeFilter, fuelTypeFilter]);

  // Calculate stats from current page (for large fleets, these would be server-side)
  const stats = useMemo(() => {
    const moving = vehicles.filter((v) => v.status === "moving").length;
    const idle = vehicles.filter((v) => v.status === "idle").length;
    const offline = vehicles.filter((v) => v.status === "offline").length;
    return { moving, idle, offline };
  }, [vehicles]);

  const handleVehicleClick = useCallback((vehicle: any) => {
    setSelectedVehicle(vehicle);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    loadPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [loadPage]);

  const clearFilters = () => {
    setSearchInput("");
    setStatusFilter("all");
    setVehicleTypeFilter("all");
    setFuelTypeFilter("all");
  };

  const activeFilterCount = [
    statusFilter !== "all",
    vehicleTypeFilter !== "all",
    fuelTypeFilter !== "all",
  ].filter(Boolean).length;

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Fleet Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage all vehicles and their status •{" "}
              <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span> vehicles total
            </p>
          </div>
          <Button
            className="gap-2 bg-gradient-to-r from-primary to-primary/80"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Vehicle
          </Button>
        </div>

        {/* Fleet Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {loading && vehicles.length === 0 ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-l-4 border-l-muted">
                  <CardContent className="pt-6">
                    <Skeleton className="h-4 w-24 mb-3" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              {[
                { label: "Total Vehicles", value: totalCount, color: "primary" },
                { label: "On Road", value: stats.moving, color: "success" },
                { label: "Idle", value: stats.idle, color: "warning" },
                { label: "Offline", value: stats.offline, color: "destructive" },
              ].map((stat, i) => (
                <Card
                  key={i}
                  className="hover:shadow-lg transition-shadow border-l-4"
                  style={{ borderLeftColor: `hsl(var(--${stat.color}))` }}
                >
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </div>
                    <div className="text-3xl font-bold mt-2">
                      {stat.value.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Search, Filters & View Toggle */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Main Row: Search, Quick Filters, View Toggle */}
              <div className="flex gap-4 flex-wrap items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-[250px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by plate, make, model, or VIN..."
                    className="pl-10 focus-visible:ring-primary"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  {searchInput && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchInput("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
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
                    <Button variant="outline" className="gap-2 relative">
                      <SlidersHorizontal className="w-4 h-4" />
                      Filters
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
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* View Toggle */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-muted-foreground hidden sm:inline">View:</span>
                  <ToggleGroup 
                    type="single" 
                    value={viewMode} 
                    onValueChange={(v) => v && setViewMode(v as "grid" | "table")}
                    className="border rounded-lg"
                  >
                    <ToggleGroupItem value="grid" aria-label="Grid view" className="px-3">
                      <LayoutGrid className="w-4 h-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="table" aria-label="Table view" className="px-3">
                      <List className="w-4 h-4" />
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
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchInput("")} />
                    </Badge>
                  )}
                  {statusFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Status: {statusFilter}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setStatusFilter("all")} />
                    </Badge>
                  )}
                  {vehicleTypeFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Type: {VEHICLE_TYPES.find(t => t.value === vehicleTypeFilter)?.label}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setVehicleTypeFilter("all")} />
                    </Badge>
                  )}
                  {fuelTypeFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Fuel: {FUEL_TYPES.find(t => t.value === fuelTypeFilter)?.label}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFuelTypeFilter("all")} />
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
            <div className="text-center text-muted-foreground">
              <Truck className="w-16 h-16 mx-auto mb-4 opacity-50" />
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
            {/* View Rendering */}
            {viewMode === "grid" ? (
              <VehicleVirtualGrid
                vehicles={vehicles}
                onVehicleClick={handleVehicleClick}
                hasMore={hasMore}
                onLoadMore={loadMore}
                loading={loading}
                columns={3}
              />
            ) : (
              <VehicleTableView
                vehicles={vehicles}
                onVehicleClick={handleVehicleClick}
              />
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * (viewMode === "table" ? 20 : 10)) + 1} to{" "}
                  {Math.min(currentPage * (viewMode === "table" ? 20 : 10), totalCount)} of {totalCount} vehicles
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                  >
                    <ChevronLeft className="w-4 h-4" />
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
                          className="w-9"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
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
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Vehicle Detail Modal */}
      <VehicleDetailModal
        open={!!selectedVehicle}
        onOpenChange={(open) => !open && setSelectedVehicle(null)}
        vehicle={selectedVehicle || {}}
      />

      {/* Create Vehicle Dialog */}
      <CreateVehicleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </Layout>
  );
};

export default Fleet;
