/**
 * DriverNavigateMapDialog
 * -----------------------
 * In-app navigation map for the driver. Shows the trip's departure point
 * (green pin), destination (red pin), and — when GPS data is available —
 * the live position of the assigned vehicle (blue pulsing dot, polled
 * every 10s). Draws a driving route between origin and destination via
 * Lemat directions and (optionally) summarises the trip with an AI
 * briefing produced by the `trip-route-ai-insight` edge function.
 *
 * Map style follows the organization-wide default
 * (`organization_settings.default_map_style`) so super-admins can pick
 * "streets" / "satellite" / "dark" once and have it applied everywhere.
 */
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Navigation,
  Loader2,
  ExternalLink,
  Sparkles,
  Radio,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLematApiKey } from "@/hooks/useLematApiKey";
import { useDefaultMapStyle, type MapStyleKey } from "@/hooks/useDefaultMapStyle";

interface Props {
  open: boolean;
  onClose: () => void;
  departurePlace?: string | null;
  departureLat?: number | null;
  departureLng?: number | null;
  destinationPlace?: string | null;
  vehicleId?: string | null;
  vehicleLabel?: string | null;
  departureTime?: string | null;
}

interface ResolvedPoint {
  lat: number;
  lng: number;
  label: string;
}

const STYLE_URL: Record<MapStyleKey, string> = {
  streets: "https://lemat.goffice.et/api/v1/tiles/style?theme=light",
  satellite: "https://lemat.goffice.et/api/v1/tiles/style?theme=satellite",
  dark: "https://lemat.goffice.et/api/v1/tiles/style?theme=dark",
};

// Forward-geocode a free-text place via the existing lemat-search-geocode edge
// function. Returns the first hit or null.
const forwardGeocode = async (q: string): Promise<ResolvedPoint | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lemat-search-geocode?q=${encodeURIComponent(q)}&countrycodes=et&limit=1`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const hit = Array.isArray(json) ? json[0] : json?.results?.[0] || json?.[0];
    if (!hit) return null;
    const lat = Number(hit.lat ?? hit.latitude);
    const lng = Number(hit.lon ?? hit.lng ?? hit.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, label: hit.display_name || q };
  } catch {
    return null;
  }
};

export const DriverNavigateMapDialog = ({
  open,
  onClose,
  departurePlace,
  departureLat,
  departureLng,
  destinationPlace,
  vehicleId,
  vehicleLabel,
  departureTime,
}: Props) => {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const liveMarkerRef = useRef<maplibregl.Marker | null>(null);
  const { ready: lematReady } = useLematApiKey();
  const defaultMapStyle = useDefaultMapStyle();

  const [resolving, setResolving] = useState(false);
  const [origin, setOrigin] = useState<ResolvedPoint | null>(null);
  const [destination, setDestination] = useState<ResolvedPoint | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [livePos, setLivePos] = useState<{ lat: number; lng: number } | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  // Resolve coordinates when the dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setResolving(true);
      setOrigin(null);
      setDestination(null);
      setDistanceKm(null);
      setDurationMin(null);
      setInsight(null);
      setInsightError(null);

      // Origin
      let resolvedOrigin: ResolvedPoint | null = null;
      if (
        departureLat != null &&
        departureLng != null &&
        Number.isFinite(Number(departureLat)) &&
        Number.isFinite(Number(departureLng))
      ) {
        resolvedOrigin = {
          lat: Number(departureLat),
          lng: Number(departureLng),
          label: departurePlace || "Departure",
        };
      } else if (departurePlace?.trim()) {
        resolvedOrigin = await forwardGeocode(departurePlace.trim());
      }

      // Destination
      let resolvedDest: ResolvedPoint | null = null;
      if (destinationPlace?.trim()) {
        resolvedDest = await forwardGeocode(destinationPlace.trim());
      }

      if (!cancelled) {
        setOrigin(resolvedOrigin);
        setDestination(resolvedDest);
        setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, departurePlace, departureLat, departureLng, destinationPlace]);

  // Initialize / tear down the map. Uses a callback ref (`containerEl`) so
  // we wait for the dialog to actually mount the map div before constructing
  // the MapLibre instance — `useRef` was racing the dialog mount and the
  // map sometimes never initialised, leaving an empty box.
  useEffect(() => {
    if (!open) return;
    if (!containerEl || map.current) return;

    map.current = new maplibregl.Map({
      container: containerEl,
      style: STYLE_URL[defaultMapStyle] ?? STYLE_URL.streets,
      center: [38.7578, 9.03], // Addis Ababa default
      zoom: 11,
    });
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    map.current.addControl(new maplibregl.FullscreenControl(), "top-right");

    // After the dialog finishes its open animation, the container size may
    // have changed. Force MapLibre to recompute its viewport.
    const resizeTimer = window.setTimeout(() => {
      try { map.current?.resize(); } catch { /* noop */ }
    }, 250);

    return () => {
      window.clearTimeout(resizeTimer);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      liveMarkerRef.current?.remove();
      liveMarkerRef.current = null;
      map.current?.remove();
      map.current = null;
    };
  }, [open, defaultMapStyle, containerEl]);

  // Poll the latest GPS position for the assigned vehicle every 10s
  useEffect(() => {
    if (!open || !vehicleId) {
      setLivePos(null);
      return;
    }
    let cancelled = false;
    const fetchPos = async () => {
      const { data } = await (supabase as any)
        .from("vehicle_telemetry")
        .select("latitude, longitude, updated_at")
        .eq("vehicle_id", vehicleId)
        .maybeSingle();
      if (cancelled) return;
      const lat = Number(data?.latitude);
      const lng = Number(data?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setLivePos({ lat, lng });
      }
    };
    fetchPos();
    const t = setInterval(fetchPos, 10_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [open, vehicleId]);

  // Render markers + route whenever resolved points change
  useEffect(() => {
    if (!open || !map.current) return;

    const renderEverything = async () => {
      if (!map.current) return;

      // Clear previous markers + route
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (map.current.getLayer("trip-route")) map.current.removeLayer("trip-route");
      if (map.current.getSource("trip-route")) map.current.removeSource("trip-route");

      const points: ResolvedPoint[] = [];
      if (origin) points.push(origin);
      if (destination) points.push(destination);
      if (points.length === 0) return;

      // Add markers
      if (origin) {
        const el = document.createElement("div");
        el.style.cssText =
          "width:18px;height:18px;border-radius:9999px;background:hsl(var(--success));border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);";
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([origin.lng, origin.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14 }).setHTML(
              `<strong>Start</strong><br/>${origin.label}`,
            ),
          )
          .addTo(map.current);
        markersRef.current.push(marker);
      }
      if (destination) {
        const el = document.createElement("div");
        el.style.cssText =
          "width:18px;height:18px;border-radius:9999px;background:hsl(var(--destructive));border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);";
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([destination.lng, destination.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14 }).setHTML(
              `<strong>Destination</strong><br/>${destination.label}`,
            ),
          )
          .addTo(map.current);
        markersRef.current.push(marker);
      }

      // Fit map to all points
      if (points.length === 1) {
        map.current.flyTo({ center: [points[0].lng, points[0].lat], zoom: 14 });
      } else {
        const bounds = new maplibregl.LngLatBounds();
        points.forEach((p) => bounds.extend([p.lng, p.lat]));
        map.current.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 600 });
      }

      // Draw route only when we have both endpoints + Lemat key
      if (origin && destination && lematReady) {
        const apiKey = sessionStorage.getItem("lemat_api_key") || "";
        if (!apiKey) return;
        try {
          const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
          const res = await fetch(
            `https://lemat.goffice.et/api/v1/directions?coords=${coords}&profile=driving`,
            { headers: { "X-Api-Key": apiKey } },
          );
          if (!res.ok) return;
          const json = await res.json();
          const route = json?.data?.routes?.[0];
          if (!route?.geometry?.coordinates) return;

          if (typeof route.distance === "number") {
            setDistanceKm(Math.round((route.distance / 1000) * 10) / 10);
          }
          if (typeof route.duration === "number") {
            setDurationMin(Math.round(route.duration / 60));
          }

          if (!map.current) return;
          const addRoute = () => {
            if (!map.current) return;
            if (map.current.getLayer("trip-route"))
              map.current.removeLayer("trip-route");
            if (map.current.getSource("trip-route"))
              map.current.removeSource("trip-route");
            map.current.addSource("trip-route", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: route.geometry.coordinates,
                },
              },
            });
            map.current.addLayer({
              id: "trip-route",
              type: "line",
              source: "trip-route",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: {
                "line-color": "hsl(217, 91%, 55%)",
                "line-width": 5,
                "line-opacity": 0.85,
              },
            });
          };

          if (map.current.isStyleLoaded()) {
            addRoute();
          } else {
            map.current.once("load", addRoute);
          }
        } catch {
          // route is best-effort; markers already rendered
        }
      }
    };

    // Wait for the map style to be ready before drawing
    if (map.current.isStyleLoaded()) {
      renderEverything();
    } else {
      map.current.once("load", renderEverything);
    }
  }, [open, origin, destination, lematReady]);

  // Render / move the live vehicle marker whenever a new GPS sample arrives
  useEffect(() => {
    if (!open || !map.current || !livePos) return;
    const apply = () => {
      if (!map.current) return;
      if (!liveMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "live-vehicle-pulse";
        el.style.cssText = [
          "width:16px",
          "height:16px",
          "border-radius:9999px",
          "background:hsl(217, 91%, 55%)",
          "border:3px solid white",
          "box-shadow:0 0 0 0 hsla(217, 91%, 55%, 0.7)",
          "animation: live-vehicle-pulse 1.6s ease-out infinite",
        ].join(";");
        liveMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([livePos.lng, livePos.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14 }).setHTML(
              `<strong>Live position</strong><br/>${vehicleLabel || "Vehicle"}`,
            ),
          )
          .addTo(map.current);
      } else {
        liveMarkerRef.current.setLngLat([livePos.lng, livePos.lat]);
      }
    };
    if (map.current.isStyleLoaded()) apply();
    else map.current.once("load", apply);
  }, [open, livePos, vehicleLabel]);

  const requestInsight = async () => {
    if (!origin || !destination) return;
    setInsightLoading(true);
    setInsightError(null);
    setInsight(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trip-route-ai-insight`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          origin,
          destination,
          current: livePos,
          routeDistanceKm: distanceKm,
          routeDurationMin: durationMin,
          vehicleLabel,
          departureTime,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `AI request failed (${res.status})`);
      }
      setInsight(json.insight || "No insight returned.");
    } catch (e: any) {
      setInsightError(e?.message || "Could not generate AI insight");
    } finally {
      setInsightLoading(false);
    }
  };

  const openInGoogleMaps = () => {
    // Prefer resolved coordinates; fall back to free-text places so the
    // button still works while geocoding is in flight or failed.
    let url: string | null = null;
    if (origin && destination) {
      url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
    } else if (origin || destination) {
      const p = (destination || origin)!;
      url = `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
    } else if (departurePlace?.trim() || destinationPlace?.trim()) {
      const dest = destinationPlace?.trim();
      const orig = departurePlace?.trim();
      if (dest && orig) {
        url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(orig)}&destination=${encodeURIComponent(dest)}&travelmode=driving`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((dest || orig)!)}`;
      }
    }
    if (!url) return;
    try {
      const w = (window.top || window).open(url, "_blank", "noopener,noreferrer");
      if (w) return;
    } catch { /* fall through */ }
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      try { window.top!.location.href = url; } catch { window.location.href = url; }
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Trip Navigation
          </DialogTitle>
          <DialogDescription>
            Start point, destination, and live vehicle position on the map.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-success/30 bg-success/5 p-2 flex items-start gap-2">
            <span className="mt-1 inline-block w-2.5 h-2.5 rounded-full bg-success shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase text-muted-foreground">Start</p>
              <p className="font-medium truncate">
                {origin?.label || departurePlace || "—"}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 flex items-start gap-2">
            <span className="mt-1 inline-block w-2.5 h-2.5 rounded-full bg-destructive shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase text-muted-foreground">Destination</p>
              <p className="font-medium truncate">
                {destination?.label || destinationPlace || "—"}
              </p>
            </div>
          </div>
        </div>

        {(distanceKm != null || durationMin != null || livePos) && (
          <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
            {distanceKm != null && (
              <span>Distance: <strong className="text-foreground">{distanceKm} km</strong></span>
            )}
            {durationMin != null && (
              <span>ETA: <strong className="text-foreground">~{durationMin} min</strong></span>
            )}
            {livePos && (
              <span className="inline-flex items-center gap-1 text-primary">
                <Radio className="w-3 h-3 animate-pulse" /> Live GPS connected
              </span>
            )}
          </div>
        )}

        {/* AI insight panel */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" /> AI Route Insight
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={requestInsight}
              disabled={insightLoading || !origin || !destination}
              className="h-7 text-xs"
            >
              {insightLoading ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Thinking…</>
              ) : insight ? "Regenerate" : "Generate briefing"}
            </Button>
          </div>
          {insightError && (
            <p className="text-xs text-destructive">{insightError}</p>
          )}
          {insight ? (
            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
              {insight}
            </p>
          ) : !insightError ? (
            <p className="text-xs text-muted-foreground">
              Generate a professional travel briefing — typical traffic, road
              conditions, and refined ETA — based on the routed path
              {livePos ? " and live vehicle position." : "."}
            </p>
          ) : null}
        </div>

        <div className="relative flex-1 min-h-[420px] rounded-lg overflow-hidden border">
          <div ref={setContainerEl} className="absolute inset-0" />
          {(resolving || (!origin && !destination)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              {resolving ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resolving locations…
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  No location data available for this trip.
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={openInGoogleMaps}
            disabled={!origin && !destination && !departurePlace?.trim() && !destinationPlace?.trim()}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" /> Open in Google Maps
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>

        {/* Live vehicle pulse animation keyframes (scoped via tag) */}
        <style>{`
          @keyframes live-vehicle-pulse {
            0%   { box-shadow: 0 0 0 0 hsla(217, 91%, 55%, 0.55); }
            70%  { box-shadow: 0 0 0 14px hsla(217, 91%, 55%, 0); }
            100% { box-shadow: 0 0 0 0 hsla(217, 91%, 55%, 0); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default DriverNavigateMapDialog;
