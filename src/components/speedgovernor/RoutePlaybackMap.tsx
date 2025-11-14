import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  FileDown
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

interface RoutePoint {
  timestamp: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading?: number;
}

interface RoutePlaybackMapProps {
  vehicleId: string;
  vehiclePlate: string;
  maxSpeed: number;
}

export const RoutePlaybackMap = ({ vehicleId, vehiclePlate, maxSpeed }: RoutePlaybackMapProps) => {
  const { organizationId } = useOrganization();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animationRef = useRef<number | null>(null);
  const vehicleMarker = useRef<mapboxgl.Marker | null>(null);
  
  const [mapboxToken, setMapboxToken] = useState<string>("");
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

  // Fetch route history
  const { data: routeData, isLoading } = useQuery({
    queryKey: ["route-history", vehicleId, selectedDate, startTime, endTime, organizationId],
    queryFn: async () => {
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1]), 0);
      
      const endDateTime = new Date(selectedDate);
      endDateTime.setHours(parseInt(endTime.split(':')[0]), parseInt(endTime.split(':')[1]), 59);

      const { data, error } = await supabase
        .from("vehicle_telemetry")
        .select("created_at, latitude, longitude, speed_kmh, heading")
        .eq("vehicle_id", vehicleId)
        .eq("organization_id", organizationId!)
        .gte("created_at", startDateTime.toISOString())
        .lte("created_at", endDateTime.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []).map((point: any) => ({
        timestamp: point.created_at,
        latitude: point.latitude,
        longitude: point.longitude,
        speed_kmh: point.speed_kmh || 0,
        heading: point.heading
      })).filter((point: RoutePoint) => 
        point.latitude && point.longitude
      ) as RoutePoint[];
    },
    enabled: !!organizationId && !!vehicleId,
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
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Draw route on map
  useEffect(() => {
    if (!map.current || !routeData || routeData.length === 0) return;

    // Wait for map to be loaded
    if (!map.current.isStyleLoaded()) {
      const checkLoaded = () => {
        if (map.current?.isStyleLoaded()) {
          drawRoute();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    drawRoute();

    function drawRoute() {
      if (!map.current || !routeData) return;

      // Remove existing layers and sources
      if (map.current.getLayer('route-normal')) map.current.removeLayer('route-normal');
      if (map.current.getLayer('route-violation')) map.current.removeLayer('route-violation');
      if (map.current.getSource('route-normal')) map.current.removeSource('route-normal');
      if (map.current.getSource('route-violation')) map.current.removeSource('route-violation');

      // Separate route into normal and violation segments
      const normalSegments: number[][] = [];
      const violationSegments: number[][] = [];

      for (let i = 0; i < routeData.length - 1; i++) {
        const current = routeData[i];
        const next = routeData[i + 1];
        
        const segment = [
          [current.longitude, current.latitude],
          [next.longitude, next.latitude]
        ];

        if (current.speed_kmh > maxSpeed) {
          violationSegments.push(...segment);
        } else {
          normalSegments.push(...segment);
        }
      }

      // Add normal route
      if (normalSegments.length > 0) {
        map.current!.addSource('route-normal', {
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
          id: 'route-normal',
          type: 'line',
          source: 'route-normal',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#22c55e',
            'line-width': 4,
            'line-opacity': 0.8
          }
        });
      }

      // Add violation route
      if (violationSegments.length > 0) {
        map.current!.addSource('route-violation', {
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
          id: 'route-violation',
          type: 'line',
          source: 'route-violation',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ef4444',
            'line-width': 5,
            'line-opacity': 0.9
          }
        });
      }

      // Fit bounds to route
      if (routeData.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        routeData.forEach(point => {
          bounds.extend([point.longitude, point.latitude]);
        });
        map.current!.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }

      // Reset playback
      setCurrentIndex(0);
      setIsPlaying(false);
    }
  }, [routeData, maxSpeed]);

  // Playback animation
  useEffect(() => {
    if (!isPlaying || !routeData || routeData.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let lastTimestamp = Date.now();
    const animate = () => {
      const now = Date.now();
      const deltaTime = now - lastTimestamp;
      lastTimestamp = now;

      // Update position based on playback speed
      const increment = (deltaTime / 100) * playbackSpeed;
      
      setCurrentIndex(prev => {
        const next = prev + increment;
        if (next >= routeData.length - 1) {
          setIsPlaying(false);
          return routeData.length - 1;
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
  }, [isPlaying, playbackSpeed, routeData]);

  // Update vehicle marker position
  useEffect(() => {
    if (!map.current || !routeData || routeData.length === 0) return;

    const index = Math.floor(currentIndex);
    if (index < 0 || index >= routeData.length) return;

    const point = routeData[index];
    const isOverSpeed = point.speed_kmh > maxSpeed;

    // Create or update marker
    if (!vehicleMarker.current) {
      const el = document.createElement("div");
      el.className = "vehicle-marker";
      el.style.cssText = `
        width: 30px;
        height: 30px;
        background-color: ${isOverSpeed ? '#ef4444' : '#22c55e'};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        transform: rotate(${point.heading || 0}deg);
      `;
      el.innerHTML = "▲";

      vehicleMarker.current = new mapboxgl.Marker(el)
        .setLngLat([point.longitude, point.latitude])
        .addTo(map.current);
    } else {
      vehicleMarker.current.setLngLat([point.longitude, point.latitude]);
      const el = vehicleMarker.current.getElement();
      el.style.backgroundColor = isOverSpeed ? '#ef4444' : '#22c55e';
      el.style.transform = `rotate(${point.heading || 0}deg)`;
    }
  }, [currentIndex, routeData, maxSpeed]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const handleExportCSV = () => {
    if (!routeData || routeData.length === 0) {
      toast.error("No route data to export");
      return;
    }

    try {
      // CSV Headers
      const headers = [
        'Timestamp',
        'Date',
        'Time',
        'Latitude',
        'Longitude',
        'Speed (km/h)',
        'Speed Limit (km/h)',
        'Violation',
        'Speed Excess (km/h)',
        'Heading (degrees)'
      ];

      // Convert route data to CSV rows
      const rows = routeData.map(point => {
        const timestamp = new Date(point.timestamp);
        const isViolation = point.speed_kmh > maxSpeed;
        const speedExcess = isViolation ? (point.speed_kmh - maxSpeed).toFixed(1) : '0';

        return [
          point.timestamp,
          format(timestamp, 'yyyy-MM-dd'),
          format(timestamp, 'HH:mm:ss'),
          point.latitude.toFixed(6),
          point.longitude.toFixed(6),
          point.speed_kmh.toFixed(1),
          maxSpeed.toString(),
          isViolation ? 'Yes' : 'No',
          speedExcess,
          point.heading?.toFixed(1) || 'N/A'
        ];
      });

      // Create CSV content
      const csvContent = [
        // Metadata rows
        ['Route Playback Export'],
        ['Vehicle', vehiclePlate],
        ['Date', format(selectedDate, 'yyyy-MM-dd')],
        ['Time Range', `${startTime} - ${endTime}`],
        ['Export Date', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
        [''],
        ['Summary Statistics'],
        ['Total Data Points', routeData.length.toString()],
        ['Total Violations', violationCount.toString()],
        ['Approximate Distance (km)', totalDistance],
        ['Average Speed (km/h)', (routeData.reduce((sum, p) => sum + p.speed_kmh, 0) / routeData.length).toFixed(1)],
        ['Max Speed Recorded (km/h)', Math.max(...routeData.map(p => p.speed_kmh)).toFixed(1)],
        [''],
        ['Route Data'],
        headers,
        ...rows
      ].map(row => row.join(',')).join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `route-data-${vehiclePlate}-${format(selectedDate, 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast.success("CSV file downloaded successfully");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export CSV file");
    }
  };

  const currentPoint = routeData?.[Math.floor(currentIndex)];
  const violationCount = routeData?.filter(p => p.speed_kmh > maxSpeed).length || 0;
  const totalDistance = routeData?.length ? ((routeData.length * 0.1) / 1000).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      {/* Date and Time Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Select Date & Time Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card className="overflow-hidden">
        <div ref={mapContainer} className="w-full h-[500px]" />
      </Card>

      {/* Playback Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Playback Controls</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={!routeData || routeData.length === 0 || isLoading}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Timeline Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {currentPoint ? format(new Date(currentPoint.timestamp), "HH:mm:ss") : "--:--:--"}
                </span>
                <span>
                  {routeData && routeData.length > 0
                    ? format(new Date(routeData[routeData.length - 1].timestamp), "HH:mm:ss")
                    : "--:--:--"}
                </span>
              </div>
              <Slider
                value={[currentIndex]}
                max={routeData ? routeData.length - 1 : 100}
                step={1}
                onValueChange={(value) => setCurrentIndex(value[0])}
                className="w-full"
                disabled={!routeData || routeData.length === 0}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleReset}
                  disabled={!routeData || routeData.length === 0}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  onClick={handlePlayPause}
                  disabled={!routeData || routeData.length === 0}
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

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Normal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Violation</span>
                </div>
              </div>
            </div>

            {/* Current Stats */}
            {currentPoint && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Current Speed</p>
                  <p className={`text-2xl font-bold ${currentPoint.speed_kmh > maxSpeed ? 'text-destructive' : 'text-green-600'}`}>
                    {currentPoint.speed_kmh.toFixed(0)} km/h
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Speed Limit</p>
                  <p className="text-2xl font-bold">{maxSpeed} km/h</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Violations</p>
                  <p className="text-2xl font-bold text-destructive">{violationCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Distance</p>
                  <p className="text-2xl font-bold">~{totalDistance} km</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading route data...
              </div>
            )}

            {!isLoading && (!routeData || routeData.length === 0) && (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  No route data available for the selected date and time range
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
