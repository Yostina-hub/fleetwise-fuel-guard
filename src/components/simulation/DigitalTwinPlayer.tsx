import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, SkipBack, SkipForward, FastForward, MapPin, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format, subHours, addMinutes } from "date-fns";

interface TelemetryFrame {
  vehicle_id: string;
  lat: number;
  lng: number;
  speed: number;
  fuel_level_percent: number | null;
  timestamp: string;
  plate_number?: string;
}

const DigitalTwinPlayer = () => {
  const { organizationId } = useOrganization();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState("1");
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frames, setFrames] = useState<TelemetryFrame[][]>([]);
  const [timeRange, setTimeRange] = useState("1h");
  const [loading, setLoading] = useState(false);
  const [vehiclePositions, setVehiclePositions] = useState<Map<string, TelemetryFrame>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadHistoricalData = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const hours = timeRange === "1h" ? 1 : timeRange === "4h" ? 4 : timeRange === "8h" ? 8 : 24;
      const since = subHours(new Date(), hours).toISOString();

      const { data } = await supabase
        .from("vehicle_telemetry")
        .select("vehicle_id, latitude, longitude, speed_kmh, fuel_level_percent, last_communication_at, vehicles!inner(plate_number)")
        .eq("organization_id", organizationId)
        .not("last_communication_at", "is", null)
        .gte("last_communication_at", since)
        .order("last_communication_at", { ascending: true })
        .limit(1000);

      if (!data || data.length === 0) {
        setFrames([]);
        return;
      }

      // Group into time buckets (1-minute intervals)
      const buckets = new Map<string, TelemetryFrame[]>();
      for (const row of data) {
        const d = new Date(row.last_communication_at);
        const key = format(d, "yyyy-MM-dd HH:mm");
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push({
          vehicle_id: row.vehicle_id,
          lat: row.latitude ?? 0,
          lng: row.longitude ?? 0,
          speed: row.speed_kmh ?? 0,
          fuel_level_percent: row.fuel_level_percent,
          timestamp: row.last_communication_at,
          plate_number: (row.vehicles as any)?.plate_number,
        });
      }

      setFrames(Array.from(buckets.values()));
      setCurrentFrame(0);
    } finally {
      setLoading(false);
    }
  }, [organizationId, timeRange]);

  useEffect(() => {
    loadHistoricalData();
  }, [loadHistoricalData]);

  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      const speed = parseFloat(playbackSpeed);
      intervalRef.current = setInterval(() => {
        setCurrentFrame(prev => {
          if (prev >= frames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / speed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, playbackSpeed, frames.length]);

  // Update vehicle positions when frame changes
  useEffect(() => {
    if (frames[currentFrame]) {
      const positions = new Map(vehiclePositions);
      for (const f of frames[currentFrame]) {
        positions.set(f.vehicle_id, f);
      }
      setVehiclePositions(positions);
    }
  }, [currentFrame, frames]);

  const currentTime = frames[currentFrame]?.[0]?.timestamp;
  const progress = frames.length > 0 ? (currentFrame / (frames.length - 1)) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" /> Digital Twin Replay
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last 1h</SelectItem>
                <SelectItem value="4h">Last 4h</SelectItem>
                <SelectItem value="8h">Last 8h</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">{frames.length} frames</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vehicle position grid */}
        <div className="rounded-lg border bg-muted/30 p-4 min-h-[200px]">
          {vehiclePositions.size === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <div className="text-center">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>{loading ? "Loading telemetry data..." : "No telemetry data for this time range"}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from(vehiclePositions.entries()).slice(0, 12).map(([vid, pos]) => (
                <div key={vid} className="rounded-lg border bg-background p-2 text-center">
                  <p className="text-xs font-mono font-bold truncate">{pos.plate_number || vid.slice(0, 8)}</p>
                  <p className="text-lg font-bold text-primary">{pos.speed.toFixed(0)} km/h</p>
                  <p className="text-xs text-muted-foreground">{pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}</p>
                  {pos.fuel_level_percent != null && (
                    <Badge variant={pos.fuel_level_percent < 20 ? "destructive" : "secondary"} className="text-xs mt-1">
                      ⛽ {pos.fuel_level_percent.toFixed(0)}%
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline scrubber */}
        <div className="space-y-2">
          <Slider
            value={[currentFrame]}
            onValueChange={([v]) => { setCurrentFrame(v); setIsPlaying(false); }}
            min={0}
            max={Math.max(frames.length - 1, 1)}
            step={1}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{frames[0]?.[0]?.timestamp ? format(new Date(frames[0][0].timestamp), "HH:mm") : "--:--"}</span>
            <span className="font-medium text-foreground">
              {currentTime ? format(new Date(currentTime), "HH:mm:ss") : "--:--:--"}
            </span>
            <span>{frames[frames.length - 1]?.[0]?.timestamp ? format(new Date(frames[frames.length - 1][0].timestamp), "HH:mm") : "--:--"}</span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setCurrentFrame(0)} disabled={frames.length === 0}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setIsPlaying(!isPlaying)} disabled={frames.length === 0}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCurrentFrame(frames.length - 1)} disabled={frames.length === 0}>
            <SkipForward className="h-4 w-4" />
          </Button>
          <Select value={playbackSpeed} onValueChange={setPlaybackSpeed}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
              <SelectItem value="5">5x</SelectItem>
              <SelectItem value="10">10x</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary">{vehiclePositions.size} vehicles</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default DigitalTwinPlayer;
