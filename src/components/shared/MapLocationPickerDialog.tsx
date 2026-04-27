import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Search, Loader2, Layers } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getPreviewSafeMapStyle } from "@/lib/lemat";
import { supabase } from "@/integrations/supabase/client";

interface MapLocationPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (location: { name: string; lat: number; lng: number }) => void;
  title?: string;
  initialLat?: number;
  initialLng?: number;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function MapLocationPickerDialog({
  open,
  onClose,
  onSelect,
  title = "Pick Location on Map",
  initialLat = 9.0192,
  initialLng = 38.7525,
}: MapLocationPickerDialogProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [locationName, setLocationName] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite">("streets");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  /**
   * Reverse-geocode (lat,lng) → human address via the existing Lemat proxy.
   * Used to (a) auto-fill the requester's current address on open, and
   * (b) refresh the address whenever the pin is dragged or the map is clicked
   * — so the dialog never silently keeps a stale "Churchill Avenue" label.
   */
  const reverseGeocode = async (rLat: number, rLng: number): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn("[MapPicker] reverseGeocode: no session");
        return null;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lemat-reverse-geocode?lat=${rLat.toFixed(6)}&lon=${rLng.toFixed(6)}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Accept-Language": "en",
        },
      });
      if (!res.ok) {
        console.warn("[MapPicker] reverseGeocode HTTP error", res.status);
        return null;
      }
      const json = await res.json();
      // If the proxy returned its coords-only fallback, treat as no name so we
      // don't fill the field with "9.019200, 38.752500".
      if (json?.fallback) {
        console.warn("[MapPicker] reverseGeocode fallback:", json?.fallback_reason);
        return null;
      }
      const addr = json?.address || {};
      const display =
        json?.display_name ||
        json?.name ||
        [
          addr.suburb || addr.neighbourhood || addr.road,
          addr.city || addr.town || addr.village,
          addr.country,
        ]
          .filter(Boolean)
          .join(", ");
      return display && String(display).trim() ? String(display).trim() : null;
    } catch (err) {
      console.warn("[MapPicker] reverseGeocode failed", err);
      return null;
    }
  };

  /**
   * Ask the browser for the user's current location. Resolves with `null` if
   * geolocation is unavailable, denied, or the request times out. Logs the
   * exact reason to the console so users can debug "why didn't it find me?".
   *
   * NOTE: this works best when called as a result of a user gesture (button
   * click). The auto-attempt on dialog open may be silently denied in
   * permissions-restricted contexts (e.g. the Lovable preview iframe without
   * `allow="geolocation"`); the explicit "Use my location" button below is
   * the reliable path.
   */
  const requestCurrentLocation = (): Promise<
    { lat: number; lng: number } | { error: "denied" | "unavailable" | "timeout" | "unsupported" }
  > =>
    new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        console.warn("[MapPicker] geolocation API unavailable in this browser");
        return resolve({ error: "unsupported" });
      }
      const timer = setTimeout(() => {
        console.warn("[MapPicker] geolocation request timed out");
        resolve({ error: "timeout" });
      }, 12000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          clearTimeout(timer);
          console.warn("[MapPicker] geolocation error:", err.code, err.message);
          // 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
          const reason: "denied" | "unavailable" | "timeout" =
            err.code === 1 ? "denied" : err.code === 3 ? "timeout" : "unavailable";
          resolve({ error: reason });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30_000 },
      );
    });

  /**
   * Explicit "Use my location" handler — fires from a user click so the
   * browser will reliably show its permission prompt. Critically, we kick
   * off `getCurrentPosition` *synchronously* (no awaits before it) so the
   * browser preserves the user-gesture provenance that's required for the
   * permission prompt to appear in many browsers (especially when the page
   * is loaded inside an iframe).
   */
  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      console.warn("[MapPicker] geolocation API unavailable in this browser");
      setSearchError("Your browser doesn't support geolocation. Use search or click the map instead.");
      return;
    }
    setIsLocating(true);
    setSearchError(null);
    // Kick off the geolocation request synchronously inside the click handler
    // so we don't lose user-gesture provenance.
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      setIsLocating(false);
      console.warn("[MapPicker] geolocation request timed out");
      setSearchError(
        "Location lookup timed out. Make sure location is allowed for this site, then try again.",
      );
    }, 12000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        console.info("[MapPicker] geolocation success", { lat, lng, accuracy: pos.coords.accuracy });
        setLat(parseFloat(lat.toFixed(6)));
        setLng(parseFloat(lng.toFixed(6)));
        setIsLocating(false);
        // Reverse-geocode after state updates — losing gesture context here
        // is fine because we already have coordinates.
        reverseGeocode(lat, lng).then((name) => {
          if (name) setLocationName(name);
        });
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        setIsLocating(false);
        console.warn("[MapPicker] geolocation error", {
          code: err.code,
          message: err.message,
          inIframe: typeof window !== "undefined" && window.self !== window.top,
        });
        // 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
        const inIframe = typeof window !== "undefined" && window.self !== window.top;
        if (err.code === 1) {
          setSearchError(
            inIframe
              ? "Location is blocked inside this preview iframe. Open the published site or your custom domain to use 'My location'."
              : "Location access is blocked. Allow location for this site in your browser's address bar (lock icon → Site settings), then click 'My location' again.",
          );
        } else if (err.code === 3) {
          setSearchError(
            "Location lookup timed out. Try moving to an area with better signal, or pick a place from the map.",
          );
        } else {
          setSearchError(
            "Couldn't determine your location. Try again, or pick a place from the map.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30_000 },
    );
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setIsLocating(true);
      // Check Permissions API first — gives us a definitive answer for the
      // banner without triggering the browser's native prompt (which is
      // unreliable on dialog-open since there's no user gesture).
      let permissionState: PermissionState | "unknown" = "unknown";
      try {
        if (typeof navigator !== "undefined" && (navigator as any).permissions?.query) {
          const status = await (navigator as any).permissions.query({ name: "geolocation" });
          permissionState = status.state as PermissionState;
        }
      } catch {
        // Some browsers (older Safari) don't support permissions.query for
        // geolocation — fall back to attempting the request directly.
      }
      if (cancelled) return;

      // Only auto-attempt geolocation when we're sure permission is already
      // granted — otherwise the call after `await` fails silently because we
      // no longer have user-gesture provenance, AND the preview iframe may
      // not carry the `allow="geolocation"` attribute.
      let here: { lat: number; lng: number } | { error: string } = { error: "skipped" };
      if (permissionState === "granted") {
        here = await requestCurrentLocation();
      }
      if (cancelled) return;

      const hasCoords = !("error" in here);
      const startLat = hasCoords ? (here as any).lat : initialLat;
      const startLng = hasCoords ? (here as any).lng : initialLng;
      setLat(startLat);
      setLng(startLng);
      setSearchQuery("");
      setSearchResults([]);

      // Surface a clear hint whenever we couldn't auto-locate, regardless of
      // the reason. Pointing at the explicit "My location" button is the
      // reliable recovery path because it runs from a user gesture (and the
      // browser will then show its permission prompt if needed).
      if (!hasCoords) {
        if (permissionState === "denied") {
          setSearchError(
            "Location access is blocked for this site. Allow location in your browser's site settings, then click 'My location'.",
          );
        } else if (permissionState === "prompt" || permissionState === "unknown") {
          setSearchError(
            "Click 'My location' to center the map on your current position.",
          );
        } else {
          setSearchError(
            "Showing the default map view. Click 'My location' to use your current position.",
          );
        }
      } else {
        setSearchError(null);
      }
      setIsLocating(false);
      // Best-effort reverse geocode so the name field is descriptive
      // (avoids the misleading "Churchill Avenue" street default).
      const name = await reverseGeocode(startLat, startLng);
      if (!cancelled) setLocationName(name ?? "");
    })();
    return () => { cancelled = true; };
  }, [open, initialLat, initialLng]);

  // Debounced search via Nominatim
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setSearchResults([]);
          setSearchError("Please sign in again to search locations.");
          return;
        }

        const q = encodeURIComponent(searchQuery.trim());
        const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lemat-search-geocode?q=${q}&countrycodes=et&limit=5`;
        const res = await fetch(proxyUrl, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Accept-Language": "en",
          },
        });

        if (res.ok) {
          const json = await res.json();
          const data: SearchResult[] = Array.isArray(json) ? json : Array.isArray(json?.results) ? json.results : [];
          setSearchResults(data);
          if (data.length === 0) {
            setSearchError("No matching locations found.");
          }
        } else {
          setSearchResults([]);
          setSearchError("Search is temporarily unavailable.");
        }
      } catch {
        setSearchResults([]);
        setSearchError("Search is temporarily unavailable.");
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // Map init — runs once per open. We deliberately exclude lat/lng from deps
  // so clicking/dragging doesn't tear down and rebuild the map (which would
  // swallow subsequent clicks). The re-center effect below handles updates.
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      const container = mapContainer.current;
      if (!container || mapRef.current) return;

      container.style.width = "100%";
      container.style.height = "350px";

      const style = getPreviewSafeMapStyle(mapStyle);

      const map = new maplibregl.Map({
        container,
        style,
        center: [lng, lat],
        zoom: 14,
        attributionControl: false,
      });

      map.on("load", () => map.resize());
      map.addControl(new maplibregl.NavigationControl(), "top-right");

      const marker = new maplibregl.Marker({ color: "#ef4444", draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);

      marker.on("dragend", async () => {
        const pos = marker.getLngLat();
        const newLat = parseFloat(pos.lat.toFixed(6));
        const newLng = parseFloat(pos.lng.toFixed(6));
        setLat(newLat);
        setLng(newLng);
        const name = await reverseGeocode(newLat, newLng);
        if (name) setLocationName(name);
      });

      map.on("click", async (e) => {
        const newLat = parseFloat(e.lngLat.lat.toFixed(6));
        const newLng = parseFloat(e.lngLat.lng.toFixed(6));
        setLat(newLat);
        setLng(newLng);
        marker.setLngLat([newLng, newLat]);
        const name = await reverseGeocode(newLat, newLng);
        if (name) setLocationName(name);
      });

      mapRef.current = map;
      markerRef.current = marker;
    }, 300);

    return () => {
      clearTimeout(timer);
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Re-center map + marker when lat/lng change (e.g. after geolocate resolves
  // or a search result is picked) — without recreating the map.
  useEffect(() => {
    if (markerRef.current) markerRef.current.setLngLat([lng, lat]);
    if (mapRef.current) {
      mapRef.current.easeTo({ center: [lng, lat], duration: 600 });
    }
  }, [lat, lng]);

  // Swap base layer (Streets ↔ Satellite) without rebuilding the map.
  // setStyle removes existing markers from the new style instance, so we
  // re-attach the draggable pin once the new style finishes loading.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(getPreviewSafeMapStyle(mapStyle));
    const reattach = () => {
      if (!markerRef.current) return;
      markerRef.current.addTo(map);
    };
    map.once("styledata", reattach);
  }, [mapStyle]);

  const flyToLocation = (result: SearchResult) => {
    const newLat = parseFloat(result.lat);
    const newLng = parseFloat(result.lon);
    setLat(parseFloat(newLat.toFixed(6)));
    setLng(parseFloat(newLng.toFixed(6)));
    // Use the full place name from the map result so the saved location
    // matches exactly what the user picked on the map.
    setLocationName(result.display_name);
    setSearchQuery(result.display_name);
    setSearchResults([]);

    if (mapRef.current) {
      mapRef.current.flyTo({ center: [newLng, newLat], zoom: 15, duration: 1200 });
    }
    if (markerRef.current) {
      markerRef.current.setLngLat([newLng, newLat]);
    }
  };

  const handleConfirm = async () => {
    let name = locationName.trim();
    // If somehow the name is empty at confirm time, try one more reverse
    // geocode so we never return raw coordinates as the location's name.
    if (!name) {
      const fetched = await reverseGeocode(lat, lng);
      name = (fetched || "").trim() || "Pinned location";
    }
    onSelect({ name, lat, lng });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>Search for a place, click on the map, or drag the pin.</DialogDescription>
        </DialogHeader>

        {/* Search Bar + "Use my location" — the explicit button reliably
            triggers the browser permission prompt as a user gesture. */}
        <div className="flex gap-2 items-start">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search location name (e.g. Bole, Meskel Square, Hawassa)"
              className="pl-9 pr-9 h-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            )}

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-start gap-2"
                    onClick={() => flyToLocation(r)}
                  >
                    <MapPin className="w-3.5 h-3.5 mt-0.5 text-destructive shrink-0" />
                    <span className="line-clamp-2">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}

            {!isSearching && searchError && searchResults.length === 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-lg">
                {searchError}
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={useMyLocation}
            disabled={isLocating}
            className="h-9 gap-1.5 shrink-0"
            title="Center map on your current location"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            My location
          </Button>
        </div>

        {/* Map (with Streets / Satellite layer toggle overlay) */}
        <div className="relative">
          <div
            ref={mapContainer}
            className="w-full h-[350px] rounded-lg border border-border overflow-hidden"
          />
          <div className="absolute top-2 left-2 z-10 inline-flex rounded-md border border-border bg-background/90 backdrop-blur shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setMapStyle("streets")}
              className={`px-2.5 py-1 text-[11px] font-medium inline-flex items-center gap-1 transition-colors ${
                mapStyle === "streets"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent"
              }`}
              aria-pressed={mapStyle === "streets"}
              title="Street map"
            >
              <Layers className="w-3 h-3" />
              Streets
            </button>
            <button
              type="button"
              onClick={() => setMapStyle("satellite")}
              className={`px-2.5 py-1 text-[11px] font-medium inline-flex items-center gap-1 transition-colors border-l border-border ${
                mapStyle === "satellite"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent"
              }`}
              aria-pressed={mapStyle === "satellite"}
              title="Satellite imagery"
            >
              <Layers className="w-3 h-3" />
              Satellite
            </button>
          </div>
        </div>

        {/* Selected place — name is auto-filled from the map; coords kept
            as a tiny read-only hint so users know the pin is real, but they
            never have to type latitude/longitude themselves. */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-destructive" /> Selected location
            {isLocating && <Loader2 className="w-3 h-3 animate-spin" />}
          </Label>
          <Input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder={isLocating ? "Detecting your location…" : "Click the map or search to pick a place"}
            className="h-9"
          />
          <p className="text-[11px] text-muted-foreground/80 pl-0.5">
            Pin: {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} className="gap-1.5">
            <Navigation className="w-3.5 h-3.5" />
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
