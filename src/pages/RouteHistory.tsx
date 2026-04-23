import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import maplibregl from "maplibre-gl";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RouteHistoryQuickStats from "@/components/routehistory/RouteHistoryQuickStats";
import RouteHistoryQuickActions from "@/components/routehistory/RouteHistoryQuickActions";
import RouteHistoryInsightsCard from "@/components/routehistory/RouteHistoryInsightsCard";
import RouteHistoryTrendChart from "@/components/routehistory/RouteHistoryTrendChart";
import { useStopMarkers, StopEvent, getEventColor } from "@/components/routehistory/StopMarkers";
import RouteHistoryEventMarkers from "@/components/routehistory/RouteHistoryEventMarkers";
import EventLocationDisplay from "@/components/routehistory/EventLocationDisplay";
import { RouteAnomalyPanel } from "@/components/ai/RouteAnomalyPanel";
import { useAddressGeocoding } from "@/hooks/useAddressGeocoding";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Loader2,
  User,
  StopCircle,
  Timer,
  Zap,
  Eye,
  EyeOff,
  Info,
  Keyboard
} from "lucide-react";
import LiveTrackingMap from "@/components/map/LiveTrackingMap";
import { RouteMapPreview } from "@/components/vehicle-requests/RouteMapPreview";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDriverScope } from "@/hooks/useDriverScope";
import { format, parseISO, differenceInMinutes, formatDistanceToNow } from "date-fns";
import { Radio, MapPinned } from "lucide-react";

import { useTranslation } from 'react-i18next';
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

const getDayBoundsISO = (dateStr: string) => {
  // Interpret the selected date in the user's local timezone, then convert
  // to UTC ISO bounds for querying.
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59.999`);

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
};

const RouteHistory = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const { isDriverOnly, driverId, loading: scopeLoading } = useDriverScope();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const today = format(new Date(), "yyyy-MM-dd");

  // Initialize from URL params or navigation state
  const urlVehicle = searchParams.get("vehicle") || (location.state as any)?.selectedVehicleId || "";
  const urlDate = searchParams.get("date") || today;
  const autoplayRequested = searchParams.get("autoplay") === "true";

  const [selectedVehicle, setSelectedVehicle] = useState<string>(urlVehicle);
  const [selectedDate, setSelectedDate] = useState<string>(urlDate);
  const isToday = selectedDate === today;

  const [followLive, setFollowLive] = useState(!autoplayRequested); // Disable live mode if autoplay
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showEventMarkers, setShowEventMarkers] = useState(true);
  const [speedLimit, setSpeedLimit] = useState(100); // Configurable speed limit
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayTriggered = useRef(false);

  // Callback to capture map instance - triggers re-render
  const handleMapReady = useCallback((map: maplibregl.Map) => {
    setMapInstance(map);
  }, []);

  // Update URL when vehicle/date changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedVehicle) params.set("vehicle", selectedVehicle);
    if (selectedDate && selectedDate !== today) params.set("date", selectedDate);
    setSearchParams(params, { replace: true });
  }, [selectedVehicle, selectedDate, today, setSearchParams]);

  // Live mode follows the latest known position. Toggling Live also snaps
  // the date to today (handled in the click handler), so no auto-disable here.

  // Fetch vehicles with assigned driver info.
  // For driver-only users, scope to vehicles they have actually used so the
  // dropdown only shows trips that are theirs (not the entire org fleet).
  const { data: vehicles, isLoading: vehiclesLoading, isError: vehiclesError } = useQuery({
    queryKey: ["vehicles-with-drivers", organizationId, isDriverOnly, driverId],
    queryFn: async () => {
      if (isDriverOnly) {
        if (!driverId) return [];

        // Vehicles the driver has either been assigned to or completed a request with.
        const [assignedRes, requestsRes] = await Promise.all([
          supabase
            .from("vehicles")
            .select("id, plate_number, make, model, assigned_driver_id")
            .eq("organization_id", organizationId!)
            .eq("assigned_driver_id", driverId),
          (supabase as any)
            .from("vehicle_requests")
            .select(
              "assigned_vehicle_id, assigned_vehicle:assigned_vehicle_id(id, plate_number, make, model, assigned_driver_id)"
            )
            .eq("assigned_driver_id", driverId)
            .not("assigned_vehicle_id", "is", null)
            .order("created_at", { ascending: false })
            .limit(100),
        ]);

        const map = new Map<string, any>();
        (assignedRes.data || []).forEach((v: any) => map.set(v.id, v));
        (requestsRes.data || []).forEach((r: any) => {
          if (r.assigned_vehicle && !map.has(r.assigned_vehicle.id)) {
            map.set(r.assigned_vehicle.id, r.assigned_vehicle);
          }
        });
        return Array.from(map.values()).sort((a, b) =>
          (a.plate_number || "").localeCompare(b.plate_number || "")
        );
      }

      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model, assigned_driver_id")
        .eq("organization_id", organizationId!)
        .order("plate_number");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && !scopeLoading,
  });

  // Driver-only: load recent journeys (vehicle + checkout date) for quick selection.
  const { data: driverRecentTrips } = useQuery({
    queryKey: ["route-history-driver-recent", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          `id, request_number, departure_place, destination,
           driver_checked_in_at, driver_checked_out_at,
           assigned_vehicle:assigned_vehicle_id(id, plate_number, make, model)`
        )
        .eq("assigned_driver_id", driverId)
        .not("driver_checked_out_at", "is", null)
        .order("driver_checked_out_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: isDriverOnly && !!driverId,
  });

  // Auto-select most recent vehicle/date for driver-only users when nothing
  // is selected yet, so the page is immediately useful instead of blank.
  useEffect(() => {
    if (!isDriverOnly || selectedVehicle) return;
    const recent = driverRecentTrips?.[0];
    if (recent?.assigned_vehicle?.id) {
      setSelectedVehicle(recent.assigned_vehicle.id);
      const checkoutAt = recent.driver_checked_out_at || recent.driver_checked_in_at;
      if (checkoutAt) {
        setSelectedDate(format(new Date(checkoutAt), "yyyy-MM-dd"));
      }
    }
  }, [isDriverOnly, selectedVehicle, driverRecentTrips]);

  // Fetch driver info for selected vehicle
  const selectedVehicleData = vehicles?.find(v => v.id === selectedVehicle);

  // Resolve the most relevant driver for the selected vehicle/date.
  // Order of precedence:
  //   1. If a driver-only user is viewing, the driver they checked-in/out for that vehicle on that date.
  //   2. The driver currently assigned to the vehicle.
  //   3. The driver from the most recent vehicle_request for this vehicle on the selected date.
  const { data: tripDriver } = useQuery({
    queryKey: [
      "route-history-trip-driver",
      selectedVehicle,
      selectedDate,
      isDriverOnly ? driverId : null,
    ],
    queryFn: async () => {
      if (!selectedVehicle) return null;
      const { startISO, endISO } = getDayBoundsISO(selectedDate);

      const baseQuery = (supabase as any)
        .from("vehicle_requests")
        .select(
          `assigned_driver_id,
           assigned_driver:assigned_driver_id(id, first_name, last_name, phone)`
        )
        .eq("assigned_vehicle_id", selectedVehicle)
        .not("assigned_driver_id", "is", null)
        .or(
          `and(driver_checked_in_at.gte.${startISO},driver_checked_in_at.lte.${endISO}),` +
            `and(driver_checked_out_at.gte.${startISO},driver_checked_out_at.lte.${endISO})`
        )
        .order("driver_checked_in_at", { ascending: false })
        .limit(1);

      const { data } = await baseQuery;
      const row = data?.[0];
      if (!row?.assigned_driver) return null;
      const d = row.assigned_driver;
      return {
        id: d.id,
        first_name: d.first_name,
        last_name: d.last_name,
        phone: d.phone,
        name: `${d.first_name || ""} ${d.last_name || ""}`.trim() || "Driver",
      };
    },
    enabled: !!selectedVehicle && !!selectedDate,
  });

  const { data: vehicleAssignedDriver } = useQuery({
    queryKey: ["driver", selectedVehicleData?.assigned_driver_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, first_name, last_name, phone")
        .eq("id", selectedVehicleData!.assigned_driver_id!)
        .single();
      if (error) throw error;
      return {
        ...data,
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "Driver",
      };
    },
    enabled: !!selectedVehicleData?.assigned_driver_id,
  });

  const assignedDriver = tripDriver || vehicleAssignedDriver || null;

  // Fetch telemetry for selected vehicle and date - paginated to bypass 1000 row limit
  const { data: telemetryData, isLoading: telemetryLoading, isError: telemetryError } = useQuery({
    queryKey: ["route-history-telemetry", selectedVehicle, selectedDate],
    queryFn: async () => {
      const { startISO, endISO } = getDayBoundsISO(selectedDate);

      const allData: TelemetryPoint[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("vehicle_telemetry")
          .select("id, latitude, longitude, speed_kmh, fuel_level_percent, heading, last_communication_at, engine_on")
          .eq("vehicle_id", selectedVehicle)
          .gte("last_communication_at", startISO)
          .lte("last_communication_at", endISO)
          .order("last_communication_at", { ascending: true })
          .range(offset, offset + pageSize - 1);
        
        if (error) throw error;
        
        const validData = (data || []).filter(p => p.latitude != null && p.longitude != null) as TelemetryPoint[];
        allData.push(...validData);
        
        hasMore = data?.length === pageSize;
        offset += pageSize;
      }
      
      return allData;
    },
    enabled: !!selectedVehicle && !!selectedDate,
  });

  const routeHistory = telemetryData || [];
  const hasData = routeHistory.length > 0;

  // Fallback when GPS telemetry is missing for the selected date:
  // pull any vehicle_requests this vehicle ran that day so we can at least
  // show start → destination markers + an animated "trip overview" map.
  const { data: tripsForDay } = useQuery({
    queryKey: ["route-history-trips-for-day", selectedVehicle, selectedDate],
    enabled: !!selectedVehicle && !!selectedDate && !telemetryLoading && !hasData,
    queryFn: async () => {
      const { startISO, endISO } = getDayBoundsISO(selectedDate);
      const { data } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          `id, request_number, status,
           departure_place, departure_lat, departure_lng,
           destination, destination_lat, destination_lng,
           needed_from, needed_until,
           driver_checked_in_at, driver_checked_out_at,
           driver_checkin_odometer, driver_checkout_odometer,
           assigned_driver:assigned_driver_id(first_name, last_name)`
        )
        .eq("assigned_vehicle_id", selectedVehicle)
        .or(
          [
            `and(driver_checked_in_at.gte.${startISO},driver_checked_in_at.lte.${endISO})`,
            `and(driver_checked_out_at.gte.${startISO},driver_checked_out_at.lte.${endISO})`,
            `and(needed_from.gte.${startISO},needed_from.lte.${endISO})`,
          ].join(",")
        )
        .order("needed_from", { ascending: true })
        .limit(20);
      return (data || []) as any[];
    },
  });
  const hasFallbackTrips = (tripsForDay?.length || 0) > 0;

  // Suggest dates with telemetry for the selected vehicle (last 14 days)
  const { data: availableDates } = useQuery({
    queryKey: ["route-history-available-dates", selectedVehicle],
    queryFn: async () => {
      if (!selectedVehicle) return [];
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const { data } = await supabase
        .from("vehicle_telemetry")
        .select("last_communication_at")
        .eq("vehicle_id", selectedVehicle)
        .gte("last_communication_at", fourteenDaysAgo.toISOString())
        .order("last_communication_at", { ascending: false })
        .limit(500);

      const set = new Set<string>();
      (data || []).forEach((r: any) => {
        if (r.last_communication_at) {
          set.add(format(new Date(r.last_communication_at), "yyyy-MM-dd"));
        }
      });
      return Array.from(set).slice(0, 7);
    },
    enabled: !!selectedVehicle && !hasData && !telemetryLoading,
  });

  // Latest known position for the selected vehicle (across all history).
  // Used by Live mode and to show "last seen" badge / jump-to buttons even
  // when the selected date has no data.
  const { data: latestPosition, refetch: refetchLatestPosition } = useQuery({
    queryKey: ["route-history-latest-position", selectedVehicle],
    queryFn: async () => {
      if (!selectedVehicle) return null;
      const { data, error } = await supabase
        .from("vehicle_telemetry")
        .select("latitude, longitude, speed_kmh, fuel_level_percent, heading, engine_on, last_communication_at")
        .eq("vehicle_id", selectedVehicle)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("last_communication_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!selectedVehicle,
    refetchInterval: followLive ? 15_000 : false,
  });

  const latestSeenLabel = latestPosition?.last_communication_at
    ? formatDistanceToNow(parseISO(latestPosition.last_communication_at), { addSuffix: true })
    : null;

  const jumpToLatestData = useCallback(() => {
    if (!latestPosition?.last_communication_at) return;
    const dateStr = format(parseISO(latestPosition.last_communication_at), "yyyy-MM-dd");
    setSelectedDate(dateStr);
    setFollowLive(false);
  }, [latestPosition]);

  const jumpToLatestPosition = useCallback(() => {
    if (!latestPosition?.latitude || !latestPosition?.longitude || !mapInstance) return;
    mapInstance.flyTo({
      center: [latestPosition.longitude, latestPosition.latitude],
      zoom: 15,
      duration: 1200,
    });
  }, [latestPosition, mapInstance]);

  // When Live is toggled on, immediately fly to the latest known position
  // and refetch so the user sees a marker right away.
  useEffect(() => {
    if (!followLive) return;
    refetchLatestPosition();
    if (latestPosition?.latitude && latestPosition?.longitude && mapInstance) {
      mapInstance.flyTo({
        center: [latestPosition.longitude, latestPosition.latitude],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [followLive, mapInstance, latestPosition, refetchLatestPosition]);

  // Auto-start playback when navigating from Trip Replay action
  useEffect(() => {
    if (autoplayRequested && hasData && !autoplayTriggered.current) {
      autoplayTriggered.current = true;
      setFollowLive(false);
      setPlaybackProgress(0);
      // Small delay to allow map to render before starting playback
      setTimeout(() => {
        setIsPlaying(true);
      }, 500);
      
      // Clean up the autoplay param from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("autoplay");
      setSearchParams(newParams, { replace: true });
    }
  }, [autoplayRequested, hasData, searchParams, setSearchParams]);

  // Calculate stop markers with configurable speed limit
  const stopEvents = useStopMarkers({ routeData: routeHistory, speedLimit });

  // Realtime: append new telemetry points for the selected vehicle/date
  useEffect(() => {
    if (!organizationId || !selectedVehicle || !selectedDate) return;

    const { startMs, endMs } = getDayBoundsISO(selectedDate);

    const channel = supabase
      .channel(`route-history-live-${selectedVehicle.slice(0, 8)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vehicle_telemetry",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (!row || row.vehicle_id !== selectedVehicle) return;

          const ts = (row.last_communication_at || row.created_at) as string | undefined;
          if (!ts) return;

          const tsMs = new Date(ts).getTime();
          if (Number.isNaN(tsMs) || tsMs < startMs || tsMs > endMs) return;

          if (row.latitude == null || row.longitude == null) return;

          queryClient.setQueryData(
            ["route-history-telemetry", selectedVehicle, selectedDate],
            (old: unknown) => {
              const prev = (old as TelemetryPoint[] | undefined) || [];
              if (prev.some((p) => p.id === row.id)) return prev;

              return [
                ...prev,
                {
                  id: row.id,
                  latitude: row.latitude,
                  longitude: row.longitude,
                  speed_kmh: row.speed_kmh ?? null,
                  fuel_level_percent: row.fuel_level_percent ?? null,
                  heading: row.heading ?? null,
                  last_communication_at: ts,
                  engine_on: row.engine_on ?? null,
                } as TelemetryPoint,
              ];
            }
          );

          if (followLive) {
            setIsPlaying(false);
            setPlaybackProgress(100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, selectedVehicle, selectedDate, queryClient, followLive]);

  // Calculate current position (playback or live-follow)
  const effectiveIndex = hasData
    ? followLive
      ? routeHistory.length - 1
      : Math.floor((playbackProgress / 100) * Math.max(0, routeHistory.length - 1))
    : 0;

  // Use latest known position as a fallback when there is no data on the
  // selected date — keeps the map informative instead of empty.
  const fallbackPosition: TelemetryPoint | null = latestPosition
    ? {
        id: "latest-known",
        latitude: latestPosition.latitude,
        longitude: latestPosition.longitude,
        speed_kmh: latestPosition.speed_kmh ?? null,
        fuel_level_percent: latestPosition.fuel_level_percent ?? null,
        heading: latestPosition.heading ?? null,
        last_communication_at: latestPosition.last_communication_at,
        engine_on: latestPosition.engine_on ?? null,
      }
    : null;

  const currentPosition = hasData
    ? routeHistory[effectiveIndex]
    : (followLive ? fallbackPosition : null);

  // Address geocoding for current position
  const { address: currentAddress, isLoading: addressLoading } = useAddressGeocoding(
    currentPosition?.latitude,
    currentPosition?.longitude,
    !!currentPosition
  );

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

    // Haversine distance helper
    const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Calculate distance only when vehicle is moving (speed > 2 km/h)
    // This filters out GPS drift while stationary
    let totalDistanceKm = 0;
    let filteredSegments = 0;
    let invalidCoordPoints = 0;
    const MIN_MOVING_SPEED = 2; // km/h threshold for "moving"
    const MAX_SEGMENT_KM = 5; // Max 5km per segment (10-60 sec intervals) to filter GPS jumps

    // Count invalid coordinate points
    invalidCoordPoints = routeHistory.filter(p => !p.latitude || !p.longitude).length;
    const validPoints = totalPoints - invalidCoordPoints;

    for (let i = 1; i < routeHistory.length; i++) {
      const prev = routeHistory[i - 1];
      const curr = routeHistory[i];

      // Only count distance when vehicle is moving
      const currSpeed = curr.speed_kmh || 0;
      const prevSpeed = prev.speed_kmh || 0;
      if (currSpeed < MIN_MOVING_SPEED && prevSpeed < MIN_MOVING_SPEED) continue;

      const prevLat = prev.latitude || 0;
      const prevLng = prev.longitude || 0;
      const currLat = curr.latitude || 0;
      const currLng = curr.longitude || 0;

      // Skip invalid coordinates
      if (!prevLat || !prevLng || !currLat || !currLng) continue;

      const segmentKm = haversine(prevLat, prevLng, currLat, currLng);

      // Filter out GPS jumps (unrealistic single-segment distance)
      if (segmentKm <= MAX_SEGMENT_KM) {
        totalDistanceKm += segmentKm;
      } else {
        filteredSegments++;
      }
    }

    // Calculate idle time (stopped with engine on - would need engine_on data)
    const idlePoints = routeHistory.filter(p => (p.speed_kmh || 0) <= MIN_MOVING_SPEED && p.engine_on === true).length;

    return {
      durationMinutes,
      totalPoints,
      validPoints,
      movingPoints,
      stoppedPoints,
      idlePoints,
      invalidCoordPoints,
      filteredSegments,
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
    if (followLive) {
      // Live mode: always stay on the latest point
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (isPlaying) setIsPlaying(false);
      return;
    }

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
          return prev + playbackSpeed * 0.5;
        });
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, hasData, followLive]);

  const handlePlayPause = () => {
    if (!hasData || followLive) return;
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    if (followLive) return;
    setPlaybackProgress(0);
    setIsPlaying(false);
  };

  const handleSkipForward = () => {
    if (followLive) return;
    setPlaybackProgress(Math.min(100, playbackProgress + 10));
  };

  const handleSkipBack = () => {
    if (followLive) return;
    setPlaybackProgress(Math.max(0, playbackProgress - 10));
  };

  // Jump to event time
  const handleJumpToEvent = useCallback((event: StopEvent) => {
    if (!hasData || followLive) return;
    
    // Find the index of the point closest to the event's start time
    const eventTime = new Date(event.startTime).getTime();
    let closestIndex = 0;
    let minDiff = Infinity;
    
    routeHistory.forEach((point, index) => {
      const pointTime = new Date(point.last_communication_at).getTime();
      const diff = Math.abs(pointTime - eventTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = index;
      }
    });
    
    const progress = (closestIndex / Math.max(1, routeHistory.length - 1)) * 100;
    setPlaybackProgress(progress);
    setIsPlaying(false);
    
    // Pan map to event location
    if (mapInstance && event.latitude && event.longitude) {
      mapInstance.flyTo({
        center: [event.longitude, event.latitude],
        zoom: 16,
        duration: 1000
      });
    }
  }, [hasData, followLive, routeHistory, mapInstance]);

  // Keyboard shortcuts for playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case " ": // Spacebar - play/pause
          e.preventDefault();
          if (hasData && !followLive) {
            setIsPlaying(prev => !prev);
          }
          break;
        case "ArrowLeft": // Left arrow - skip back
          e.preventDefault();
          if (hasData && !followLive) {
            setPlaybackProgress(prev => Math.max(0, prev - 10));
          }
          break;
        case "ArrowRight": // Right arrow - skip forward
          e.preventDefault();
          if (hasData && !followLive) {
            setPlaybackProgress(prev => Math.min(100, prev + 10));
          }
          break;
        case "r": // R - reset
        case "R":
          if (hasData && !followLive) {
            setPlaybackProgress(0);
            setIsPlaying(false);
          }
          break;
        case "l": // L - toggle live mode
        case "L":
          if (selectedVehicle && isToday) {
            setFollowLive(prev => !prev);
          }
          break;
        case "e": // E - toggle event markers
        case "E":
          setShowEventMarkers(prev => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasData, followLive, selectedVehicle, isToday]);


  return (
    <Layout>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{t('pages.route_history.title', 'Route History Playback')}</h1>
              <p className="text-muted-foreground mt-1">{t('pages.route_history.description', 'View and analyze historical vehicle routes')}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-4">
            <RouteHistoryQuickActions
              hasData={hasData}
              vehicleId={selectedVehicle}
              vehiclePlate={selectedVehicleData?.plate_number}
              vehicleMake={selectedVehicleData?.make}
              vehicleModel={selectedVehicleData?.model}
              driverName={assignedDriver?.name}
              selectedDate={selectedDate}
              tripSummary={tripSummary}
              routeData={routeHistory}
            />
          </div>

          {/* Driver Info Badge */}
          {selectedVehicle && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm text-muted-foreground">Driver:</span>
              {assignedDriver ? (
                <Badge variant="secondary" className="gap-1">
                  {assignedDriver.name}
                  {assignedDriver.phone && <span className="text-muted-foreground">• {assignedDriver.phone}</span>}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground italic">Not assigned</span>
              )}
              {latestSeenLabel && (
                <Badge variant="outline" className="gap-1 ml-2">
                  <Radio className="h-3 w-3 text-destructive" />
                  Last seen {latestSeenLabel}
                </Badge>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div>
              <Label htmlFor="vehicle-select" className="text-sm font-medium mb-2 block">
                Select Vehicle
              </Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger id="vehicle-select" aria-label="Select a vehicle">
                  {vehiclesLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>{t('common.loading', 'Loading...')}</span>
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

            <div>
              <Label htmlFor="speed-limit" className="text-sm font-medium mb-2 block">
                Speed Limit (km/h)
              </Label>
              <Input
                id="speed-limit"
                type="number"
                min={20}
                max={200}
                value={speedLimit}
                onChange={(e) => setSpeedLimit(Math.max(20, Math.min(200, Number(e.target.value) || 100)))}
                aria-label="Set speed limit threshold for speeding detection"
                className="w-full"
              />
            </div>
          </div>

          {/* Driver-only: quick-pick strip of recent journeys */}
          {isDriverOnly && (driverRecentTrips?.length || 0) > 0 && (
            <div className="mt-4">
              <Label className="text-sm font-medium mb-2 block">My Recent Journeys</Label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {driverRecentTrips!.map((trip: any) => {
                  const tripDate = trip.driver_checked_out_at || trip.driver_checked_in_at;
                  if (!tripDate || !trip.assigned_vehicle?.id) return null;
                  const dateStr = format(new Date(tripDate), "yyyy-MM-dd");
                  const isActive =
                    selectedVehicle === trip.assigned_vehicle.id && selectedDate === dateStr;
                  return (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() => {
                        setSelectedVehicle(trip.assigned_vehicle.id);
                        setSelectedDate(dateStr);
                      }}
                      className={`shrink-0 rounded-lg border px-3 py-2 text-left transition-colors ${
                        isActive
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <Navigation className="h-3 w-3 text-primary" />
                        {trip.assigned_vehicle.plate_number}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(tripDate), "MMM d, HH:mm")}
                      </div>
                      {(trip.departure_place || trip.destination) && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                          {trip.departure_place || "—"} → {trip.destination || "—"}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
              vehicles={
                currentPosition
                  ? [
                      {
                        id: "playback",
                        plate: selectedVehicleData?.plate_number || "Vehicle",
                        status:
                          (currentPosition.speed_kmh || 0) > 3
                            ? "moving"
                            : currentPosition.engine_on
                              ? "idle"
                              : "stopped",
                        fuel: currentPosition.fuel_level_percent || 0,
                        speed: currentPosition.speed_kmh || 0,
                        lat: currentPosition.latitude || 0,
                        lng: currentPosition.longitude || 0,
                        engine_on: Boolean(currentPosition.engine_on),
                        heading: currentPosition.heading || 0,
                      },
                    ]
                  : []
              }
              showTrails={true}
              trails={useMemo(() => {
                if (!hasData) return new Map();
                // Create trail from start up to current position (playback or live)
                const trailPoints = routeHistory.slice(0, effectiveIndex + 1).map((p) => ({
                  lat: p.latitude || 0,
                  lng: p.longitude || 0,
                  timestamp: p.last_communication_at,
                  speed: p.speed_kmh || 0,
                }));
                return new Map([["playback", trailPoints]]);
              }, [hasData, routeHistory, effectiveIndex])}
              onMapReady={handleMapReady}
              disablePopups={true}
            />
            
            {/* Event Markers on Map */}
            <RouteHistoryEventMarkers 
              map={mapInstance}
              events={stopEvents}
              visible={showEventMarkers && hasData}
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
                    disabled={!hasData || followLive}
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
                     disabled={!hasData || followLive}
                   >
                     <RotateCcw className="h-4 w-4" aria-hidden="true" />
                   </Button>
                   <Button 
                     variant="outline" 
                     size="icon" 
                     onClick={handleSkipBack}
                     aria-label="Skip back 10%"
                     disabled={!hasData || followLive}
                   >
                     <SkipBack className="h-4 w-4" aria-hidden="true" />
                   </Button>
                   <Button 
                     size="icon" 
                     onClick={handlePlayPause}
                     aria-label={isPlaying ? "Pause playback" : "Play playback"}
                     disabled={!hasData || followLive}
                   >
                     {isPlaying ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
                   </Button>
                   <Button 
                     variant="outline" 
                     size="icon" 
                     onClick={handleSkipForward}
                     aria-label="Skip forward 10%"
                     disabled={!hasData || followLive}
                   >
                     <SkipForward className="h-4 w-4" aria-hidden="true" />
                   </Button>

                   <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Button
                           variant={followLive ? "default" : "outline"}
                           size="sm"
                           className={`ml-4 gap-1.5 ${followLive ? "animate-pulse" : ""}`}
                           onClick={() => {
                             // Live: snap to today's date and follow latest position.
                             if (!followLive) {
                               setSelectedDate(today);
                               setIsPlaying(false);
                               setPlaybackProgress(100);
                             }
                             setFollowLive((v) => !v);
                           }}
                           disabled={!selectedVehicle}
                           aria-label={followLive ? "Live mode enabled" : "Enable live mode"}
                         >
                           <Radio className={`h-3.5 w-3.5 ${followLive ? "text-destructive-foreground" : "text-destructive"}`} />
                           Live
                         </Button>
                       </TooltipTrigger>
                       <TooltipContent side="top" className="max-w-xs text-xs">
                         {followLive
                           ? "Following latest position. Auto-refresh every 15s."
                           : latestSeenLabel
                             ? `Show latest position. Last seen ${latestSeenLabel}.`
                             : "No telemetry yet for this vehicle."}
                       </TooltipContent>
                     </Tooltip>
                   </TooltipProvider>

                   <Button variant="outline" size="sm" className="ml-2" disabled aria-label={`Current playback speed: ${playbackSpeed}x`}>
                     {playbackSpeed}x Speed
                   </Button>

                   <div className="flex items-center gap-2 ml-4 border-l pl-4">
                     <Switch
                       id="show-events"
                       checked={showEventMarkers}
                       onCheckedChange={setShowEventMarkers}
                       aria-label="Show event markers"
                     />
                     <Label htmlFor="show-events" className="text-xs cursor-pointer flex items-center gap-1">
                       {showEventMarkers ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                       Events
                     </Label>
                   </div>

                   <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" className="ml-2 h-8 w-8">
                           <Keyboard className="h-4 w-4 text-muted-foreground" />
                         </Button>
                       </TooltipTrigger>
                       <TooltipContent side="top" className="max-w-xs">
                         <div className="text-xs space-y-1">
                           <p><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Space</kbd> Play/Pause</p>
                           <p><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">←</kbd> Skip back 10%</p>
                           <p><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">→</kbd> Skip forward 10%</p>
                           <p><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">R</kbd> Reset</p>
                           <p><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">L</kbd> Toggle Live</p>
                           <p><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">E</kbd> Toggle Events</p>
                         </div>
                       </TooltipContent>
                     </Tooltip>
                   </TooltipProvider>
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
                  validPoints={tripSummary.validPoints}
                  movingPoints={tripSummary.movingPoints}
                  stoppedPoints={tripSummary.stoppedPoints}
                  idlePoints={tripSummary.idlePoints}
                  invalidCoordPoints={tripSummary.invalidCoordPoints}
                  filteredSegments={tripSummary.filteredSegments}
                  startTime={tripSummary.startTime}
                  endTime={tripSummary.endTime}
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
                          <div className="text-xs text-muted-foreground mb-1">Location</div>
                          {addressLoading ? (
                            <Skeleton className="h-4 w-32" />
                          ) : currentAddress ? (
                            <div className="text-sm font-medium leading-tight">{currentAddress}</div>
                          ) : (
                            <div className="text-xs font-mono break-all">
                              {(currentPosition.latitude || 0).toFixed(6)}, {(currentPosition.longitude || 0).toFixed(6)}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1 font-mono">
                            {(currentPosition.latitude || 0).toFixed(6)}, {(currentPosition.longitude || 0).toFixed(6)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stop Events Panel */}
                  {stopEvents.length > 0 && (
                    <Card className="bg-muted/30">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <StopCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                          Events ({stopEvents.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0 max-h-64 overflow-y-auto">
                        <div className="space-y-2">
                          {stopEvents.map((event) => (
                            <button 
                              key={event.id} 
                              className="w-full flex items-start gap-2 text-xs p-2 rounded bg-background/50 hover:bg-background/80 transition-colors text-left cursor-pointer"
                              onClick={() => handleJumpToEvent(event)}
                              aria-label={`Jump to ${event.type} event at ${format(parseISO(event.startTime), "HH:mm")}`}
                            >
                              <div 
                                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                                style={{ backgroundColor: getEventColor(event.type) }}
                                aria-hidden="true"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  {event.type === "stop" && <StopCircle className="h-3 w-3 text-destructive" aria-hidden="true" />}
                                  {event.type === "idle" && <Timer className="h-3 w-3 text-warning" aria-hidden="true" />}
                                  {event.type === "speeding" && <Zap className="h-3 w-3 text-destructive" aria-hidden="true" />}
                                  <span className="font-medium capitalize">{event.type}</span>
                                  <span className="text-muted-foreground">
                                    {format(parseISO(event.startTime), "HH:mm")}
                                  </span>
                                </div>
                                <p className="text-muted-foreground truncate">{event.description}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                                  <EventLocationDisplay 
                                    latitude={event.latitude} 
                                    longitude={event.longitude} 
                                  />
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

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

                  {/* AI Route Anomaly Detection */}
                  {selectedVehicle && organizationId && hasData && (
                    <RouteAnomalyPanel
                      vehicleId={selectedVehicle}
                      organizationId={organizationId}
                      date={selectedDate}
                      telemetryPoints={routeHistory}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground" role="status">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                  <p className="text-sm font-medium mb-2">
                    {!selectedVehicle
                      ? isDriverOnly
                        ? (driverRecentTrips?.length || 0) > 0
                          ? "Pick one of your recent journeys above to replay"
                          : "You haven't completed any trips yet"
                        : "Select a vehicle to view route history"
                      : hasFallbackTrips
                        ? "No GPS telemetry — showing trip overview from manifest"
                        : "No route data found for the selected date"}
                  </p>
                  {selectedVehicle && (
                    <div className="text-xs space-y-3 max-w-2xl mx-auto">
                      {/* Trip overview fallback — start → destination per trip */}
                      {hasFallbackTrips && (
                        <div className="space-y-3 text-left">
                          {tripsForDay!.map((t: any) => {
                            const driverName = t.assigned_driver
                              ? `${t.assigned_driver.first_name || ""} ${t.assigned_driver.last_name || ""}`.trim()
                              : null;
                            const distance =
                              t.driver_checkin_odometer != null && t.driver_checkout_odometer != null
                                ? Math.max(0, Number(t.driver_checkout_odometer) - Number(t.driver_checkin_odometer))
                                : null;
                            const startTs = t.driver_checked_in_at || t.needed_from;
                            const endTs = t.driver_checked_out_at || t.needed_until;
                            return (
                              <Card key={t.id} className="overflow-hidden">
                                <CardHeader className="py-2 px-3 bg-muted/40 flex-row items-center gap-2 space-y-0">
                                  <Navigation className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                                  <span className="text-xs font-mono">{t.request_number}</span>
                                  <Badge variant="outline" className="text-[10px] capitalize">
                                    {String(t.status || "").replace(/_/g, " ")}
                                  </Badge>
                                  {driverName && (
                                    <span className="text-[11px] text-muted-foreground ml-auto">
                                      {driverName}
                                    </span>
                                  )}
                                </CardHeader>
                                <CardContent className="p-0">
                                  <RouteMapPreview
                                    departure={{
                                      lat: t.departure_lat ?? null,
                                      lng: t.departure_lng ?? null,
                                      label: t.departure_place || "Start",
                                    }}
                                    destination={{
                                      lat: t.destination_lat ?? null,
                                      lng: t.destination_lng ?? null,
                                      label: t.destination || "Destination",
                                    }}
                                    heightPx={220}
                                  />
                                  <div className="px-3 py-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                    <div>
                                      <p className="text-muted-foreground">Start</p>
                                      <p className="font-medium">
                                        {startTs ? format(parseISO(startTs), "HH:mm") : "—"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">End</p>
                                      <p className="font-medium">
                                        {endTs ? format(parseISO(endTs), "HH:mm") : "—"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Distance</p>
                                      <p className="font-medium">
                                        {distance != null ? `${distance.toFixed(1)} km` : "—"}
                                      </p>
                                    </div>
                                    <div className="truncate">
                                      <p className="text-muted-foreground">Route</p>
                                      <p className="font-medium truncate">
                                        {(t.departure_place || "—") + " → " + (t.destination || "—")}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}

                      <p className="text-muted-foreground/70">
                        The GPS device may not have transmitted data on {format(parseISO(selectedDate), "PPP")}.
                      </p>

                      {/* Last-known position quick access */}
                      {latestPosition && latestSeenLabel && (
                        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                          <div className="flex items-center justify-center gap-1.5 text-foreground font-medium">
                            <MapPinned className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                            Last known position {latestSeenLabel}
                          </div>
                          <div className="flex flex-wrap justify-center gap-2">
                            <Button size="sm" variant="default" onClick={jumpToLatestData} className="h-7 text-xs">
                              Jump to that day
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setFollowLive(true)} className="h-7 text-xs gap-1">
                              <Radio className="h-3 w-3 text-destructive" />
                              Show on map (Live)
                            </Button>
                            {mapInstance && (
                              <Button size="sm" variant="ghost" onClick={jumpToLatestPosition} className="h-7 text-xs">
                                Pan map only
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {!latestPosition && (
                        <p className="text-muted-foreground/70 italic">
                          This device has not transmitted any GPS data yet.
                        </p>
                      )}

                      {(availableDates?.length || 0) > 0 ? (
                        <div className="space-y-2">
                          <p className="flex items-center justify-center gap-1 text-foreground font-medium">
                            <Info className="h-3 w-3" aria-hidden="true" />
                            Recent dates with route data
                          </p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {availableDates!.map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setSelectedDate(d)}
                                className="rounded-md border border-border bg-card hover:bg-accent hover:border-primary/50 transition-colors px-2.5 py-1 text-xs"
                              >
                                {format(parseISO(d), "MMM d")}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : !latestPosition ? null : (
                        <p className="flex items-center justify-center gap-1">
                          <Info className="h-3 w-3" aria-hidden="true" />
                          Try selecting a different date
                        </p>
                      )}
                    </div>
                  )}
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
