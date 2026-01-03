import { useState, useEffect, useRef, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RouteHistoryQuickStats from "@/components/routehistory/RouteHistoryQuickStats";
import RouteHistoryQuickActions from "@/components/routehistory/RouteHistoryQuickActions";
import RouteHistoryInsightsCard from "@/components/routehistory/RouteHistoryInsightsCard";
import RouteHistoryTrendChart from "@/components/routehistory/RouteHistoryTrendChart";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  SkipBack,
  Calendar,
  Clock,
  MapPin,
  Navigation,
  Fuel,
  Gauge,
  AlertCircle,
  Loader2
} from "lucide-react";
import LiveTrackingMap from "@/components/map/LiveTrackingMap";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format, parseISO, differenceInMinutes } from "date-fns";

interface TelemetryPoint {
  id: string;
  latitude: number | null;
  longitude: number | null;
  speed_kmh: number | null;
  fuel_level_percent: number | null;
  heading: number | null;
  last_communication_at: string;
  engine_on: boolean | null;
}

const RouteHistory = () => {
  const { organizationId } = useOrganization();
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch vehicles
  const { data: vehicles, isLoading: vehiclesLoading, isError: vehiclesError } = useQuery({
    queryKey: ["vehicles", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model")
        .eq("organization_id", organizationId!)
        .order("plate_number");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch telemetry for selected vehicle and date
  const { data: telemetryData, isLoading: telemetryLoading, isError: telemetryError } = useQuery({
    queryKey: ["route-history-telemetry", selectedVehicle, selectedDate],
    queryFn: async () => {
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;
      
      const { data, error } = await supabase
        .from("vehicle_telemetry")
        .select("id, latitude, longitude, speed_kmh, fuel_level_percent, heading, last_communication_at, engine_on")
        .eq("vehicle_id", selectedVehicle)
        .gte("last_communication_at", startOfDay)
        .lte("last_communication_at", endOfDay)
        .order("last_communication_at", { ascending: true });
      
      if (error) throw error;
      return (data || []).filter(p => p.latitude != null && p.longitude != null) as TelemetryPoint[];
    },
    enabled: !!selectedVehicle && !!selectedDate,
  });

  const routeHistory = telemetryData || [];
  const hasData = routeHistory.length > 0;

  // Calculate current position based on playback progress
  const currentIndex = Math.floor((playbackProgress / 100) * Math.max(0, routeHistory.length - 1));
  const currentPosition = hasData ? routeHistory[currentIndex] : null;

  // Calculate trip summary statistics
  const tripSummary = useMemo(() => {
    if (!hasData) return null;

    const firstPoint = routeHistory[0];
    const lastPoint = routeHistory[routeHistory.length - 1];
    const durationMinutes = differenceInMinutes(
      parseISO(lastPoint.last_communication_at),
      parseISO(firstPoint.last_communication_at)
    );

    const totalPoints = routeHistory.length;
    const movingPoints = routeHistory.filter(p => (p.speed_kmh || 0) > 2).length;
    const stoppedPoints = totalPoints - movingPoints;
    const avgSpeed = routeHistory.reduce((sum, p) => sum + (p.speed_kmh || 0), 0) / totalPoints;
    const maxSpeed = Math.max(...routeHistory.map(p => p.speed_kmh || 0));
    const fuelStart = firstPoint.fuel_level_percent || 0;
    const fuelEnd = lastPoint.fuel_level_percent || 0;
    const fuelConsumed = fuelStart - fuelEnd;

    // Approximate distance calculation (Haversine)
    let totalDistanceKm = 0;
    for (let i = 1; i < routeHistory.length; i++) {
      const prev = routeHistory[i - 1];
      const curr = routeHistory[i];
      const R = 6371;
      const prevLat = prev.latitude || 0;
      const prevLng = prev.longitude || 0;
      const currLat = curr.latitude || 0;
      const currLng = curr.longitude || 0;
      const dLat = (currLat - prevLat) * Math.PI / 180;
      const dLng = (currLng - prevLng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + 
                Math.cos(prevLat * Math.PI / 180) * Math.cos(currLat * Math.PI / 180) * 
                Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistanceKm += R * c;
    }

    return {
      durationMinutes,
      totalPoints,
      movingPoints,
      stoppedPoints,
      avgSpeed: avgSpeed.toFixed(1),
      maxSpeed,
      fuelConsumed: fuelConsumed.toFixed(1),
      totalDistanceKm: totalDistanceKm.toFixed(2),
      startTime: format(parseISO(firstPoint.last_communication_at), "HH:mm:ss"),
      endTime: format(parseISO(lastPoint.last_communication_at), "HH:mm:ss"),
    };
  }, [routeHistory, hasData]);

  // Cleanup interval on unmount or when stopping
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Handle playback
  useEffect(() => {
    if (isPlaying && hasData) {
      intervalRef.current = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return 100;
          }
          return prev + (playbackSpeed * 0.5);
        });
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, hasData]);

  const handlePlayPause = () => {
    if (!hasData) return;
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setPlaybackProgress(0);
    setIsPlaying(false);
  };

  const handleSkipForward = () => {
    setPlaybackProgress(Math.min(100, playbackProgress + 10));
  };

  const handleSkipBack = () => {
    setPlaybackProgress(Math.max(0, playbackProgress - 10));
  };

  const selectedVehicleData = vehicles?.find(v => v.id === selectedVehicle);

  return (
    <Layout>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Route History Playback
              </h1>
              <p className="text-muted-foreground mt-1">View and analyze historical vehicle routes</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-4">
            <RouteHistoryQuickActions
              hasData={hasData}
              vehiclePlate={selectedVehicleData?.plate_number}
              selectedDate={selectedDate}
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <Label htmlFor="vehicle-select" className="text-sm font-medium mb-2 block">
                Select Vehicle
              </Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger id="vehicle-select" aria-label="Select a vehicle">
                  {vehiclesLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Loading...</span>
                    </span>
                  ) : (
                    <SelectValue placeholder="Choose a vehicle" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {vehiclesError ? (
                    <div className="p-2 text-sm text-destructive">Failed to load vehicles</div>
                  ) : (
                    vehicles?.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-input" className="text-sm font-medium mb-2 block">
                Date
              </Label>
              <div className="relative">
                <Input
                  id="date-input"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  aria-label="Select date for route history"
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" aria-hidden="true" />
              </div>
            </div>

            <div>
              <Label htmlFor="speed-select" className="text-sm font-medium mb-2 block">
                Playback Speed
              </Label>
              <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(Number(v))}>
                <SelectTrigger id="speed-select" aria-label="Select playback speed">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="4">4x</SelectItem>
                  <SelectItem value="8">8x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Map and Controls */}
        <div className="flex-1 flex">
          {/* Map */}
          <div className="flex-1 relative">
            {telemetryLoading && selectedVehicle && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20" role="status" aria-live="polite">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
                  <span className="text-sm text-muted-foreground">Loading route data...</span>
                </div>
              </div>
            )}

            {telemetryError && (
              <div className="absolute top-4 left-4 right-4 z-20">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Failed to load route history. Please try again.</AlertDescription>
                </Alert>
              </div>
            )}

            <LiveTrackingMap
              vehicles={currentPosition ? [{
                id: "playback",
                plate: selectedVehicleData?.plate_number || "Vehicle",
                status: (currentPosition.speed_kmh || 0) > 2 ? "moving" : "stopped",
                fuel: currentPosition.fuel_level_percent || 0,
                speed: currentPosition.speed_kmh || 0,
                lat: currentPosition.latitude || 0,
                lng: currentPosition.longitude || 0,
                engine_on: currentPosition.engine_on || false,
                heading: currentPosition.heading || 0
              }] : []}
            />

            {/* Playback Controls */}
            <Card className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[600px] max-w-[calc(100%-3rem)] bg-card/95 backdrop-blur z-10">
              <CardContent className="pt-6">
                {/* Progress Bar */}
                <div className="mb-4">
                  <Slider
                    value={[playbackProgress]}
                    onValueChange={([value]) => setPlaybackProgress(value)}
                    max={100}
                    step={0.1}
                    className="w-full"
                    aria-label="Playback progress"
                    disabled={!hasData}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{currentPosition ? format(parseISO(currentPosition.last_communication_at), "HH:mm:ss") : "00:00:00"}</span>
                    <span>{playbackProgress.toFixed(0)}%</span>
                    <span>{tripSummary?.endTime || "23:59:59"}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleReset}
                    aria-label="Reset playback"
                    disabled={!hasData}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleSkipBack}
                    aria-label="Skip back 10%"
                    disabled={!hasData}
                  >
                    <SkipBack className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button 
                    size="icon" 
                    onClick={handlePlayPause}
                    aria-label={isPlaying ? "Pause playback" : "Play playback"}
                    disabled={!hasData}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleSkipForward}
                    aria-label="Skip forward 10%"
                    disabled={!hasData}
                  >
                    <SkipForward className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button variant="outline" size="sm" className="ml-4" disabled aria-label={`Current playback speed: ${playbackSpeed}x`}>
                    {playbackSpeed}x Speed
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Panel */}
          <div className="w-80 border-l border-border bg-card overflow-auto">
            <div className="p-6 space-y-6">
              {/* Trip Summary Quick Stats */}
              {tripSummary && (
                <RouteHistoryQuickStats
                  totalDistance={tripSummary.totalDistanceKm}
                  duration={tripSummary.durationMinutes}
                  avgSpeed={tripSummary.avgSpeed}
                  maxSpeed={tripSummary.maxSpeed}
                  fuelConsumed={tripSummary.fuelConsumed}
                  totalPoints={tripSummary.totalPoints}
                />
              )}
              
              <h3 className="font-semibold">Current Position Data</h3>
              
              {telemetryLoading && selectedVehicle ? (
                <div className="space-y-4" role="status" aria-live="polite">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <span className="sr-only">Loading position data...</span>
                </div>
              ) : currentPosition ? (
                <div className="space-y-4">
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Clock className="w-5 h-5 text-primary" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Time</div>
                          <div className="font-semibold">{format(parseISO(currentPosition.last_communication_at), "HH:mm:ss")}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <Gauge className="w-5 h-5 text-green-600" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Speed</div>
                          <div className="font-semibold">{currentPosition.speed_kmh || 0} km/h</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                          <Fuel className="w-5 h-5 text-orange-600" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Fuel Level</div>
                          <div className="font-semibold">{currentPosition.fuel_level_percent || 0}%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Navigation className="w-5 h-5 text-blue-600" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Heading</div>
                          <div className="font-semibold">{currentPosition.heading || 0}°</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                          <MapPin className="w-5 h-5 text-purple-600" aria-hidden="true" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1">GPS Coordinates</div>
                          <div className="text-xs font-mono break-all">
                            {(currentPosition.latitude || 0).toFixed(6)}, {(currentPosition.longitude || 0).toFixed(6)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Insights Card */}
                  {tripSummary && (
                    <RouteHistoryInsightsCard
                      routeData={routeHistory}
                      avgSpeed={parseFloat(tripSummary.avgSpeed)}
                      maxSpeed={tripSummary.maxSpeed}
                      fuelConsumed={parseFloat(tripSummary.fuelConsumed)}
                      durationMinutes={tripSummary.durationMinutes}
                    />
                  )}

                  {/* Trend Chart */}
                  {hasData && <RouteHistoryTrendChart routeData={routeHistory} />}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground" role="status">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                  <p className="text-sm">
                    {!selectedVehicle 
                      ? "Select a vehicle to view route history" 
                      : "No route data found for the selected date"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RouteHistory;
