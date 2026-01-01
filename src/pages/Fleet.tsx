import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import VehicleDetailModal from "@/components/VehicleDetailModal";
import CreateVehicleDialog from "@/components/fleet/CreateVehicleDialog";
import { VehicleVirtualGrid } from "@/components/fleet/VehicleVirtualGrid";
import { VehicleGridSkeleton, StatsRowSkeleton } from "@/components/ui/skeletons";
import { Truck, Search, Plus, Filter, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { useVehiclesPaginated } from "@/hooks/useVehiclesPaginated";
import { useDebounce } from "@/hooks/useDebounce";

const Fleet = () => {
  const navigate = useNavigate();
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
    pageSize: 10,
    searchQuery: debouncedSearch,
    statusFilter,
  });

  // Transform DB vehicles to display format
  const vehicles = useMemo(() => {
    return dbVehicles.map((v) => ({
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
    }));
  }, [dbVehicles]);

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

  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in">
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
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate("/settings")}>
              <Settings className="w-4 h-4" />
              Settings
            </Button>
            <Button
              className="gap-2 bg-gradient-to-r from-primary to-primary/80"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add Vehicle
            </Button>
          </div>
        </div>

        {/* Fleet Overview Stats - show instantly with loading state */}
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

        {/* Search and Filters */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by plate, make, or model..."
                  className="pl-10 focus-visible:ring-primary"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
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
            </div>
          </Card>
        ) : (
          <>
            {/* Virtual Grid for Large Lists */}
            <VehicleVirtualGrid
              vehicles={vehicles}
              onVehicleClick={handleVehicleClick}
              hasMore={hasMore}
              onLoadMore={loadMore}
              loading={loading}
              columns={3}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
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
