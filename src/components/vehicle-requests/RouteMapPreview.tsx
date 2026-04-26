/**
 * RouteMapPreview
 * ----------------
 * Inline read-only map that visualises the trip route the requester is
 * composing: green pin for departure, amber numbered pins for ordered
 * intermediate stops, red pin for the final destination, plus a connecting
 * dashed line and an "estimated straight-line distance" badge.
 *
 * Used in the Vehicle Request form (Route tab). Pure presentational —
 * receives coordinates and renders them; never mutates form state.
 */
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getPreviewSafeMapStyle } from "@/lib/lemat";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { MapPin, Route, Ruler } from "lucide-react";

export interface RoutePoint {
  lat: number | null;
  lng: number | null;
  label?: string;
}

export interface GeofenceOverlay {
  id: string;
  name: string;
  geometry_type: "circle" | "polygon" | string;
  center_lat?: number | null;
  center_lng?: number | null;
  radius_meters?: number | null;
  polygon_points?: Array<{ lat: number; lng: number }> | null;
}

interface RouteMapPreviewProps {
  departure?: RoutePoint;
  destination?: RoutePoint;
  stops?: RoutePoint[];
  /** Optional explicit height. Defaults to 240px. */
  heightPx?: number;
  /** Optional active geofences to overlay on the map. */
  geofences?: GeofenceOverlay[];
}

type RoutePointKind = "departure" | "stop" | "destination";

type RoutePointWithKind = RoutePoint & { kind: RoutePointKind; index?: number };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPointLabel(point: RoutePointWithKind): string {
  const trimmed = point.label?.trim();
  if (trimmed) return trimmed;
  if (point.kind === "departure") return "Departure";
  if (point.kind === "destination") return "Destination";
  return `Stop ${point.index}`;
}

function isPlaceholderPointLabel(point: RoutePointWithKind): boolean {
  const trimmed = point.label?.trim();
  if (!trimmed) return true;
  if (/^pinned location$/i.test(trimmed)) return true;
  if (point.kind === "stop" && new RegExp(`^stop\\s+${point.index}$`, "i").test(trimmed)) return true;
  return false;
}

function getPointKey(point: RoutePointWithKind): string {
  return `${point.kind}:${point.index ?? 0}:${point.lat?.toFixed(6) ?? "na"}:${point.lng?.toFixed(6) ?? "na"}`;
}

function getDisplayPointLabel(point: RoutePointWithKind, resolvedLabels: Record<string, string>): string {
  const resolved = resolvedLabels[getPointKey(point)]?.trim();
  if (resolved) return resolved;
  return getPointLabel(point);
}

interface PopupSegmentInfo {
  /** Distance (km) of the leg arriving at this point. null for the departure. */
  arriveKm: number | null;
  /** Duration (minutes) of the leg arriving at this point. null for the departure. */
  arriveMin: number | null;
  /** Distance (km) of the leg leaving this point. null for the destination. */
  departKm: number | null;
}

function formatKm(km: number | null): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m`;
  return `${km.toFixed(1)} km`;
}

function formatMin(min: number | null): string | null {
  if (min == null || !Number.isFinite(min)) return null;
  return `~${Math.max(1, Math.round(min))} min`;
}

function buildPopupHtml(label: string, info?: PopupSegmentInfo): string {
  const arriveKm = formatKm(info?.arriveKm ?? null);
  const arriveMin = formatMin(info?.arriveMin ?? null);
  const departKm = formatKm(info?.departKm ?? null);

  const segmentRows: string[] = [];
  if (arriveKm) {
    segmentRows.push(
      `<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:hsl(var(--muted-foreground));">
         <span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:hsl(217 91% 55%);"></span>
         <span>From previous: <strong style="color:hsl(var(--popover-foreground));">${escapeHtml(arriveKm)}</strong>${arriveMin ? ` · ${escapeHtml(arriveMin)}` : ""}</span>
       </div>`,
    );
  }
  if (departKm) {
    segmentRows.push(
      `<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:hsl(var(--muted-foreground));">
         <span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:hsl(142 71% 45%);"></span>
         <span>To next: <strong style="color:hsl(var(--popover-foreground));">${escapeHtml(departKm)}</strong></span>
       </div>`,
    );
  }

  const segmentBlock =
    segmentRows.length > 0
      ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid hsl(var(--border));display:flex;flex-direction:column;gap:4px;">${segmentRows.join("")}</div>`
      : "";

  return `
    <div
      style="
        min-width: 200px;
        max-width: 280px;
        padding: 10px 12px;
        background: hsl(var(--popover));
        color: hsl(var(--popover-foreground));
        font-family: inherit;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.45;
        white-space: normal;
        word-break: break-word;
      "
    >
      <div style="font-weight:600;">${escapeHtml(label)}</div>
      ${segmentBlock}
    </div>
  `;
}

function buildPopupHtmlSimple(label: string): string {
  return `
    <div
      style="
        min-width: 180px;
        max-width: 280px;
        padding: 10px 12px;
        background: hsl(var(--popover));
        color: hsl(var(--popover-foreground));
        font-family: inherit;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.45;
        white-space: normal;
        word-break: break-word;
      "
    >
      ${escapeHtml(label)}
    </div>
  `;
}

/** Haversine distance in km between two lat/lng points. */
function haversineKm(a: RoutePoint, b: RoutePoint): number | null {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

export function RouteMapPreview({
  departure,
  destination,
  stops = [],
  heightPx = 240,
}: RouteMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  // Real driving route (fetched from OSRM). null = not loaded / falls back to straight line.
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [routeKm, setRouteKm] = useState<number | null>(null);
  const [routeMin, setRouteMin] = useState<number | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeFailed, setRouteFailed] = useState(false);
  // Per-leg distance/duration returned by the routing engine. legs[i] is the
  // segment FROM orderedPoints[i] TO orderedPoints[i+1].
  const [routeLegs, setRouteLegs] = useState<{ distance_m: number; duration_s: number }[]>([]);
  const [resolvedLabels, setResolvedLabels] = useState<Record<string, string>>({});

  // Build the ordered list of valid points
  const orderedPoints: RoutePointWithKind[] = [];
  if (departure?.lat != null && departure?.lng != null) {
    orderedPoints.push({ ...departure, kind: "departure" });
  }
  stops.forEach((s, i) => {
    if (s?.lat != null && s?.lng != null) {
      orderedPoints.push({ ...s, kind: "stop", index: i + 1 });
    }
  });
  if (destination?.lat != null && destination?.lng != null) {
    orderedPoints.push({ ...destination, kind: "destination" });
  }

  // Total estimated straight-line distance (used as fallback when routing unavailable)
  const totalKm = orderedPoints.reduce((sum, _p, i) => {
    if (i === 0) return 0;
    const d = haversineKm(orderedPoints[i - 1], orderedPoints[i]);
    return d != null ? sum + d : sum;
  }, 0);

  useEffect(() => {
    const pointsNeedingLabels = orderedPoints.filter(
      (point) =>
        point.lat != null &&
        point.lng != null &&
        isPlaceholderPointLabel(point) &&
        !resolvedLabels[getPointKey(point)],
    );

    if (pointsNeedingLabels.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session || cancelled) return;

        const nextEntries = await Promise.all(
          pointsNeedingLabels.map(async (point) => {
            const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lemat-reverse-geocode?lat=${point.lat!.toFixed(6)}&lon=${point.lng!.toFixed(6)}`;
            try {
              const res = await fetch(url, {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  "Accept-Language": "en",
                },
              });
              if (!res.ok) return null;

              const json = await res.json();
              const addr = json?.address || {};
              const derived =
                json?.display_name ||
                json?.name ||
                [
                  addr.road || addr.pedestrian,
                  addr.neighbourhood || addr.suburb,
                  addr.city || addr.town || addr.village,
                ]
                  .filter(Boolean)
                  .join(", ");

              const label = typeof derived === "string" ? derived.trim() : "";
              if (!label) return null;
              return [getPointKey(point), label] as const;
            } catch {
              return null;
            }
          }),
        );

        if (cancelled) return;

        const validEntries = nextEntries.filter((entry): entry is readonly [string, string] => Boolean(entry));
        if (validEntries.length === 0) return;

        setResolvedLabels((prev) => {
          const next = { ...prev };
          validEntries.forEach(([key, value]) => {
            next[key] = value;
          });
          return next;
        });
      } catch {
        // Non-blocking: popups will fall back to the provided labels.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderedPoints, resolvedLabels]);

  // Fetch the real driving route via the `route-directions` edge function.
  // The function proxies OSRM server-side so we avoid browser CORS / mixed-content
  // issues that block calls from the Lovable preview origin.
  useEffect(() => {
    const valid = orderedPoints.filter((p) => p.lat != null && p.lng != null);
    if (valid.length < 2) {
      setRouteGeometry(null);
      setRouteKm(null);
      setRouteMin(null);
      setRouteFailed(false);
      return;
    }
    const coordinates = valid.map((p) => [p.lng as number, p.lat as number]);
    const controller = new AbortController();
    setRouteLoading(true);
    setRouteFailed(false);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("route-directions", {
          body: { coordinates },
        });
        if (controller.signal.aborted) return;
        if (error || !data?.ok || !Array.isArray(data?.geometry) || data.geometry.length < 2) {
          setRouteGeometry(null);
          setRouteLegs([]);
          setRouteFailed(true);
          return;
        }
        setRouteGeometry(data.geometry as [number, number][]);
        setRouteKm(typeof data.distance_m === "number" ? data.distance_m / 1000 : null);
        setRouteMin(typeof data.duration_s === "number" ? data.duration_s / 60 : null);
        setRouteLegs(
          Array.isArray(data.legs)
            ? data.legs.map((l: any) => ({
                distance_m: Number(l?.distance_m) || 0,
                duration_s: Number(l?.duration_s) || 0,
              }))
            : [],
        );
      } catch {
        if (!controller.signal.aborted) {
          setRouteGeometry(null);
          setRouteLegs([]);
          setRouteFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) setRouteLoading(false);
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    departure?.lat,
    departure?.lng,
    destination?.lat,
    destination?.lng,
    JSON.stringify(stops?.map((s) => [s.lat, s.lng])),
  ]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initial = orderedPoints[0];
    const center: [number, number] =
      initial && initial.lat != null && initial.lng != null
        ? [initial.lng, initial.lat]
        : [38.7525, 9.0192]; // Addis fallback

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getPreviewSafeMapStyle("streets"),
      center,
      zoom: 11,
      attributionControl: false,
      interactive: true,
      cooperativeGestures: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.resize();
      setReady(true);
    });
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers + route line whenever points change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Detect overlapping coordinates so we can spread markers apart visually.
    // Two points are "overlapping" if their lat/lng differ by < ~10 m (~0.0001°).
    const OVERLAP_DEG = 0.0001;
    const overlapKey = (lat: number, lng: number) =>
      `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const overlapGroups = new Map<string, number>();
    orderedPoints.forEach((p) => {
      if (p.lat == null || p.lng == null) return;
      const key = overlapKey(p.lat, p.lng);
      overlapGroups.set(key, (overlapGroups.get(key) ?? 0) + 1);
    });

    // Render markers — draw Departure/Destination first, STOPS on top so they
    // remain visible when placed near another pin.
    const haveLegs = routeLegs.length === Math.max(0, orderedPoints.length - 1) && routeLegs.length > 0;
    const renderOrder = orderedPoints
      .map((p, idx) => ({ p, idx }))
      .sort((a, b) => {
        const rank = (k: string) => (k === "stop" ? 2 : 1);
        return rank(a.p.kind) - rank(b.p.kind);
      });

    // Track per-overlap-group placement counter so multiple coincident pins
    // get fanned out around the shared point in a small circle.
    const overlapCursor = new Map<string, number>();

    renderOrder.forEach(({ p, idx }) => {
      if (p.lat == null || p.lng == null) return;
      const popupLabel = getDisplayPointLabel(p, resolvedLabels);
      const popupInfo: PopupSegmentInfo = haveLegs
        ? {
            arriveKm: idx > 0 ? routeLegs[idx - 1].distance_m / 1000 : null,
            arriveMin: idx > 0 ? routeLegs[idx - 1].duration_s / 60 : null,
            departKm: idx < routeLegs.length ? routeLegs[idx].distance_m / 1000 : null,
          }
        : { arriveKm: null, arriveMin: null, departKm: null };

      // If this point overlaps with another, fan it out by a small pixel offset
      // (kept on the marker DOM element so the underlying coordinate stays exact).
      const key = overlapKey(p.lat, p.lng);
      const groupSize = overlapGroups.get(key) ?? 1;
      const cursor = overlapCursor.get(key) ?? 0;
      overlapCursor.set(key, cursor + 1);
      const needsFan = groupSize > 1;
      let pxX = 0;
      let pxY = 0;
      if (needsFan) {
        // Spread up to 6 markers around a 22px radius circle.
        const angle = (cursor / Math.max(groupSize, 1)) * Math.PI * 2 - Math.PI / 2;
        const radius = 22;
        pxX = Math.cos(angle) * radius;
        pxY = Math.sin(angle) * radius;
      }

      const el = document.createElement("div");
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.borderRadius = "50%";
      el.style.fontWeight = "700";
      el.style.color = "#fff";
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.35)";
      el.style.border = "2px solid #fff";
      el.style.cursor = "pointer";
      el.style.transition = "transform 120ms ease";
      if (p.kind === "departure") {
        el.style.width = "26px";
        el.style.height = "26px";
        el.style.fontSize = "11px";
        el.style.background = "hsl(142 71% 45%)";
        el.style.zIndex = "2";
        el.textContent = "A";
      } else if (p.kind === "destination") {
        el.style.width = "26px";
        el.style.height = "26px";
        el.style.fontSize = "11px";
        el.style.background = "hsl(0 84% 60%)";
        el.style.zIndex = "3";
        el.textContent = "B";
      } else {
        el.style.width = "28px";
        el.style.height = "28px";
        el.style.fontSize = "11px";
        el.style.background = "hsl(38 92% 50%)";
        el.style.border = "2.5px solid #fff";
        el.style.boxShadow = "0 3px 8px rgba(0,0,0,0.4)";
        el.style.zIndex = "10";
        el.textContent = String(p.index ?? "·");
      }
      const marker = new maplibregl.Marker({ element: el, offset: [pxX, pxY] })
        .setLngLat([p.lng, p.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14, closeButton: false, maxWidth: "300px" }).setHTML(
            buildPopupHtml(popupLabel, popupInfo)
          )
        )
        .addTo(map);
      markersRef.current.push(marker);
    });

    // Render route line: prefer real driving geometry from OSRM, fall back to
    // the dashed straight-line connector when routing isn't available yet.
    const straightLineCoords = orderedPoints
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => [p.lng as number, p.lat as number] as [number, number]);

    const ROUTE_SOURCE = "vr-route-line";
    const ROUTE_LAYER = "vr-route-line-layer";
    const ROUTE_CASING_LAYER = "vr-route-line-casing";

    const removeRouteLayer = () => {
      try {
        if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER);
        if (map.getLayer(ROUTE_CASING_LAYER)) map.removeLayer(ROUTE_CASING_LAYER);
        if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE);
      } catch {
        /* noop */
      }
    };
    removeRouteLayer();

    const useRealRoute = !!(routeGeometry && routeGeometry.length >= 2);
    const drawnCoords: [number, number][] | null = useRealRoute
      ? routeGeometry
      : straightLineCoords.length >= 2
        ? straightLineCoords
        : null;

    if (drawnCoords) {
      map.addSource(ROUTE_SOURCE, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: drawnCoords },
        },
      });
      // Soft white casing under the real route for readability
      if (useRealRoute) {
        map.addLayer({
          id: ROUTE_CASING_LAYER,
          type: "line",
          source: ROUTE_SOURCE,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": 7,
            "line-opacity": 0.9,
          },
        });
      }
      map.addLayer({
        id: ROUTE_LAYER,
        type: "line",
        source: ROUTE_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: useRealRoute
          ? {
              "line-color": "hsl(217 91% 55%)",
              "line-width": 4.5,
              "line-opacity": 0.95,
            }
          : {
              "line-color": "hsl(217 91% 60%)",
              "line-width": 4,
              "line-opacity": 0.85,
              "line-dasharray": [2, 1.5],
            },
      });
    }

    // Auto-fit bounds — include the full route geometry if we have it so the
    // entire driving path is visible, not just the markers.
    if (orderedPoints.length === 1 && !useRealRoute) {
      const only = orderedPoints[0];
      map.flyTo({ center: [only.lng as number, only.lat as number], zoom: 13, essential: true });
    } else if (orderedPoints.length >= 2 || useRealRoute) {
      const bounds = new maplibregl.LngLatBounds();
      orderedPoints.forEach((p) => {
        if (p.lat != null && p.lng != null) bounds.extend([p.lng, p.lat]);
      });
      if (useRealRoute) {
        routeGeometry!.forEach((c) => bounds.extend(c));
      }
      try {
        map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 600 });
      } catch {
        /* noop */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    departure?.lat,
    departure?.lng,
    destination?.lat,
    destination?.lng,
    JSON.stringify(stops?.map((s) => [s.lat, s.lng])),
    routeGeometry,
    routeLegs,
    resolvedLabels,
  ]);

  const hasAny = orderedPoints.length > 0;
  const hasStops = stops.some((s) => s.lat != null && s.lng != null);

  // Detect stops that overlap (within ~10m) another waypoint — flag for the
  // user so they understand why a marker may look "missing" on the map.
  const overlapWarnings: string[] = [];
  stops.forEach((s, i) => {
    if (s.lat == null || s.lng == null) return;
    const matches: string[] = [];
    if (departure?.lat != null && departure?.lng != null &&
        Math.abs(departure.lat - s.lat) < 0.0001 && Math.abs(departure.lng - s.lng) < 0.0001) {
      matches.push("Departure");
    }
    if (destination?.lat != null && destination?.lng != null &&
        Math.abs(destination.lat - s.lat) < 0.0001 && Math.abs(destination.lng - s.lng) < 0.0001) {
      matches.push("Destination");
    }
    stops.forEach((other, j) => {
      if (j <= i || other.lat == null || other.lng == null) return;
      if (Math.abs(other.lat - s.lat) < 0.0001 && Math.abs(other.lng - s.lng) < 0.0001) {
        matches.push(`Stop ${j + 1}`);
      }
    });
    if (matches.length > 0) {
      overlapWarnings.push(`Stop ${i + 1} is at the same location as ${matches.join(" & ")}`);
    }
  });

  // Distance summary string for the compact top-left pill.
  let distanceLabel: string | null = null;
  let distanceTone: "road" | "loading" | "straight" | null = null;
  if (routeKm != null) {
    distanceLabel = `${routeKm.toFixed(1)} km${routeMin != null ? ` · ~${Math.max(1, Math.round(routeMin))} min` : ""}`;
    distanceTone = "road";
  } else if (routeLoading) {
    distanceLabel = "Calculating route…";
    distanceTone = "loading";
  } else if (totalKm > 0) {
    distanceLabel = `~${totalKm.toFixed(1)} km straight-line`;
    distanceTone = "straight";
  }

  return (
    <div className="relative rounded-lg border border-border bg-muted/20 overflow-hidden">
      <div
        ref={containerRef}
        style={{ height: heightPx }}
        className="w-full bg-muted/40"
        aria-label="Trip route preview map"
      />

      {/* Empty state */}
      {!hasAny && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-md bg-background/85 backdrop-blur px-3 py-2 text-xs text-muted-foreground border flex items-center gap-1.5 shadow-sm">
            <Route className="w-3.5 h-3.5 text-primary" />
            Pick a Departure or Destination above to see the route.
          </div>
        </div>
      )}

      {/* Compact top toolbar — legend + distance combined into one pill */}
      {hasAny && (
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 pointer-events-none">
          <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-background/90 backdrop-blur px-2.5 py-1 text-[11px] border shadow-sm pointer-events-auto">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white" style={{ background: "hsl(142 71% 45%)" }}>A</span>
            {hasStops && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white" style={{ background: "hsl(38 92% 50%)" }}>#</span>
            )}
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white" style={{ background: "hsl(0 84% 60%)" }}>B</span>
            {distanceLabel && (
              <>
                <span className="mx-0.5 text-muted-foreground/40">·</span>
                {distanceTone === "road" && <Route className="w-3 h-3 text-primary" />}
                {distanceTone === "loading" && <Route className="w-3 h-3 text-muted-foreground animate-pulse" />}
                {distanceTone === "straight" && <Ruler className="w-3 h-3 text-muted-foreground" />}
                <span className="text-foreground font-medium">{distanceLabel}</span>
                {distanceTone === "straight" && routeFailed && (
                  <span className="text-muted-foreground/70">· road route unavailable</span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Single-point hint */}
      {hasAny && orderedPoints.length === 1 && (
        <div className="absolute bottom-2 right-2">
          <Badge variant="outline" className="bg-background/85 backdrop-blur text-[10px] gap-1">
            <MapPin className="w-3 h-3" />
            {orderedPoints[0].kind === "departure" ? "Pick a destination to draw the route" : "Pick a departure to draw the route"}
          </Badge>
        </div>
      )}

      {/* Overlap warning — friendly hint when a stop sits on top of another waypoint */}
      {overlapWarnings.length > 0 && (
        <div className="absolute bottom-2 right-2 max-w-[55%]">
          <div className="rounded-md border border-warning/40 bg-warning/10 backdrop-blur px-2.5 py-1.5 text-[11px] shadow-sm flex items-start gap-1.5">
            <MapPin className="w-3 h-3 text-warning shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {overlapWarnings.slice(0, 2).map((msg, i) => (
                <div key={i} className="text-foreground/90 leading-tight">{msg}</div>
              ))}
              {overlapWarnings.length > 2 && (
                <div className="text-muted-foreground">+{overlapWarnings.length - 2} more</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collapsible per-segment breakdown — bottom-left, opens on click */}
      {hasAny && routeLegs.length >= 2 && routeLegs.length === orderedPoints.length - 1 && (
        <details className="absolute bottom-2 left-2 max-w-[55%] group">
          <summary className="list-none cursor-pointer rounded-full bg-background/90 backdrop-blur px-2.5 py-1 text-[11px] border shadow-sm flex items-center gap-1.5 select-none hover:bg-background">
            <Route className="w-3 h-3 text-primary" />
            <span className="font-medium text-foreground">{routeLegs.length} segments</span>
            <span className="text-muted-foreground group-open:hidden">· tap to expand</span>
            <span className="text-muted-foreground hidden group-open:inline">· tap to hide</span>
          </summary>
          <div className="mt-1.5 rounded-md border bg-background/95 backdrop-blur shadow-md px-2.5 py-2 text-[11px] space-y-1 max-h-44 overflow-auto">
            {routeLegs.map((leg, i) => {
              const from = getPointLabel(orderedPoints[i]);
              const to = getPointLabel(orderedPoints[i + 1]);
              const km = formatKm(leg.distance_m / 1000);
              const min = formatMin(leg.duration_s / 60);
              return (
                <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-white shrink-0" style={{ background: "hsl(217 91% 55%)" }}>
                    {i + 1}
                  </span>
                  <span className="truncate text-foreground/90" title={`${from} → ${to}`}>
                    {from} → {to}
                  </span>
                  <span className="ml-auto pl-2 font-medium text-foreground whitespace-nowrap">
                    {km}{min ? ` · ${min}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
