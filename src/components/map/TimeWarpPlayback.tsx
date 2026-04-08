import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, SkipBack, SkipForward, X, Clock, Rewind, FastForward } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { format, subHours, subMinutes } from 'date-fns';

interface HistoricalPosition {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading: number;
  engine_on: boolean;
  recorded_at: string;
}

interface TimeWarpPlaybackProps {
  visible: boolean;
  onClose: () => void;
  onPositionsUpdate: (positions: Map<string, { lat: number; lng: number; speed: number; heading: number; engine_on: boolean }>) => void;
  vehicleIds: string[];
}

const PLAYBACK_SPEEDS = [0.5, 1, 2, 5, 10];
const TIME_RANGES = [
  { label: 'Last 15 min', minutes: 15 },
  { label: 'Last 30 min', minutes: 30 },
  { label: 'Last 1 hour', minutes: 60 },
  { label: 'Last 2 hours', minutes: 120 },
  { label: 'Last 4 hours', minutes: 240 },
];

export const TimeWarpPlayback = ({ visible, onClose, onPositionsUpdate, vehicleIds }: TimeWarpPlaybackProps) => {
  const { organizationId } = useOrganization();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [timeRange, setTimeRange] = useState(60); // minutes
  const [loading, setLoading] = useState(false);
  const [dataPoints, setDataPoints] = useState<HistoricalPosition[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const startTimeRef = useRef<Date>(new Date());
  const endTimeRef = useRef<Date>(new Date());

  // Fetch historical data
  const fetchHistory = useCallback(async () => {
    if (!organizationId || vehicleIds.length === 0) return;
    
    setLoading(true);
    const endTime = new Date();
    const startTime = subMinutes(endTime, timeRange);
    startTimeRef.current = startTime;
    endTimeRef.current = endTime;

    try {
      // Use vehicle_telemetry table with time-based filtering
      // This gets the most recent positions within the time range
      const { data, error } = await supabase
        .from('vehicle_telemetry')
        .select('vehicle_id, latitude, longitude, speed_kmh, heading, engine_on, last_communication_at')
        .eq('organization_id', organizationId)
        .in('vehicle_id', vehicleIds.slice(0, 50))
        .gte('last_communication_at', startTime.toISOString())
        .lte('last_communication_at', endTime.toISOString())
        .order('last_communication_at', { ascending: true })
        .limit(5000);

      if (error) {
        console.error('TimeWarp fetch error:', error);
        setDataPoints([]);
      } else {
        const points: HistoricalPosition[] = (data || []).map((d: any) => ({
          vehicle_id: d.vehicle_id,
          latitude: d.latitude,
          longitude: d.longitude,
          speed_kmh: d.speed_kmh ?? 0,
          heading: d.heading ?? 0,
          engine_on: d.engine_on ?? false,
          recorded_at: d.last_communication_at,
        })).filter((p: HistoricalPosition) => 
          Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
        );
        setDataPoints(points);
      }
    } catch (err) {
      console.error('TimeWarp error:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, vehicleIds, timeRange]);

  useEffect(() => {
    if (visible) {
      fetchHistory();
      setProgress(0);
      setPlaying(false);
    } else {
      setPlaying(false);
      setDataPoints([]);
    }
  }, [visible, fetchHistory]);

  // Get positions at a specific progress point
  const getPositionsAtProgress = useCallback((pct: number) => {
    if (dataPoints.length === 0) return new Map();

    const start = startTimeRef.current.getTime();
    const end = endTimeRef.current.getTime();
    const targetTime = start + (end - start) * (pct / 100);
    
    setCurrentTime(new Date(targetTime));

    // For each vehicle, find the closest position at or before targetTime
    const posMap = new Map<string, { lat: number; lng: number; speed: number; heading: number; engine_on: boolean }>();

    const byVehicle = new Map<string, HistoricalPosition[]>();
    dataPoints.forEach(p => {
      if (!byVehicle.has(p.vehicle_id)) byVehicle.set(p.vehicle_id, []);
      byVehicle.get(p.vehicle_id)!.push(p);
    });

    byVehicle.forEach((points, vehicleId) => {
      // Binary search for closest point
      let best: HistoricalPosition | null = null;
      let bestNext: HistoricalPosition | null = null;

      for (let i = 0; i < points.length; i++) {
        const t = new Date(points[i].recorded_at).getTime();
        if (t <= targetTime) {
          best = points[i];
          bestNext = points[i + 1] || null;
        } else {
          break;
        }
      }

      if (best) {
        // Interpolate between best and bestNext if available
        if (bestNext) {
          const t1 = new Date(best.recorded_at).getTime();
          const t2 = new Date(bestNext.recorded_at).getTime();
          const ratio = t2 > t1 ? (targetTime - t1) / (t2 - t1) : 0;
          const clampedRatio = Math.max(0, Math.min(1, ratio));

          posMap.set(vehicleId, {
            lat: best.latitude + (bestNext.latitude - best.latitude) * clampedRatio,
            lng: best.longitude + (bestNext.longitude - best.longitude) * clampedRatio,
            speed: best.speed_kmh + (bestNext.speed_kmh - best.speed_kmh) * clampedRatio,
            heading: best.heading,
            engine_on: best.engine_on,
          });
        } else {
          posMap.set(vehicleId, {
            lat: best.latitude,
            lng: best.longitude,
            speed: best.speed_kmh,
            heading: best.heading,
            engine_on: best.engine_on,
          });
        }
      }
    });

    return posMap;
  }, [dataPoints]);

  // Animation loop
  useEffect(() => {
    if (!playing || dataPoints.length === 0) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const tick = (timestamp: number) => {
      if (!lastTickRef.current) lastTickRef.current = timestamp;
      const delta = timestamp - lastTickRef.current;
      lastTickRef.current = timestamp;

      // Skip when tab hidden
      if (document.hidden) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      setProgress(prev => {
        const totalDurationMs = (timeRange * 60 * 1000) / playbackSpeed;
        const increment = (delta / totalDurationMs) * 100;
        const next = prev + increment;
        
        if (next >= 100) {
          setPlaying(false);
          return 100;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    lastTickRef.current = 0;
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playing, playbackSpeed, timeRange, dataPoints.length]);

  // Update positions when progress changes
  useEffect(() => {
    if (!visible || dataPoints.length === 0) return;
    const positions = getPositionsAtProgress(progress);
    onPositionsUpdate(positions);
  }, [progress, visible, getPositionsAtProgress, onPositionsUpdate]);

  if (!visible) return null;

  const rangeLabel = TIME_RANGES.find(r => r.minutes === timeRange)?.label || `${timeRange}m`;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-background/95 backdrop-blur-md rounded-xl border shadow-xl px-4 py-3 min-w-[500px] max-w-[700px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-semibold text-purple-600">Time-Warp</span>
          {loading && <span className="text-[10px] text-muted-foreground animate-pulse">Loading...</span>}
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(parseInt(v))}>
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map(r => (
                <SelectItem key={r.minutes} value={r.minutes.toString()}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Timeline slider */}
      <div className="mb-2">
        <Slider
          value={[progress]}
          onValueChange={([v]) => {
            setProgress(v);
            setPlaying(false);
          }}
          max={100}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>{format(startTimeRef.current, 'HH:mm')}</span>
          <span className="font-medium text-foreground">
            {currentTime ? format(currentTime, 'HH:mm:ss') : '--:--'}
          </span>
          <span>{format(endTimeRef.current, 'HH:mm')}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setProgress(0)}
          disabled={loading}
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setProgress(Math.max(0, progress - 5))}
          disabled={loading}
        >
          <Rewind className="w-4 h-4" />
        </Button>
        <Button
          variant={playing ? 'secondary' : 'default'}
          size="icon"
          className="h-9 w-9"
          onClick={() => {
            if (progress >= 100) setProgress(0);
            setPlaying(!playing);
          }}
          disabled={loading || dataPoints.length === 0}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setProgress(Math.min(100, progress + 5))}
          disabled={loading}
        >
          <FastForward className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setProgress(100)}
          disabled={loading}
        >
          <SkipForward className="w-4 h-4" />
        </Button>
        
        <div className="ml-2 border-l pl-2">
          <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(parseFloat(v))}>
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAYBACK_SPEEDS.map(s => (
                <SelectItem key={s} value={s.toString()}>{s}x</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-2 text-[10px] text-muted-foreground">
          {dataPoints.length} pts
        </div>
      </div>
    </div>
  );
};

export default TimeWarpPlayback;
