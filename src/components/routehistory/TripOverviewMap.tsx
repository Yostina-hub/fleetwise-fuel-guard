/**
 * TripOverviewMap
 * ----------------
 * Professional fallback map shown on Route History when GPS telemetry
 * is missing for the selected day.
 *
 * Renders one or more trips (from vehicle_requests) inside the main map
 * area with:
 *   - Green "A" marker for start (departure)
 *   - Red "B" marker for end (destination)
 *   - Real driving route (OSRM via route-directions edge function)
 *   - Animated vehicle marker that moves from A → B
 *   - Trip selector when multiple trips exist on the same day
 *   - Play / Pause / Reset controls + speed selector
 *
 * Pure presentational — fed by the parent page.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createLematTransformRequest, fetchLematMapStyle } from "@/lib/lemat";
import { useLematApiKey } from "@/hooks/useLematApiKey";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  RotateCcw,
  MapPin,
  Navigation,
  Clock,
  Route as RouteIcon,
  AlertCircle,
  Car,
  User,
} from "lucide-react";
import { format, parseISO } from "date-fns";

export interface TripOverviewItem {
  id: string;
  request_number: string | null;
  status: string | null;
  departure_lat: number | null;
  departure_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  departure_place: string | null;
  destination: string | null;
  driver_checked_in_at: string | null;
  driver_checked_out_at: string | null;
  needed_from: string | null;
  needed_until: string | null;
  driver_checkin_odometer: number | null;
  driver_checkout_odometer: number | null;
  driver_name: string | null;
}

interface TripOverviewMapProps {
  trips: TripOverviewItem[];
  vehiclePlate?: string | null;
  selectedDateLabel: string;
}

const PLAYBACK_SPEEDS = [0.5, 1, 2, 4];

// Linear interpolation along a polyline. progress is 0..1.
function interpolateAlongPath(
  path: [number, number][],
  progress: number
): [number, number] {
  if (path.length === 0) return [0, 0];
  if (path.length === 1) return path[0];
  const clamped = Math.max(0, Math.min(1, progress));
  // Compute cumulative distances
  const segments: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const [x1, y1] = path[i - 1];
    const [x2, y2] = path[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    segments.push(len);
    total += len;
  }
  if (total === 0) return path[0];
  const target = clamped * total;
  let acc = 0;
  for (let i = 0; i < segments.length; i++) {
    if (acc + segments[i] >= target) {
      const remain = target - acc;
      const t = segments[i] === 0 ? 0 : remain / segments[i];
      const [x1, y1] = path[i];
      const [x2, y2] = path[i + 1];
      return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
    }
    acc += segments[i];
  }
  return path[path.length - 1];
}

export const TripOverviewMap = ({
  trips,
  vehiclePlate,
  selectedDateLabel,
}: TripOverviewMapProps) => {
  const { apiKey: lematApiKey } = useLematApiKey();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const startMarkerRef = useRef<maplibregl.Marker | null>(null);
  const endMarkerRef = useRef<maplibregl.Marker | null>(null);
  const vehicleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const [mapReady, setMapReady] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>(
    trips[0]?.id ?? ""
  );
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(
    null
  );
  const [routeKm, setRouteKm] = useState<number | null>(null);
  const [routeMin, setRouteMin] = useState<number | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeFailed, setRouteFailed] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [speed, setSpeed] = useState<number>(1);

  const trip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) ?? trips[0] ?? null,
    [trips, selectedTripId]
  );

  // Keep selection in sync if list changes
  useEffect(() => {
    if (!trips.find((t) => t.id === selectedTripId)) {
      setSelectedTripId(trips[0]?.id ?? "");
    }
  }, [trips, selectedTripId]);

  // Reset playback when trip changes
  useEffect(() => {
    setProgress(0);
    setIsPlaying(false);
  }, [selectedTripId]);

  const hasStart =
    trip?.departure_lat != null && trip?.departure_lng != null;
  const hasEnd =
    trip?.destination_lat != null && trip?.destination_lng != null;
  const hasBothPoints = hasStart && hasEnd;

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    (async () => {
      const style = await fetchLematMapStyle("streets");
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [38.7578, 9.0054],
        zoom: 11,
        transformRequest: createLematTransformRequest(lematApiKey),
        attributionControl: false,
      });
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right"
      );
      map.on("load", () => {
        map.resize();
        setMapReady(true);
      });
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      startMarkerRef.current?.remove();
      endMarkerRef.current?.remove();
      vehicleMarkerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch real driving route when trip changes
  useEffect(() => {
    if (!hasBothPoints || !trip) {
      setRouteGeometry(null);
      setRouteKm(null);
      setRouteMin(null);
      setRouteFailed(false);
      return;
    }

    const controller = new AbortController();
    setRouteLoading(true);
    setRouteFailed(false);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "route-directions",
          {
            body: {
              coordinates: [
                [trip.departure_lng, trip.departure_lat],
                [trip.destination_lng, trip.destination_lat],
              ],
            },
          }
        );
        if (controller.signal.aborted) return;
        if (
          error ||
          !data?.ok ||
          !Array.isArray(data?.geometry) ||
          data.geometry.length < 2
        ) {
          // Fall back to straight line
          setRouteGeometry([
            [trip.departure_lng!, trip.departure_lat!],
            [trip.destination_lng!, trip.destination_lat!],
          ]);
          setRouteKm(null);
          setRouteMin(null);
          setRouteFailed(true);
          return;
        }
        setRouteGeometry(data.geometry as [number, number][]);
        setRouteKm(
          typeof data.distance_m === "number" ? data.distance_m / 1000 : null
        );
        setRouteMin(
          typeof data.duration_s === "number" ? data.duration_s / 60 : null
        );
      } catch {
        if (!controller.signal.aborted) {
          setRouteGeometry([
            [trip.departure_lng!, trip.departure_lat!],
            [trip.destination_lng!, trip.destination_lat!],
          ]);
          setRouteFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) setRouteLoading(false);
      }
    })();

    return () => controller.abort();
  }, [trip, hasBothPoints]);

  // Render route + markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !trip) return;

    // Clean previous layers
    if (map.getLayer("trip-route-line")) map.removeLayer("trip-route-line");
    if (map.getLayer("trip-route-casing")) map.removeLayer("trip-route-casing");
    if (map.getSource("trip-route")) map.removeSource("trip-route");

    startMarkerRef.current?.remove();
    endMarkerRef.current?.remove();
    vehicleMarkerRef.current?.remove();
    startMarkerRef.current = null;
    endMarkerRef.current = null;
    vehicleMarkerRef.current = null;

    const coords =
      routeGeometry ??
      (hasBothPoints
        ? [
            [trip.departure_lng!, trip.departure_lat!],
            [trip.destination_lng!, trip.destination_lat!],
          ]
        : null);

    // Draw route line
    if (coords && coords.length >= 2) {
      map.addSource("trip-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        },
      });
      // Casing (white outline)
      map.addLayer({
        id: "trip-route-casing",
        type: "line",
        source: "trip-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 7,
          "line-opacity": 0.85,
        },
      });
      // Main line
      map.addLayer({
        id: "trip-route-line",
        type: "line",
        source: "trip-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "hsl(217 91% 55%)",
          "line-width": 4,
          "line-opacity": 0.95,
          "line-dasharray": routeFailed ? [2, 1.5] : [1, 0],
        },
      });
    }

    // Start marker (A)
    if (hasStart) {
      const el = document.createElement("div");
      el.style.cssText = `
        width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
        background: hsl(142 71% 45%); color: #fff; border: 3px solid #fff;
        border-radius: 50%; font-weight: 700; font-size: 13px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35); cursor: pointer;
      `;
      el.textContent = "A";
      const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(
        `<div style="padding:8px 10px;font-size:12px;font-weight:600;background:hsl(var(--popover));color:hsl(var(--popover-foreground));">
           <div style="color:hsl(142 71% 45%);font-size:11px;margin-bottom:2px;">START</div>
           ${escapeHtml(trip.departure_place || "Departure")}
         </div>`
      );
      startMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([trip.departure_lng!, trip.departure_lat!])
        .setPopup(popup)
        .addTo(map);
    }

    // End marker (B)
    if (hasEnd) {
      const el = document.createElement("div");
      el.style.cssText = `
        width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
        background: hsl(0 84% 60%); color: #fff; border: 3px solid #fff;
        border-radius: 50%; font-weight: 700; font-size: 13px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35); cursor: pointer;
      `;
      el.textContent = "B";
      const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(
        `<div style="padding:8px 10px;font-size:12px;font-weight:600;background:hsl(var(--popover));color:hsl(var(--popover-foreground));">
           <div style="color:hsl(0 84% 60%);font-size:11px;margin-bottom:2px;">END</div>
           ${escapeHtml(trip.destination || "Destination")}
         </div>`
      );
      endMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([trip.destination_lng!, trip.destination_lat!])
        .setPopup(popup)
        .addTo(map);
    }

    // Vehicle marker (animated). Start at departure.
    if (coords && coords.length >= 2) {
      const el = document.createElement("div");
      el.style.cssText = `
        width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
        background: hsl(217 91% 55%); color: #fff; border: 3px solid #fff;
        border-radius: 50%; box-shadow: 0 4px 14px rgba(59,130,246,0.55);
        transition: box-shadow 0.2s ease;
      `;
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>`;
      vehicleMarkerRef.current = new maplibregl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat(coords[0] as [number, number])
        .addTo(map);
    }

    // Fit bounds to the route
    if (coords && coords.length >= 2) {
      const bounds = new maplibregl.LngLatBounds();
      coords.forEach((c) => bounds.extend(c as [number, number]));
      map.fitBounds(bounds, { padding: 80, duration: 600, maxZoom: 14 });
    }
  }, [
    mapReady,
    trip,
    routeGeometry,
    routeFailed,
    hasStart,
    hasEnd,
    hasBothPoints,
  ]);

  // Update vehicle marker position when progress changes
  useEffect(() => {
    const marker = vehicleMarkerRef.current;
    const coords =
      routeGeometry ??
      (hasBothPoints && trip
        ? [
            [trip.departure_lng!, trip.departure_lat!],
            [trip.destination_lng!, trip.destination_lat!],
          ]
        : null);
    if (!marker || !coords || coords.length < 2) return;
    const pos = interpolateAlongPath(coords as [number, number][], progress);
    marker.setLngLat(pos);
  }, [progress, routeGeometry, hasBothPoints, trip]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    lastTickRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      // Base trip duration: 30 seconds at 1x speed
      const baseDuration = 30;
      const delta = (dt * speed) / baseDuration;
      setProgress((prev) => {
        const next = prev + delta;
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, speed]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((p) => {
      if (!p && progress >= 1) {
        setProgress(0);
        return true;
      }
      return !p;
    });
  }, [progress]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
  }, []);

  if (!trip) return null;

  const startTs = trip.driver_checked_in_at || trip.needed_from;
  const endTs = trip.driver_checked_out_at || trip.needed_until;
  const odoDistance =
    trip.driver_checkin_odometer != null && trip.driver_checkout_odometer != null
      ? Math.max(
          0,
          Number(trip.driver_checkout_odometer) -
            Number(trip.driver_checkin_odometer)
        )
      : null;
  const displayKm = odoDistance ?? routeKm;

  return (
    <div className="absolute inset-0">
      {/* Map fills entire area */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Top banner — explains why this view is showing */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-start gap-2 pointer-events-none">
        <Card className="bg-card/95 backdrop-blur border-warning/40 shadow-lg pointer-events-auto">
          <CardContent className="p-3 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold leading-tight">
                Trip overview · No GPS telemetry
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                Showing planned route from manifest for{" "}
                <span className="font-medium text-foreground">
                  {selectedDateLabel}
                </span>
                {vehiclePlate ? (
                  <>
                    {" "}·{" "}
                    <span className="font-medium text-foreground">
                      {vehiclePlate}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Trip selector when multiple trips */}
        {trips.length > 1 && (
          <Card className="bg-card/95 backdrop-blur shadow-lg ml-auto pointer-events-auto">
            <CardContent className="p-2 flex items-center gap-2">
              <RouteIcon className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                Trip
              </span>
              <Select
                value={selectedTripId}
                onValueChange={setSelectedTripId}
              >
                <SelectTrigger className="h-8 min-w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((t, i) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      <span className="font-mono mr-2">
                        #{i + 1}
                      </span>
                      {t.request_number || t.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom info + playback control bar */}
      <Card className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[640px] max-w-[calc(100%-3rem)] bg-card/95 backdrop-blur z-10 shadow-xl">
        <CardContent className="p-4 space-y-3">
          {/* Trip header row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            <Badge
              variant="outline"
              className="font-mono text-[11px] gap-1.5"
            >
              <Navigation className="h-3 w-3" />
              {trip.request_number || "Trip"}
            </Badge>
            <Badge
              variant={trip.status === "completed" ? "default" : "secondary"}
              className="capitalize text-[10px]"
            >
              {String(trip.status || "scheduled").replace(/_/g, " ")}
            </Badge>
            {trip.driver_name && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" />
                {trip.driver_name}
              </span>
            )}
            <div className="ml-auto flex items-center gap-3 text-muted-foreground">
              {startTs && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(parseISO(startTs), "HH:mm")}
                </span>
              )}
              {endTs && (
                <>
                  <span className="opacity-60">→</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(endTs), "HH:mm")}
                  </span>
                </>
              )}
              {displayKm != null && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <RouteIcon className="h-3 w-3" />
                  {displayKm.toFixed(1)} km
                </span>
              )}
              {routeMin != null && (
                <span className="text-muted-foreground">
                  ~{Math.round(routeMin)} min
                </span>
              )}
            </div>
          </div>

          {/* Route labels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-start gap-2 rounded-md bg-success/10 border border-success/30 px-2.5 py-1.5">
              <div className="w-5 h-5 rounded-full bg-success text-success-foreground flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                A
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Start
                </p>
                <p className="font-medium truncate">
                  {trip.departure_place || "Departure point"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-2.5 py-1.5">
              <div className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                B
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  End
                </p>
                <p className="font-medium truncate">
                  {trip.destination || "Destination"}
                </p>
              </div>
            </div>
          </div>

          {/* Playback controls */}
          {hasBothPoints && (
            <div className="space-y-2 pt-1">
              {/* Progress bar */}
              <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-primary transition-[width]"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  className="h-8 w-8 p-0"
                  aria-label="Reset"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={handlePlayPause}
                  className="h-8 gap-1.5"
                  disabled={routeLoading}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      {progress >= 1 ? "Replay" : "Animate trip"}
                    </>
                  )}
                </Button>
                <Select
                  value={String(speed)}
                  onValueChange={(v) => setSpeed(Number(v))}
                >
                  <SelectTrigger className="h-8 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYBACK_SPEEDS.map((s) => (
                      <SelectItem key={s} value={String(s)} className="text-xs">
                        {s}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                  {Math.round(progress * 100)}%
                  {routeFailed && (
                    <span className="ml-2 text-warning">
                      · straight-line estimate
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {!hasBothPoints && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-2.5 py-1.5">
              <MapPin className="h-3.5 w-3.5" />
              This trip is missing {!hasStart && !hasEnd
                ? "start and end coordinates"
                : !hasStart
                  ? "start coordinates"
                  : "end coordinates"}{" "}
              — animation unavailable.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default TripOverviewMap;
