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
import { Badge } from "@/components/ui/badge";
import { MapPin, Route, Ruler } from "lucide-react";

export interface RoutePoint {
  lat: number | null;
  lng: number | null;
  label?: string;
}

interface RouteMapPreviewProps {
  departure?: RoutePoint;
  destination?: RoutePoint;
  stops?: RoutePoint[];
  /** Optional explicit height. Defaults to 240px. */
  heightPx?: number;
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

  // Build the ordered list of valid points
  const orderedPoints: Array<RoutePoint & { kind: "departure" | "stop" | "destination"; index?: number }> = [];
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

  // Fetch the real driving route from OSRM whenever the ordered points change.
  // OSRM public demo server: https://router.project-osrm.org
  // Returns full geometry (geojson) so we can draw the actual road path.
  useEffect(() => {
    const valid = orderedPoints.filter((p) => p.lat != null && p.lng != null);
    if (valid.length < 2) {
      setRouteGeometry(null);
      setRouteKm(null);
      setRouteMin(null);
      setRouteFailed(false);
      return;
    }
    const coordsParam = valid.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    setRouteLoading(true);
    setRouteFailed(false);
    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`OSRM ${r.status}`))))
      .then((json) => {
        const route = json?.routes?.[0];
        const coords: [number, number][] | undefined = route?.geometry?.coordinates;
        if (coords && coords.length >= 2) {
          setRouteGeometry(coords);
          setRouteKm(route.distance ? route.distance / 1000 : null);
          setRouteMin(route.duration ? route.duration / 60 : null);
        } else {
          setRouteGeometry(null);
          setRouteFailed(true);
        }
      })
      .catch(() => {
        setRouteGeometry(null);
        setRouteFailed(true);
      })
      .finally(() => setRouteLoading(false));

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

    // Render markers
    orderedPoints.forEach((p) => {
      if (p.lat == null || p.lng == null) return;
      const el = document.createElement("div");
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.width = "26px";
      el.style.height = "26px";
      el.style.borderRadius = "50%";
      el.style.fontSize = "11px";
      el.style.fontWeight = "700";
      el.style.color = "#fff";
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
      el.style.border = "2px solid #fff";
      if (p.kind === "departure") {
        el.style.background = "hsl(142 71% 45%)"; // emerald
        el.textContent = "A";
      } else if (p.kind === "destination") {
        el.style.background = "hsl(0 84% 60%)"; // red
        el.textContent = "B";
      } else {
        el.style.background = "hsl(38 92% 50%)"; // amber
        el.textContent = String(p.index ?? "·");
      }
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14, closeButton: false }).setText(
            p.label || (p.kind === "departure" ? "Departure" : p.kind === "destination" ? "Destination" : `Stop ${p.index}`)
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
  ]);

  const hasAny = orderedPoints.length > 0;

  return (
    <div className="relative rounded-lg border border-border bg-muted/20 overflow-hidden">
      <div
        ref={containerRef}
        style={{ height: heightPx }}
        className="w-full bg-muted/40"
        aria-label="Trip route preview map"
      />
      {!hasAny && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-md bg-background/85 backdrop-blur px-3 py-2 text-xs text-muted-foreground border flex items-center gap-1.5 shadow-sm">
            <Route className="w-3.5 h-3.5 text-primary" />
            Pick a Departure or Destination above to see the route.
          </div>
        </div>
      )}

      {/* Legend + distance overlay */}
      {hasAny && (
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 rounded-md bg-background/90 backdrop-blur px-2 py-1 text-[11px] border shadow-sm">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white bg-emerald-500">A</span>
            <span className="text-muted-foreground">Departure</span>
            {stops.some((s) => s.lat != null) && (
              <>
                <span className="mx-1 text-muted-foreground/40">·</span>
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white bg-amber-500">#</span>
                <span className="text-muted-foreground">Stops</span>
              </>
            )}
            <span className="mx-1 text-muted-foreground/40">·</span>
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white bg-destructive">B</span>
            <span className="text-muted-foreground">Destination</span>
          </div>
          {totalKm > 0 && (
            <Badge variant="secondary" className="self-start gap-1 text-[11px] font-medium shadow-sm">
              <Ruler className="w-3 h-3" />
              ~{totalKm.toFixed(1)} km straight-line
            </Badge>
          )}
        </div>
      )}
      {hasAny && (orderedPoints.length === 1) && (
        <div className="absolute bottom-2 right-2">
          <Badge variant="outline" className="bg-background/85 backdrop-blur text-[10px] gap-1">
            <MapPin className="w-3 h-3" />
            {orderedPoints[0].kind === "departure" ? "Pick a destination to draw the route" : "Pick a departure to draw the route"}
          </Badge>
        </div>
      )}
    </div>
  );
}
