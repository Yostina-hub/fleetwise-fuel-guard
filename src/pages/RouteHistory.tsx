import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Gauge
} from "lucide-react";
import LiveTrackingMap from "@/components/map/LiveTrackingMap";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

const RouteHistory = () => {
  const { organizationId } = useOrganization();
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const { data: vehicles } = useQuery({
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

  // Mock route history data - would be replaced with actual GPS data
  const routeHistory = [
    { lat: 9.03, lng: 38.74, speed: 45, fuel: 75, time: "08:00:00", heading: 45 },
    { lat: 9.04, lng: 38.75, speed: 52, fuel: 74, time: "08:15:00", heading: 60 },
    { lat: 9.05, lng: 38.76, speed: 48, fuel: 73, time: "08:30:00", heading: 75 },
    { lat: 9.06, lng: 38.77, speed: 0, fuel: 73, time: "08:45:00", heading: 75 },
    { lat: 9.06, lng: 38.77, speed: 0, fuel: 73, time: "09:00:00", heading: 75 },
    { lat: 9.07, lng: 38.78, speed: 55, fuel: 72, time: "09:15:00", heading: 90 },
    { lat: 9.08, lng: 38.79, speed: 60, fuel: 71, time: "09:30:00", heading: 95 },
  ];

  const currentPosition = routeHistory[Math.floor((playbackProgress / 100) * (routeHistory.length - 1))];

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      // Simulate playback
      const interval = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            clearInterval(interval);
            return 100;
          }
          return prev + (playbackSpeed * 0.5);
        });
      }, 100);
      return () => clearInterval(interval);
    }
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

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Vehicle</label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
                <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Playback Speed</label>
              <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(Number(v))}>
                <SelectTrigger>
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
            <LiveTrackingMap
              vehicles={currentPosition ? [{
                id: "playback",
                plate: selectedVehicle || "Vehicle",
                status: currentPosition.speed > 0 ? "moving" : "stopped",
                fuel: currentPosition.fuel,
                speed: currentPosition.speed,
                lat: currentPosition.lat,
                lng: currentPosition.lng,
                engine_on: currentPosition.speed > 0,
                heading: currentPosition.heading
              }] : []}
            />

            {/* Playback Controls */}
            <Card className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[600px] bg-card/95 backdrop-blur z-10">
              <CardContent className="pt-6">
                {/* Progress Bar */}
                <div className="mb-4">
                  <Slider
                    value={[playbackProgress]}
                    onValueChange={([value]) => setPlaybackProgress(value)}
                    max={100}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{currentPosition?.time || "00:00:00"}</span>
                    <span>{playbackProgress.toFixed(0)}%</span>
                    <span>23:59:59</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="icon" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleSkipBack}>
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button size="icon" onClick={handlePlayPause}>
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleSkipForward}>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="ml-4">
                    {playbackSpeed}x Speed
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Panel */}
          <div className="w-80 border-l border-border bg-card overflow-auto">
            <div className="p-6">
              <h3 className="font-semibold mb-4">Current Position Data</h3>
              
              {currentPosition ? (
                <div className="space-y-4">
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Time</div>
                          <div className="font-semibold">{currentPosition.time}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <Gauge className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Speed</div>
                          <div className="font-semibold">{currentPosition.speed} km/h</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                          <Fuel className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Fuel Level</div>
                          <div className="font-semibold">{currentPosition.fuel}%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Navigation className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Heading</div>
                          <div className="font-semibold">{currentPosition.heading}°</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                          <MapPin className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1">GPS Coordinates</div>
                          <div className="text-xs font-mono break-all">
                            {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a vehicle and date to view route history</p>
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
