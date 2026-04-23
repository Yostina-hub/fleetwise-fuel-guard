import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RouteMapPreview } from "@/components/vehicle-requests/RouteMapPreview";
import { supabase } from "@/integrations/supabase/client";
import {
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Radio,
  Sparkles,
} from "lucide-react";

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

const forwardGeocode = async (q: string): Promise<ResolvedPoint | null> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
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

    return {
      lat,
      lng,
      label: hit.display_name || q,
    };
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
  const [resolving, setResolving] = useState(false);
  const [origin, setOrigin] = useState<ResolvedPoint | null>(null);
  const [destination, setDestination] = useState<ResolvedPoint | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [livePos, setLivePos] = useState<{ lat: number; lng: number } | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

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

      let resolvedDestination: ResolvedPoint | null = null;
      if (destinationPlace?.trim()) {
        resolvedDestination = await forwardGeocode(destinationPlace.trim());
      }

      if (cancelled) return;
      setOrigin(resolvedOrigin);
      setDestination(resolvedDestination);
      setResolving(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, departurePlace, departureLat, departureLng, destinationPlace]);

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

    void fetchPos();
    const intervalId = window.setInterval(fetchPos, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [open, vehicleId]);

  useEffect(() => {
    if (!open || !origin || !destination) {
      setDistanceKm(null);
      setDurationMin(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("route-directions", {
          body: {
            coordinates: [
              [origin.lng, origin.lat],
              [destination.lng, destination.lat],
            ],
          },
        });

        if (cancelled) return;
        if (error || !data?.ok) {
          setDistanceKm(null);
          setDurationMin(null);
          return;
        }

        setDistanceKm(
          typeof data.distance_m === "number"
            ? Math.round((data.distance_m / 1000) * 10) / 10
            : null,
        );
        setDurationMin(
          typeof data.duration_s === "number"
            ? Math.round(data.duration_s / 60)
            : null,
        );
      } catch {
        if (!cancelled) {
          setDistanceKm(null);
          setDurationMin(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, origin, destination]);

  const requestInsight = async () => {
    if (!origin || !destination) return;

    setInsightLoading(true);
    setInsightError(null);
    setInsight(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
    let url: string | null = null;

    if (origin && destination) {
      url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
    } else if (origin || destination) {
      const point = destination || origin;
      if (point) {
        url = `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;
      }
    } else if (departurePlace?.trim() || destinationPlace?.trim()) {
      const dest = destinationPlace?.trim();
      const orig = departurePlace?.trim();
      url =
        dest && orig
          ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(orig)}&destination=${encodeURIComponent(dest)}&travelmode=driving`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest || orig || "")}`;
    }

    if (!url) return;

    try {
      const opened = (window.top || window).open(url, "_blank", "noopener,noreferrer");
      if (opened) return;
    } catch {
      // fall through
    }

    try {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch {
      try {
        window.top!.location.href = url;
      } catch {
        window.location.href = url;
      }
    }
  };

  const hasResolvedPoint = Boolean(origin || destination);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl h-[92vh] max-h-[92vh] overflow-hidden flex flex-col min-h-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Trip Navigation
          </DialogTitle>
          <DialogDescription>
            Start point and destination for this trip.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-success/10 ring-1 ring-success/30">
                <MapPin className="h-4 w-4 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Departure Place
                </p>
                <p
                  className="truncate text-sm font-semibold text-foreground"
                  title={origin?.label || departurePlace || undefined}
                >
                  {origin?.label || departurePlace || "—"}
                </p>
                {origin && (
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/80">
                    {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-destructive/10 ring-1 ring-destructive/30">
                <MapPin className="h-4 w-4 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Final Destination
                </p>
                <p
                  className="truncate text-sm font-semibold text-foreground"
                  title={destination?.label || destinationPlace || undefined}
                >
                  {destination?.label || destinationPlace || "—"}
                </p>
                {destination && (
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/80">
                    {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {(distanceKm != null || durationMin != null || livePos) && (
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {distanceKm != null && (
              <span>
                Distance: <strong className="text-foreground">{distanceKm} km</strong>
              </span>
            )}
            {durationMin != null && (
              <span>
                ETA: <strong className="text-foreground">~{durationMin} min</strong>
              </span>
            )}
            {livePos && (
              <span className="inline-flex items-center gap-1 text-primary">
                <Radio className="h-3 w-3 animate-pulse" />
                Live GPS connected
              </span>
            )}
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Route Insight
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={requestInsight}
              disabled={insightLoading || !origin || !destination}
              className="h-7 text-xs"
            >
              {insightLoading ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Thinking…
                </>
              ) : insight ? (
                "Regenerate"
              ) : (
                "Generate briefing"
              )}
            </Button>
          </div>
          {insightError && <p className="text-xs text-destructive">{insightError}</p>}
          {insight ? (
            <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/90">
              {insight}
            </p>
          ) : !insightError ? (
            <p className="text-xs text-muted-foreground">
              Generate a professional travel briefing based on the routed path.
            </p>
          ) : null}
        </div>

        <div className="relative flex-1 min-h-[280px] min-w-0 overflow-hidden rounded-lg border sm:min-h-[340px]">
          {resolving ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Resolving locations…
              </div>
            </div>
          ) : hasResolvedPoint ? (
            <RouteMapPreview
              departure={
                origin
                  ? { lat: origin.lat, lng: origin.lng, label: origin.label }
                  : undefined
              }
              destination={
                destination
                  ? {
                      lat: destination.lat,
                      lng: destination.lng,
                      label: destination.label,
                    }
                  : undefined
              }
              heightPx={Math.max(340, window.innerHeight > 900 ? 420 : 360)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                No location data available for this trip.
              </div>
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
            <ExternalLink className="h-4 w-4" />
            Open in Google Maps
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DriverNavigateMapDialog;
