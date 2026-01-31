import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  RefreshCw,
  Car,
  Truck,
  Bus,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Wifi,
  WifiOff,
  Circle,
  Check,
} from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const MOBILE_ITEMS_PER_PAGE = 20;

// Status filter options matching the reference
const STATUS_FILTERS = [
  { key: "all", label: "All", color: "bg-muted", dotColor: "" },
  { key: "live", label: "Live", color: "bg-success/20 text-success", dotColor: "bg-success" },
  { key: "moving", label: "Moving", color: "bg-success/20 text-success", dotColor: "bg-success" },
  { key: "idle", label: "Idle", color: "bg-warning/20 text-warning", dotColor: "bg-warning" },
  { key: "stopped", label: "Stopped", color: "bg-primary/20 text-primary", dotColor: "bg-primary" },
  { key: "offline", label: "Offline", color: "bg-destructive/20 text-destructive", dotColor: "bg-destructive" },
];

// Get vehicle type icon
const getVehicleIcon = (make: string, status: string) => {
  const statusColors: Record<string, string> = {
    moving: "text-success",
    idle: "text-warning",
    offline: "text-destructive",
    stopped: "text-primary",
  };
  const color = statusColors[status] || "text-muted-foreground";
  
  const makeLower = make?.toLowerCase() || "";
  if (makeLower.includes("bus") || makeLower.includes("coaster")) {
    return <Bus className={cn("w-5 h-5", color)} />;
  }
  if (makeLower.includes("truck") || makeLower.includes("lorry")) {
    return <Truck className={cn("w-5 h-5", color)} />;
  }
  return <Car className={cn("w-5 h-5", color)} />;
};

// Status dot indicator
const StatusDot = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    moving: "bg-success",
    idle: "bg-warning",
    stopped: "bg-primary",
    offline: "bg-destructive",
  };
  
  return (
    <span className={cn(
      "w-2 h-2 rounded-full inline-block",
      colors[status] || "bg-muted-foreground"
    )} />
  );
};

interface MobileVehiclesListProps {
  onVehicleSelect?: (vehicleId: string) => void;
}

export function MobileVehiclesList({ onVehicleSelect }: MobileVehiclesListProps) {
  const navigate = useNavigate();
  const { vehicles: dbVehicles, loading, refetch } = useVehicles();
  const { telemetry, isVehicleOnline } = useVehicleTelemetry();
  
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const debouncedSearch = useDebounce(searchInput, 300);
  
  // Transform vehicles with telemetry
  const vehicles = useMemo(() => {
    return dbVehicles.map((v) => {
      const vehicleTelemetry = telemetry[v.id];
      const online = isVehicleOnline(v.id);
      
      let status: 'moving' | 'idle' | 'stopped' | 'offline' = 'offline';
      let speed = 0;
      
      if (vehicleTelemetry && online) {
        speed = vehicleTelemetry.speed_kmh || 0;
        
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
        status,
        speed,
        lastUpdate: vehicleTelemetry?.last_communication_at,
        deviceConnected: online,
        fuel: vehicleTelemetry?.fuel_level_percent ?? 0,
      };
    });
  }, [dbVehicles, telemetry, isVehicleOnline]);
  
  // Compute status counts for dropdown
  const statusCounts = useMemo(() => {
    return {
      all: vehicles.length,
      live: vehicles.filter(v => v.deviceConnected).length,
      moving: vehicles.filter(v => v.status === 'moving').length,
      idle: vehicles.filter(v => v.status === 'idle').length,
      stopped: vehicles.filter(v => v.status === 'stopped').length,
      offline: vehicles.filter(v => v.status === 'offline').length,
    };
  }, [vehicles]);
  
  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    let filtered = vehicles;
    
    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase().trim();
      filtered = filtered.filter(v =>
        v.plate.toLowerCase().includes(query) ||
        v.make.toLowerCase().includes(query) ||
        v.model.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (statusFilter !== "all") {
      switch (statusFilter) {
        case "live":
          filtered = filtered.filter(v => v.deviceConnected);
          break;
        case "moving":
          filtered = filtered.filter(v => v.status === 'moving');
          break;
        case "idle":
          filtered = filtered.filter(v => v.status === 'idle');
          break;
        case "stopped":
          filtered = filtered.filter(v => v.status === 'stopped');
          break;
        case "offline":
          filtered = filtered.filter(v => v.status === 'offline');
          break;
      }
    }
    
    return filtered;
  }, [vehicles, debouncedSearch, statusFilter]);
  
  // Pagination
  const totalPages = Math.ceil(filteredVehicles.length / MOBILE_ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * MOBILE_ITEMS_PER_PAGE;
  const endIndex = startIndex + MOBILE_ITEMS_PER_PAGE;
  const paginatedVehicles = filteredVehicles.slice(startIndex, endIndex);
  
  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter]);
  
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [refetch]);
  
  const handleVehicleClick = useCallback((vehicleId: string) => {
    if (onVehicleSelect) {
      onVehicleSelect(vehicleId);
    } else {
      navigate(`/map?vehicle=${vehicleId}`);
    }
  }, [navigate, onVehicleSelect]);
  
  const onlineCount = statusCounts.live;
  const movingCount = statusCounts.moving;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header Section */}
      <div className="p-4 border-b space-y-3">
        {/* Title and Status Counts */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Vehicles</h1>
            <p className="text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Circle className="w-2 h-2 fill-success text-success" />
                {onlineCount} online
              </span>
              <span className="mx-2">•</span>
              <span>{movingCount} moving</span>
            </p>
          </div>
          <Badge 
            variant="outline" 
            className="gap-1.5 px-3 py-1.5 border-success text-success bg-success/10"
          >
            <Circle className="w-2 h-2 fill-current" />
            Live
          </Badge>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search vehicles..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 bg-muted/30 border-border"
          />
        </div>
        
        {/* Filter Row */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          
          {/* Status Filter Dropdown */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 h-10 bg-background">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {statusFilter !== "all" && (
                    <span className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      STATUS_FILTERS.find(f => f.key === statusFilter)?.dotColor
                    )} />
                  )}
                  {STATUS_FILTERS.find(f => f.key === statusFilter)?.label} ({statusCounts[statusFilter as keyof typeof statusCounts] || 0})
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((filter) => (
                <SelectItem key={filter.key} value={filter.key}>
                  <div className="flex items-center gap-2 w-full">
                    {statusFilter === filter.key && (
                      <Check className="w-4 h-4 text-success" />
                    )}
                    {filter.dotColor && (
                      <span className={cn("w-2.5 h-2.5 rounded-full", filter.dotColor)} />
                    )}
                    <span>{filter.label}</span>
                    <span className="ml-auto text-muted-foreground">
                      ({statusCounts[filter.key as keyof typeof statusCounts] || 0})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="shrink-0"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>
      
      {/* Vehicle List */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {loading ? (
            Array.from({ length: MOBILE_ITEMS_PER_PAGE }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))
          ) : paginatedVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Car className="w-12 h-12 mb-2 opacity-50" />
              <p>No vehicles found</p>
              {searchInput && (
                <p className="text-sm">Try adjusting your search</p>
              )}
            </div>
          ) : (
            paginatedVehicles.map((vehicle) => (
              <button
                key={vehicle.id}
                onClick={() => handleVehicleClick(vehicle.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 active:bg-muted transition-colors touch-manipulation"
              >
                {/* Status Indicator */}
                <div className="relative">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    vehicle.status === 'moving' && "bg-success/10",
                    vehicle.status === 'idle' && "bg-warning/10",
                    vehicle.status === 'stopped' && "bg-primary/10",
                    vehicle.status === 'offline' && "bg-muted",
                  )}>
                    {getVehicleIcon(vehicle.make, vehicle.status)}
                  </div>
                  {/* Online indicator dot */}
                  <span className={cn(
                    "absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                    vehicle.deviceConnected ? "bg-success" : "bg-muted-foreground"
                  )} />
                </div>
                
                {/* Vehicle Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{vehicle.plate}</span>
                    {vehicle.status === 'moving' && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Navigation className="w-3 h-3" />
                        {vehicle.speed} km/h
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    {vehicle.deviceConnected ? (
                      <Wifi className="w-3 h-3" />
                    ) : (
                      <WifiOff className="w-3 h-3" />
                    )}
                    {vehicle.lastUpdate 
                      ? formatDistanceToNow(new Date(vehicle.lastUpdate), { addSuffix: true })
                      : "No data"
                    }
                  </p>
                </div>
                
                {/* Status Badge */}
                <Badge 
                  variant="outline"
                  className={cn(
                    "capitalize text-xs shrink-0",
                    vehicle.status === 'moving' && "border-success text-success bg-success/10",
                    vehicle.status === 'idle' && "border-warning text-warning bg-warning/10",
                    vehicle.status === 'stopped' && "border-primary text-primary bg-primary/10",
                    vehicle.status === 'offline' && "border-destructive text-destructive bg-destructive/10",
                  )}
                >
                  {vehicle.status}
                </Badge>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
      
      {/* Pagination Footer */}
      {filteredVehicles.length > MOBILE_ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
            <span className="hidden sm:inline"> • {filteredVehicles.length} vehicles</span>
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
