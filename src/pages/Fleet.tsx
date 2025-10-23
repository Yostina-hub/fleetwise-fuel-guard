import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import VehicleDetailModal from "@/components/VehicleDetailModal";
import { Truck, Search, Plus, Fuel, MapPin, Calendar, Filter, Eye, Settings, Loader2 } from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";

const Fleet = () => {
  const { vehicles: dbVehicles, loading } = useVehicles();
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fuelTypeFilter, setFuelTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Transform DB vehicles to display format
  const vehicles = useMemo(() => {
    return dbVehicles.map(v => ({
      id: v.plate_number,
      plate: v.plate_number,
      make: v.make || "Unknown",
      model: v.model || "",
      year: v.year || new Date().getFullYear(),
      status: (v.status === 'active' ? 'moving' : v.status === 'maintenance' ? 'idle' : 'offline') as 'moving' | 'idle' | 'offline',
      fuel: v.current_fuel || 50,
      odometer: v.odometer_km || 0,
      nextService: "2025-03-01",
      vehicleId: v.id
    }));
  }, [dbVehicles]);

  // Filter and search
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const matchesSearch = searchQuery === "" ||
        vehicle.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
      const matchesFuelType = fuelTypeFilter === "all";
      
      return matchesSearch && matchesStatus && matchesFuelType;
    });
  }, [searchQuery, statusFilter, fuelTypeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVehicles.slice(start, start + itemsPerPage);
  }, [filteredVehicles, currentPage]);

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading fleet data...</p>
          </div>
        </div>
      </Layout>
    );
  }

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
              Manage all vehicles and their status • {vehicles.length} vehicles total
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
            <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80">
              <Plus className="w-4 h-4" />
              Add Vehicle
            </Button>
          </div>
        </div>

        {/* Fleet Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Vehicles", value: vehicles.length, color: "primary", moving: vehicles.filter(v => v.status === "moving").length },
            { label: "On Road", value: vehicles.filter(v => v.status === "moving").length, color: "success" },
            { label: "Idle", value: vehicles.filter(v => v.status === "idle").length, color: "warning" },
            { label: "Offline", value: vehicles.filter(v => v.status === "offline").length, color: "destructive" },
          ].map((stat, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow border-l-4" style={{ borderLeftColor: `hsl(var(--${stat.color}))` }}>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
                <div className="text-3xl font-bold mt-2">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filters */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by plate, ID, make, or model..." 
                  className="pl-10 focus-visible:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => (
            <Card 
              key={vehicle.id} 
              className="group hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer border-2 hover:border-primary/50 relative overflow-hidden"
              onClick={() => setSelectedVehicle(vehicle)}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      {vehicle.plate}
                      <Badge variant="outline" className="text-xs font-normal">
                        {vehicle.id}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {vehicle.make} {vehicle.model} • {vehicle.year}
                    </p>
                  </div>
                  <StatusBadge status={vehicle.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 relative">
                {/* Fuel Level */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Fuel className="w-4 h-4 text-primary" />
                      <span className="font-medium">Fuel Level</span>
                    </div>
                    <span className="text-sm font-semibold">{vehicle.fuel}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        vehicle.fuel > 60 ? 'bg-success' : 
                        vehicle.fuel > 30 ? 'bg-warning' : 
                        'bg-destructive'
                      }`}
                      style={{ width: `${vehicle.fuel}%` }}
                    />
                  </div>
                </div>

                {/* Odometer */}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Odometer:</span>
                  <span className="font-medium">{vehicle.odometer.toLocaleString()} km</span>
                </div>

                {/* Next Service */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Next Service:</span>
                  <span className="font-medium">{vehicle.nextService}</span>
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1 gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVehicle(vehicle);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MapPin className="w-4 h-4" />
                    Track
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredVehicles.length === 0 && (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Truck className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No vehicles found</h3>
              <p className="text-sm">Try adjusting your search criteria</p>
            </div>
          </Card>
        )}
      </div>

      {/* Vehicle Detail Modal */}
      <VehicleDetailModal
        open={!!selectedVehicle}
        onOpenChange={(open) => !open && setSelectedVehicle(null)}
        vehicle={selectedVehicle || {}}
      />
    </Layout>
  );
};

export default Fleet;
