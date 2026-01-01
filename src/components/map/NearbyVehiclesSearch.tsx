import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Navigation, Fuel, Search, X } from "lucide-react";

interface Vehicle {
  id: string;
  plate: string;
  status: string;
  lat: number;
  lng: number;
  speed: number;
  fuel: number;
}

interface NearbyVehiclesSearchProps {
  vehicles: Vehicle[];
  onVehicleSelect: (vehicle: Vehicle) => void;
  onClose: () => void;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function NearbyVehiclesSearch({ vehicles, onVehicleSelect, onClose }: NearbyVehiclesSearchProps) {
  const [centerLat, setCenterLat] = useState<string>("");
  const [centerLng, setCenterLng] = useState<string>("");
  const [radius, setRadius] = useState<string>("5");
  const [hasSearched, setHasSearched] = useState(false);

  const nearbyVehicles = useMemo(() => {
    if (!hasSearched || !centerLat || !centerLng) return [];
    
    const lat = parseFloat(centerLat);
    const lng = parseFloat(centerLng);
    const radiusKm = parseFloat(radius) || 5;

    if (isNaN(lat) || isNaN(lng)) return [];

    return vehicles
      .filter((v) => v.status !== "offline")
      .map((v) => ({
        ...v,
        distance: haversineDistance(lat, lng, v.lat, v.lng),
      }))
      .filter((v) => v.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }, [vehicles, centerLat, centerLng, radius, hasSearched]);

  const handleSearch = () => {
    setHasSearched(true);
  };

  const handleUseCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenterLat(position.coords.latitude.toFixed(6));
          setCenterLng(position.coords.longitude.toFixed(6));
        },
        () => {
          // Fallback to Addis Ababa center
          setCenterLat("9.03");
          setCenterLng("38.74");
        }
      );
    }
  };

  return (
    <Card className="w-80 bg-card/95 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Nearby Vehicles
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Latitude</Label>
              <Input
                type="number"
                step="0.000001"
                placeholder="9.03"
                value={centerLat}
                onChange={(e) => setCenterLat(e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Longitude</Label>
              <Input
                type="number"
                step="0.000001"
                placeholder="38.74"
                value={centerLng}
                onChange={(e) => setCenterLng(e.target.value)}
                className="h-8"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Radius (km)</Label>
            <Input
              type="number"
              placeholder="5"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleUseCurrentLocation} className="flex-1">
              <MapPin className="w-4 h-4 mr-1" />
              My Location
            </Button>
            <Button size="sm" onClick={handleSearch} className="flex-1">
              <Search className="w-4 h-4 mr-1" />
              Search
            </Button>
          </div>
        </div>

        {hasSearched && (
          <div>
            <div className="text-sm font-medium mb-2">
              Found {nearbyVehicles.length} vehicle{nearbyVehicles.length !== 1 ? "s" : ""}
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {nearbyVehicles.map((vehicle) => (
                  <Card
                    key={vehicle.id}
                    className="p-3 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => onVehicleSelect(vehicle)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{vehicle.plate}</div>
                        <div className="text-xs text-muted-foreground">
                          {vehicle.distance.toFixed(2)} km away
                        </div>
                      </div>
                      <Badge
                        variant={vehicle.status === "moving" ? "default" : "secondary"}
                      >
                        {vehicle.status}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-primary" />
                        {vehicle.speed} km/h
                      </div>
                      <div className="flex items-center gap-1">
                        <Fuel className="w-3 h-3 text-primary" />
                        {vehicle.fuel}%
                      </div>
                    </div>
                  </Card>
                ))}
                {nearbyVehicles.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No vehicles found within {radius} km
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
