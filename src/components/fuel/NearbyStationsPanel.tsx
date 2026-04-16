// Step 10: Show nearby approved fuel stations with live availability.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Fuel, Phone, Clock, Loader2, Navigation, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  fuelType?: "diesel" | "petrol";
  minLiters?: number;
  vehicleLat?: number | null;
  vehicleLng?: number | null;
  onSelectStation?: (stationId: string) => void;
}

export const NearbyStationsPanel = ({
  fuelType = "diesel",
  minLiters = 0,
  vehicleLat,
  vehicleLng,
  onSelectStation,
}: Props) => {
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(
    vehicleLat && vehicleLng ? { lat: vehicleLat, lng: vehicleLng } : null
  );
  const [geoError, setGeoError] = useState<string | null>(null);

  // Fall back to browser geolocation if vehicle position not provided
  useEffect(() => {
    if (origin || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setGeoError(err.message),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, [origin]);

  const { data: stations = [], isLoading } = useQuery({
    queryKey: ["nearby-fuel-stations", origin?.lat, origin?.lng, fuelType, minLiters],
    queryFn: async () => {
      if (!origin) return [];
      const { data, error } = await supabase.rpc("get_nearby_fuel_stations" as any, {
        p_lat: origin.lat,
        p_lng: origin.lng,
        p_max_km: 30,
        p_fuel_type: fuelType,
        p_min_liters: minLiters,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!origin,
    refetchInterval: 60000,
  });

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Nearby Fuel Stations ({stations.length})
          <Badge variant="outline" className="ml-auto text-[10px]">{fuelType}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {!origin ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <AlertCircle className="h-4 w-4" />
            {geoError ? "Location not available" : "Locating..."}
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : stations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            No approved stations found within 30 km.
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {stations.map((s: any) => {
              const stock = fuelType === "diesel" ? s.diesel_stock_liters : s.petrol_stock_liters;
              const price = fuelType === "diesel" ? s.diesel_price_per_liter : s.petrol_price_per_liter;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelectStation?.(s.id)}
                  className="w-full text-left p-2 rounded-md border bg-card hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{s.name}</span>
                        {s.brand && <span className="text-xs text-muted-foreground">{s.brand}</span>}
                        {!s.has_requested_fuel && (
                          <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/30">
                            out of stock
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Navigation className="h-3 w-3" />{s.distance_km} km
                        </span>
                        {price && (
                          <span className="flex items-center gap-1">
                            <Fuel className="h-3 w-3" />{Number(price).toFixed(2)} ETB/L
                          </span>
                        )}
                        {stock != null && (
                          <span>Stock: {Number(stock).toLocaleString()} L</span>
                        )}
                        {s.phone && (
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>
                        )}
                        {s.hours_of_operation && (
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.hours_of_operation}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
