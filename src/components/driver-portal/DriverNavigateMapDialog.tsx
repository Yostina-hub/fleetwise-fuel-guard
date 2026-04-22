/**
 * DriverNavigateMapDialog
 * -----------------------
 * In-app navigation map for the driver. Shows the trip's departure point
 * (green pin) and destination (red pin) on a Lemat MapLibre map and draws
 * a driving route between them when both endpoints can be resolved.
 *
 * Resolution rules:
 *   - Departure: prefer departure_lat/lng; otherwise forward-geocode
 *     `departure_place` via the `lemat-search-geocode` edge function.
 *   - Destination: free-text `destination` is forward-geocoded the same way.
 *
 * Falls back gracefully:
 *   - If only one endpoint resolves, we still center & pin that endpoint.
 *   - If neither resolves, an empty-state message is shown.
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
import { MapPin, Navigation, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLematApiKey } from "@/hooks/useLematApiKey";

interface Props {
  open: boolean;
  onClose: () => void;
  departurePlace?: string | null;
  departureLat?: number | null;
  departureLng?: number | null;
  destinationPlace?: string | null;
}

interface ResolvedPoint {
  lat: number;
  lng: number;
  label: string;
}

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
}: Props) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const { ready: lematReady } = useLematApiKey();

  const [resolving, setResolving] = useState(false);
  const [origin, setOrigin] = useState<ResolvedPoint | null>(null);
  const [destination, setDestination] = useState<ResolvedPoint | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);

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

  // Initialize / tear down the map
  useEffect(() => {
    if (!open) return;
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://lemat.goffice.et/api/v1/tiles/style?theme=light",
      center: [38.7578, 9.03], // Addis Ababa default
      zoom: 11,
    });
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    map.current.addControl(new maplibregl.FullscreenControl(), "top-right");

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [open]);

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

  const openInGoogleMaps = () => {
    if (!destination && !origin) return;
    let url: string;
    if (origin && destination) {
      url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
    } else {
      const p = (destination || origin)!;
      url = `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
    }
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
            Start point and destination on the map.
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

        {(distanceKm != null || durationMin != null) && (
          <div className="text-xs text-muted-foreground flex gap-4">
            {distanceKm != null && <span>Distance: <strong className="text-foreground">{distanceKm} km</strong></span>}
            {durationMin != null && <span>ETA: <strong className="text-foreground">~{durationMin} min</strong></span>}
          </div>
        )}

        <div className="relative flex-1 min-h-[420px] rounded-lg overflow-hidden border">
          <div ref={mapContainer} className="absolute inset-0" />
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
            disabled={!origin && !destination}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" /> Open in Google Maps
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DriverNavigateMapDialog;
