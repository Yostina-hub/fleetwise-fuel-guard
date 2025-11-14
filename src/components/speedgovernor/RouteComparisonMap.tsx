import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  TrendingUp,
  Gauge
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RoutePoint {
  timestamp: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading?: number;
}

interface VehicleRoute {
  vehicleId: string;
  vehiclePlate: string;
  color: string;
  data: RoutePoint[];
  maxSpeed: number;
}

interface RouteComparisonMapProps {
  availableVehicles: Array<{ id: string; plate: string; maxSpeed: number }>;
}

const VEHICLE_COLORS = [
  { primary: '#3b82f6', violation: '#1e40af' }, // Blue
  { primary: '#10b981', violation: '#047857' }, // Green
  { primary: '#f59e0b', violation: '#d97706' }, // Amber
  { primary: '#8b5cf6', violation: '#6d28d9' }, // Purple
];

export const RouteComparisonMap = ({ availableVehicles }: RouteComparisonMapProps) => {
  const { organizationId } = useOrganization();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animationRef = useRef<number | null>(null);
  const vehicleMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch(
          "https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/get-mapbox-token"
        );
        const data = await response.json();
        setMapboxToken(data.token);
      } catch (error) {
        console.error("Error fetching Mapbox token:", error);
      }
    };
    fetchToken();
  }, []);

  // Fetch routes for selected vehicles
  const { data: vehicleRoutes, isLoading } = useQuery({
    queryKey: ["comparison-routes", selectedVehicleIds, selectedDate, startTime, endTime, organizationId],
    queryFn: async () => {
      if (selectedVehicleIds.length === 0) return [];

      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1]), 0);
      
      const endDateTime = new Date(selectedDate);
      endDateTime.setHours(parseInt(endTime.split(':')[0]), parseInt(endTime.split(':')[1]), 59);

      const routes: VehicleRoute[] = [];

      for (let i = 0; i < selectedVehicleIds.length; i++) {
        const vehicleId = selectedVehicleIds[i];
        const vehicle = availableVehicles.find(v => v.id === vehicleId);
        if (!vehicle) continue;

        const { data, error } = await supabase
          .from("vehicle_telemetry")
          .select("created_at, latitude, longitude, speed_kmh, heading")
          .eq("vehicle_id", vehicleId)
          .eq("organization_id", organizationId!)
          .gte("created_at", startDateTime.toISOString())
          .lte("created_at", endDateTime.toISOString())
          .order("created_at", { ascending: true });

        if (error) {
          console.error(`Error fetching route for ${vehicle.plate}:`, error);
          continue;
        }

        const routeData = (data || []).map((point: any) => ({
          timestamp: point.created_at,
          latitude: point.latitude,
          longitude: point.longitude,
          speed_kmh: point.speed_kmh || 0,
          heading: point.heading
        })).filter((point: RoutePoint) => 
          point.latitude && point.longitude
        );

        routes.push({
          vehicleId: vehicle.id,
          vehiclePlate: vehicle.plate,
          color: VEHICLE_COLORS[i % VEHICLE_COLORS.length].primary,
          data: routeData,
          maxSpeed: vehicle.maxSpeed
        });
      }

      return routes;
    },
    enabled: !!organizationId && selectedVehicleIds.length > 0,
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [38.7578, 9.03],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      vehicleMarkers.current.forEach(marker => marker.remove());
      vehicleMarkers.current.clear();
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Draw routes on map
  useEffect(() => {
    if (!map.current || !vehicleRoutes || vehicleRoutes.length === 0) return;

    if (!map.current.isStyleLoaded()) {
      const checkLoaded = () => {
        if (map.current?.isStyleLoaded()) {
          drawRoutes();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    drawRoutes();

    function drawRoutes() {
      if (!map.current || !vehicleRoutes) return;

      // Remove existing layers and sources
      vehicleRoutes.forEach((route) => {
        const normalLayerId = `route-normal-${route.vehicleId}`;
        const violationLayerId = `route-violation-${route.vehicleId}`;
        
        if (map.current!.getLayer(normalLayerId)) map.current!.removeLayer(normalLayerId);
        if (map.current!.getLayer(violationLayerId)) map.current!.removeLayer(violationLayerId);
        if (map.current!.getSource(normalLayerId)) map.current!.removeSource(normalLayerId);
        if (map.current!.getSource(violationLayerId)) map.current!.removeSource(violationLayerId);
      });

      const bounds = new mapboxgl.LngLatBounds();

      vehicleRoutes.forEach((route, index) => {
        if (route.data.length === 0) return;

        const colorScheme = VEHICLE_COLORS[index % VEHICLE_COLORS.length];
        const normalSegments: number[][] = [];
        const violationSegments: number[][] = [];

        for (let i = 0; i < route.data.length - 1; i++) {
          const current = route.data[i];
          const next = route.data[i + 1];
          
          const segment = [
            [current.longitude, current.latitude],
            [next.longitude, next.latitude]
          ];

          if (current.speed_kmh > route.maxSpeed) {
            violationSegments.push(...segment);
          } else {
            normalSegments.push(...segment);
          }

          bounds.extend([current.longitude, current.latitude]);
        }

        // Add normal route
        if (normalSegments.length > 0) {
          map.current!.addSource(`route-normal-${route.vehicleId}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: normalSegments
              }
            }
          });

          map.current!.addLayer({
            id: `route-normal-${route.vehicleId}`,
            type: 'line',
            source: `route-normal-${route.vehicleId}`,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': colorScheme.primary,
              'line-width': 4,
              'line-opacity': 0.7
            }
          });
        }

        // Add violation route
        if (violationSegments.length > 0) {
          map.current!.addSource(`route-violation-${route.vehicleId}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: violationSegments
              }
            }
          });

          map.current!.addLayer({
            id: `route-violation-${route.vehicleId}`,
            type: 'line',
            source: `route-violation-${route.vehicleId}`,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#ef4444',
              'line-width': 5,
              'line-opacity': 0.8
            }
          });
        }
      });

      if (!bounds.isEmpty()) {
        map.current!.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }

      setCurrentIndex(0);
      setIsPlaying(false);
    }
  }, [vehicleRoutes]);

  // Playback animation
  useEffect(() => {
    if (!isPlaying || !vehicleRoutes || vehicleRoutes.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const maxLength = Math.max(...vehicleRoutes.map(r => r.data.length));

    let lastTimestamp = Date.now();
    const animate = () => {
      const now = Date.now();
      const deltaTime = now - lastTimestamp;
      lastTimestamp = now;

      const increment = (deltaTime / 100) * playbackSpeed;
      
      setCurrentIndex(prev => {
        const next = prev + increment;
        if (next >= maxLength - 1) {
          setIsPlaying(false);
          return maxLength - 1;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, vehicleRoutes]);

  // Update vehicle markers
  useEffect(() => {
    if (!map.current || !vehicleRoutes || vehicleRoutes.length === 0) return;

    const index = Math.floor(currentIndex);

    vehicleRoutes.forEach((route, routeIndex) => {
      if (index < 0 || index >= route.data.length) return;

      const point = route.data[index];
      const isOverSpeed = point.speed_kmh > route.maxSpeed;
      const colorScheme = VEHICLE_COLORS[routeIndex % VEHICLE_COLORS.length];

      const markerId = route.vehicleId;
      let marker = vehicleMarkers.current.get(markerId);

      if (!marker) {
        const el = document.createElement("div");
        el.className = "vehicle-marker";
        el.style.cssText = `
          width: 32px;
          height: 32px;
          background-color: ${isOverSpeed ? '#ef4444' : colorScheme.primary};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          transform: rotate(${point.heading || 0}deg);
          font-size: 16px;
          color: white;
          font-weight: bold;
        `;
        el.innerHTML = "▲";
        el.title = route.vehiclePlate;

        marker = new mapboxgl.Marker(el)
          .setLngLat([point.longitude, point.latitude])
          .addTo(map.current!);
        
        vehicleMarkers.current.set(markerId, marker);
      } else {
        marker.setLngLat([point.longitude, point.latitude]);
        const el = marker.getElement();
        el.style.backgroundColor = isOverSpeed ? '#ef4444' : colorScheme.primary;
        el.style.transform = `rotate(${point.heading || 0}deg)`;
      }
    });
  }, [currentIndex, vehicleRoutes]);

  const handleVehicleToggle = (vehicleId: string, checked: boolean) => {
    if (checked) {
      if (selectedVehicleIds.length >= 4) {
        toast.error("Maximum 4 vehicles can be compared at once");
        return;
      }
      setSelectedVehicleIds([...selectedVehicleIds, vehicleId]);
    } else {
      setSelectedVehicleIds(selectedVehicleIds.filter(id => id !== vehicleId));
      const marker = vehicleMarkers.current.get(vehicleId);
      if (marker) {
        marker.remove();
        vehicleMarkers.current.delete(vehicleId);
      }
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const maxRouteLength = vehicleRoutes ? Math.max(...vehicleRoutes.map(r => r.data.length), 0) : 0;

  return (
    <div className="space-y-4">
      {/* Vehicle Selection & Date Range */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Select Vehicles & Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Vehicle Selection */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Select Vehicles (Maximum 4)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableVehicles.map((vehicle, index) => (
                  <div key={vehicle.id} className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <Checkbox
                      id={vehicle.id}
                      checked={selectedVehicleIds.includes(vehicle.id)}
                      onCheckedChange={(checked) => handleVehicleToggle(vehicle.id, checked as boolean)}
                      disabled={!selectedVehicleIds.includes(vehicle.id) && selectedVehicleIds.length >= 4}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: VEHICLE_COLORS[selectedVehicleIds.indexOf(vehicle.id) % VEHICLE_COLORS.length]?.primary || '#gray' }}
                      />
                      <label
                        htmlFor={vehicle.id}
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        {vehicle.plate}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date & Time Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return <SelectItem key={hour} value={`${hour}:00`}>{hour}:00</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">to</span>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return <SelectItem key={hour} value={`${hour}:59`}>{hour}:59</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Container */}
      {selectedVehicleIds.length > 0 && (
        <>
          <Card className="overflow-hidden">
            <div ref={mapContainer} className="w-full h-[500px]" />
          </Card>

          {/* Playback Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Synchronized Playback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Timeline Slider */}
                <div className="space-y-2">
                  <Slider
                    value={[currentIndex]}
                    max={maxRouteLength - 1}
                    step={1}
                    onValueChange={(value) => setCurrentIndex(value[0])}
                    className="w-full"
                    disabled={!vehicleRoutes || vehicleRoutes.length === 0 || maxRouteLength === 0}
                  />
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleReset}
                      disabled={!vehicleRoutes || vehicleRoutes.length === 0}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      onClick={handlePlayPause}
                      disabled={!vehicleRoutes || vehicleRoutes.length === 0}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Select
                      value={playbackSpeed.toString()}
                      onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}
                    >
                      <SelectTrigger className="w-24">
                        <FastForward className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                        <SelectItem value="5">5x</SelectItem>
                        <SelectItem value="10">10x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading route data...
                  </div>
                )}

                {!isLoading && (!vehicleRoutes || vehicleRoutes.length === 0) && selectedVehicleIds.length > 0 && (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      No route data available for selected vehicles
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Comparison Stats */}
          {vehicleRoutes && vehicleRoutes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Comparison Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {vehicleRoutes.map((route, index) => {
                    const violations = route.data.filter(p => p.speed_kmh > route.maxSpeed).length;
                    const distance = ((route.data.length * 0.1) / 1000).toFixed(1);
                    const avgSpeed = route.data.length > 0 
                      ? (route.data.reduce((sum, p) => sum + p.speed_kmh, 0) / route.data.length).toFixed(1)
                      : '0';
                    const maxSpeed = route.data.length > 0 
                      ? Math.max(...route.data.map(p => p.speed_kmh)).toFixed(0)
                      : '0';
                    const colorScheme = VEHICLE_COLORS[index % VEHICLE_COLORS.length];

                    return (
                      <div key={route.vehicleId} className="p-4 rounded-lg border bg-card space-y-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: colorScheme.primary }}
                          />
                          <h4 className="font-semibold">{route.vehiclePlate}</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Data Points:</span>
                            <span className="font-medium">{route.data.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Violations:</span>
                            <span className={cn("font-medium", violations > 0 && "text-destructive")}>
                              {violations}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Distance:</span>
                            <span className="font-medium">~{distance} km</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Speed:</span>
                            <span className="font-medium">{avgSpeed} km/h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Max Speed:</span>
                            <span className="font-medium">{maxSpeed} km/h</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedVehicleIds.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground space-y-2">
              <Gauge className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select vehicles to compare routes</p>
              <p className="text-sm">Choose 2-4 vehicles to analyze and compare their driving patterns</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
