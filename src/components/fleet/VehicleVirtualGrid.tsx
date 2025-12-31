import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import { Fuel, MapPin, Calendar, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VehicleItem {
  id: string;
  vehicleId: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  status: 'moving' | 'idle' | 'offline';
  fuel: number;
  odometer: number;
  nextService: string;
}

interface VehicleVirtualGridProps {
  vehicles: VehicleItem[];
  onVehicleClick: (vehicle: VehicleItem) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  loading: boolean;
  columns?: number;
}

export const VehicleVirtualGrid = ({
  vehicles,
  onVehicleClick,
  hasMore,
  onLoadMore,
  loading,
  columns = 3
}: VehicleVirtualGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Calculate rows
  const rowCount = Math.ceil(vehicles.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount + (hasMore ? 1 : 0), // Add 1 for load more row
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320, // Estimated row height
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
              {rowVehicles.map((vehicle) => (
                <Card
                  key={vehicle.id}
                  className="group hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer border-2 hover:border-primary/50 relative overflow-hidden"
                  onClick={() => onVehicleClick(vehicle)}
                >
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

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
                            vehicle.fuel > 60
                              ? "bg-success"
                              : vehicle.fuel > 30
                              ? "bg-warning"
                              : "bg-destructive"
                          }`}
                          style={{ width: `${vehicle.fuel}%` }}
                        />
                      </div>
                    </div>

                    {/* Odometer */}
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Odometer:</span>
                      <span className="font-medium">
                        {vehicle.odometer.toLocaleString()} km
                      </span>
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
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
