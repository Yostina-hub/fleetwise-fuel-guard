import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatusBadge from "@/components/StatusBadge";
import { 
  Fuel, 
  MapPin, 
  Calendar, 
  Eye, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Wrench, 
  FileText,
  User,
  Power,
  Radio,
  Gauge,
  Clock,
  Wifi,
  WifiOff,
  UserPlus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface VehicleItem {
  id: string;
  vehicleId: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  status: 'moving' | 'idle' | 'offline';
  fuel: number | null;
  odometer: number;
  nextService: string | null;
  vehicleType?: string;
  fuelType?: string;
  assignedDriver?: string;
  speed?: number;
  latitude?: number | null;
  longitude?: number | null;
  lastSeen?: string | null;
  deviceConnected?: boolean;
}

interface VehicleVirtualGridProps {
  vehicles: VehicleItem[];
  onVehicleClick: (vehicle: VehicleItem) => void;
  onEditVehicle?: (vehicle: VehicleItem) => void;
  onDeleteVehicle?: (vehicle: VehicleItem) => void;
  onAssignDriver?: (vehicle: VehicleItem) => void;
  onFuelHistory?: (vehicle: VehicleItem) => void;
  onTripHistory?: (vehicle: VehicleItem) => void;
  onSendCommand?: (vehicle: VehicleItem) => void;
  onAssignDevice?: (vehicle: VehicleItem) => void;
  onTerminalSettings?: (vehicle: VehicleItem) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  loading: boolean;
  columns?: number;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export const VehicleVirtualGrid = ({
  vehicles,
  onVehicleClick,
  onEditVehicle,
  onDeleteVehicle,
  onAssignDriver,
  onFuelHistory,
  onTripHistory,
  onSendCommand,
  onAssignDevice,
  onTerminalSettings,
  hasMore,
  onLoadMore,
  loading,
  columns = 3,
  selectedIds = [],
  onSelectionChange
}: VehicleVirtualGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Calculate rows
  const rowCount = Math.ceil(vehicles.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount + (hasMore ? 1 : 0), // Add 1 for load more row
    getScrollElement: () => parentRef.current,
    estimateSize: () => 420, // Increased row height for more content
    overscan: 3,
  });

  const handleScroll = useCallback(() => {
    if (!parentRef.current || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage > 0.8) {
      onLoadMore();
    }
  }, [loading, hasMore, onLoadMore]);

  const handleSelectOne = (vehicleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    
    if (selectedIds.includes(vehicleId)) {
      onSelectionChange(selectedIds.filter(id => id !== vehicleId));
    } else {
      onSelectionChange([...selectedIds, vehicleId]);
    }
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return "Never";
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className="h-[calc(100vh-400px)] min-h-[500px] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const isLoaderRow = virtualRow.index === rowCount;
          const startIndex = virtualRow.index * columns;
          const rowVehicles = vehicles.slice(startIndex, startIndex + columns);

          if (isLoaderRow) {
            return (
              <div
                key="loader"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="flex justify-center py-8"
              >
                {loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading more vehicles...
                  </div>
                ) : hasMore ? (
                  <Button variant="outline" onClick={onLoadMore}>
                    Load More
                  </Button>
                ) : null}
              </div>
            );
          }

          return (
            <div
              key={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-1 pb-6"
            >
              {rowVehicles.map((vehicle) => {
                const isSelected = selectedIds.includes(vehicle.vehicleId);
                
                return (
                  <Card
                    key={vehicle.id}
                    className={`group hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer border-2 relative overflow-hidden ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                    }`}
                    onClick={() => onVehicleClick(vehicle)}
                  >
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Selection checkbox */}
                    {onSelectionChange && (
                      <div 
                        className="absolute top-3 left-3 z-10"
                        onClick={(e) => handleSelectOne(vehicle.vehicleId, e)}
                      >
                        <Checkbox 
                          checked={isSelected}
                          className="bg-background"
                        />
                      </div>
                    )}

                    {/* Device status indicator */}
                    <div className="absolute top-3 left-10 z-10">
                      {vehicle.deviceConnected ? (
                        <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm">
                          <Wifi className="w-3 h-3 text-success" />
                          <span className="text-xs">Online</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm">
                          <WifiOff className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs">Offline</span>
                        </Badge>
                      )}
                    </div>

                    {/* Actions menu */}
                    <div 
                      className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => onVehicleClick(vehicle)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate("/map", { state: { selectedVehicleId: vehicle.vehicleId } })}>
                            <MapPin className="w-4 h-4 mr-2" />
                            Track on Map
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onEditVehicle?.(vehicle)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Vehicle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAssignDriver?.(vehicle)}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Assign Driver
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAssignDevice?.(vehicle)}>
                            <Radio className="w-4 h-4 mr-2" />
                            GPS Device
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSendCommand?.(vehicle)}>
                            <Power className="w-4 h-4 mr-2" />
                            Send Command
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onTerminalSettings?.(vehicle)}>
                            <Settings2 className="w-4 h-4 mr-2" />
                            Terminal Settings
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate("/maintenance")}>
                            <Wrench className="w-4 h-4 mr-2" />
                            Maintenance
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onFuelHistory?.(vehicle)}>
                            <Fuel className="w-4 h-4 mr-2" />
                            Fuel History
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onTripHistory?.(vehicle)}>
                            <FileText className="w-4 h-4 mr-2" />
                            Trip History
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDeleteVehicle?.(vehicle)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Vehicle
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <CardHeader className="relative pt-12">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl flex items-center gap-2">
                            {vehicle.plate}
                            {vehicle.vehicleType && (
                              <Badge variant="outline" className="text-xs font-normal capitalize">
                                {vehicle.vehicleType.replace('_', ' ')}
                              </Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {vehicle.make} {vehicle.model} • {vehicle.year}
                          </p>
                        </div>
                        <StatusBadge status={vehicle.status} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 relative">
                      {/* Speed indicator (if moving) */}
                      {vehicle.status === "moving" && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                          <Gauge className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">{vehicle.speed} km/h</span>
                          {vehicle.latitude && vehicle.longitude && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              {vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Fuel Level */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Fuel className="w-4 h-4 text-primary" />
                            <span className="font-medium">Fuel Level</span>
                          </div>
                          <span className="text-sm font-semibold">
                            {vehicle.fuel != null ? `${vehicle.fuel}%` : "-"}
                          </span>
                        </div>
                        {vehicle.fuel != null ? (
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                vehicle.fuel > 60
                                  ? "bg-success"
                                  : vehicle.fuel > 30
                                  ? "bg-warning"
                                  : "bg-destructive"
                              }`}
                              style={{ width: `${vehicle.fuel}%` }}
                            />
                          </div>
                        ) : (
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="h-2 rounded-full bg-muted-foreground/30 w-full" />
                          </div>
                        )}
                      </div>

                      {/* Odometer */}
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Odometer:</span>
                        <span className="font-medium">
                          {vehicle.odometer.toLocaleString()} km
                        </span>
                      </div>

                      {/* Assigned Driver */}
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Driver:</span>
                        <span className="font-medium">
                          {vehicle.assignedDriver || "Unassigned"}
                        </span>
                      </div>

                      {/* Next Service */}
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Next Service:</span>
                        <span className="font-medium">{vehicle.nextService || "Not scheduled"}</span>
                      </div>

                      {/* Last Seen */}
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Last Update:</span>
                        <span className="font-medium">{formatLastSeen(vehicle.lastSeen)}</span>
                      </div>

                      {/* Actions */}
                      <div className="pt-4 flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            onVehicleClick(vehicle);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/map", {
                              state: { selectedVehicleId: vehicle.vehicleId },
                            });
                          }}
                        >
                          <MapPin className="w-4 h-4" />
                          Track
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
