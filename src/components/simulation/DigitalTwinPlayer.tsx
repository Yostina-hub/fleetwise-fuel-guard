import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, SkipBack, SkipForward, MapPin, Radio, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format, subHours, subDays } from "date-fns";

interface TelemetryFrame {
  vehicle_id: string;
  lat: number;
  lng: number;
  speed: number;
  fuel_level_percent: number | null;
  timestamp: string;
  plate_number?: string;
}

function generateDemoFrames(count: number): TelemetryFrame[][] {
  const vehicles = [
    { id: "demo-1", plate: "AA-12345" },
    { id: "demo-2", plate: "AA-67890" },
    { id: "demo-3", plate: "OR-11223" },
    { id: "demo-4", plate: "OR-44556" },
    { id: "demo-5", plate: "AM-77889" },
    { id: "demo-6", plate: "AM-99001" },
  ];
  const baseLat = 9.02;
  const baseLng = 38.75;
  const frames: TelemetryFrame[][] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const frameTime = new Date(now.getTime() - (count - i) * 60000);
    const frame: TelemetryFrame[] = vehicles.map((v, vi) => ({
      vehicle_id: v.id,
      plate_number: v.plate,
      lat: baseLat + Math.sin((i + vi * 10) * 0.05) * 0.03 + vi * 0.008,
      lng: baseLng + Math.cos((i + vi * 8) * 0.04) * 0.04 + vi * 0.006,
      speed: Math.max(0, 30 + Math.sin(i * 0.1 + vi) * 25 + (Math.random() - 0.5) * 10),
      fuel_level_percent: Math.max(10, 80 - i * 0.3 - vi * 5 + Math.random() * 5),
      timestamp: frameTime.toISOString(),
    }));
    frames.push(frame);
  }
  return frames;
}

const DigitalTwinPlayer = () => {
  const { organizationId } = useOrganization();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState("1");
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frames, setFrames] = useState<TelemetryFrame[][]>([]);
  const [timeRange, setTimeRange] = useState("latest");
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [vehiclePositions, setVehiclePositions] = useState<Map<string, TelemetryFrame>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadHistoricalData = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setIsDemo(false);
    try {
      let since: string;
      if (timeRange === "latest") {
        // Find the latest data window automatically
        const { data: latestRow } = await supabase
          .from("vehicle_telemetry")
          .select("last_communication_at")
          .eq("organization_id", organizationId)
          .not("latitude", "is", null)
          .not("last_communication_at", "is", null)
          .order("last_communication_at", { ascending: false })
          .limit(1)
          .single();

        if (!latestRow?.last_communication_at) {
          // No data at all — use demo
          setFrames(generateDemoFrames(60));
          setIsDemo(true);
          setCurrentFrame(0);
          return;
        }
        since = subHours(new Date(latestRow.last_communication_at), 1).toISOString();
      } else {
        const hours = timeRange === "1h" ? 1 : timeRange === "4h" ? 4 : timeRange === "8h" ? 8 : timeRange === "7d" ? 168 : 24;
        since = subHours(new Date(), hours).toISOString();
      }

      const { data } = await supabase
        .from("vehicle_telemetry")
        .select("vehicle_id, latitude, longitude, speed_kmh, fuel_level_percent, last_communication_at, vehicles!inner(plate_number)")
        .eq("organization_id", organizationId)
        .not("latitude", "is", null)
        .not("last_communication_at", "is", null)
        .gte("last_communication_at", since)
        .order("last_communication_at", { ascending: true })
        .limit(1000);

      if (!data || data.length === 0) {
        setFrames(generateDemoFrames(60));
        setIsDemo(true);
        setCurrentFrame(0);
        return;
      }

      // Group into time buckets (1-minute intervals)
      const buckets = new Map<string, TelemetryFrame[]>();
      for (const row of data) {
        const d = new Date(row.last_communication_at!);
        const key = format(d, "yyyy-MM-dd HH:mm");
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push({
          vehicle_id: row.vehicle_id,
          lat: row.latitude ?? 0,
          lng: row.longitude ?? 0,
          speed: row.speed_kmh ?? 0,
          fuel_level_percent: row.fuel_level_percent,
          timestamp: row.last_communication_at!,
          plate_number: (row.vehicles as any)?.plate_number,
        });
      }

      const frameArray = Array.from(buckets.values());
      setFrames(frameArray.length > 0 ? frameArray : generateDemoFrames(60));
      setIsDemo(frameArray.length === 0);
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" /> Digital Twin Replay
            {isDemo && <Badge variant="secondary" className="text-xs"><Zap className="h-3 w-3 mr-1" /> Demo Mode</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest Data</SelectItem>
                <SelectItem value="1h">Last 1h</SelectItem>
                <SelectItem value="4h">Last 4h</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7d</SelectItem>
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
                <p>{loading ? "Loading telemetry data..." : "Press play to start replay"}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
            <span>{frames[0]?.[0]?.timestamp ? format(new Date(frames[0][0].timestamp), "MMM dd HH:mm") : "--:--"}</span>
            <span className="font-medium text-foreground">
              {currentTime ? format(new Date(currentTime), "HH:mm:ss") : "--:--:--"}
            </span>
            <span>{frames[frames.length - 1]?.[0]?.timestamp ? format(new Date(frames[frames.length - 1][0].timestamp), "MMM dd HH:mm") : "--:--"}</span>
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
