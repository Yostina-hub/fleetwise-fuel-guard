/**
 * MergedTripStopsPanel
 * --------------------
 * Compact summary of a *consolidated parent trip* (`is_consolidated_parent = true`).
 *
 * Layout:
 *   - Always-visible 1-line summary (count, pax, time window, pool).
 *   - Expand → clean numbered stop list + an OPTIONAL small map view.
 *   - The map is lazy-mounted (only when "Show on map" is toggled) so we
 *     don't load MapLibre on dialog open. This keeps the assignment dialog
 *     fast and uncluttered while still letting dispatchers visualise the
 *     route when they need to.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitMerge,
  Users,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Map as MapIcon,
  EyeOff,
  Route as RouteIcon,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getPreviewSafeMapStyle } from "@/lib/lemat";

interface Props {
  parentRequestId: string;
  organizationId: string;
  poolName?: string | null;
  totalPassengers?: number | null;
  childCount?: number | null;
  mergeStrategy?: string | null;
  neededFrom?: string | null;
  neededUntil?: string | null;
  defaultOpen?: boolean;
}

interface Child {
  id: string;
  request_number: string;
  requester_name: string | null;
  passengers: number | null;
  needed_from: string;
  needed_until: string | null;
  departure_place: string | null;
  destination: string | null;
  pool_name: string | null;
  departure_lat: number | null;
  departure_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
}

export const MergedTripStopsPanel = ({
  parentRequestId,
  organizationId,
  poolName,
  totalPassengers,
  childCount,
  neededFrom,
  neededUntil,
  defaultOpen = false,
}: Props) => {
  const [open, setOpen] = useState(defaultOpen);
  const [showMap, setShowMap] = useState(false);

  const { data: children = [], isLoading } = useQuery({
    queryKey: ["merged-children", parentRequestId],
    enabled: !!parentRequestId && !!organizationId && open,
    staleTime: 30_000,
    queryFn: async (): Promise<Child[]> => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "id, request_number, requester_name, passengers, needed_from, needed_until, departure_place, destination, pool_name, departure_lat, departure_lng, destination_lat, destination_lng",
        )
        .eq("organization_id", organizationId)
        .eq("merged_into_request_id", parentRequestId)
        .order("needed_from", { ascending: true });
      if (error) throw error;
      return (data || []) as Child[];
    },
  });

  // ── Derived totals (fall back to props when query is still loading) ─────
  const totalPax = useMemo(
    () =>
      children.length > 0
        ? children.reduce((s, c) => s + (c.passengers || 0), 0)
        : totalPassengers ?? 0,
    [children, totalPassengers],
  );
  const stopCount = children.length || childCount || 0;
  const earliest = useMemo(() => {
    if (children.length === 0) return neededFrom ? new Date(neededFrom) : null;
    return new Date(
      children
        .map((c) => new Date(c.needed_from).getTime())
        .reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY),
    );
  }, [children, neededFrom]);
  const latest = useMemo(() => {
    if (children.length === 0) return neededUntil ? new Date(neededUntil) : null;
    return new Date(
      children
        .map((c) => new Date(c.needed_until || c.needed_from).getTime())
        .reduce((a, b) => Math.max(a, b), 0),
    );
  }, [children, neededUntil]);

  const stopsWithCoords = useMemo(
    () =>
      children.filter(
        (c) =>
          c.departure_lat != null &&
          c.departure_lng != null &&
          c.destination_lat != null &&
          c.destination_lng != null,
      ),
    [children],
  );

  // ── Lazy-mounted map ────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!showMap || !open) return;
    if (!containerRef.current || mapRef.current) return;
    if (stopsWithCoords.length === 0) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getPreviewSafeMapStyle("streets") as any,
      center: [stopsWithCoords[0].departure_lng!, stopsWithCoords[0].departure_lat!],
      zoom: 11,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      const features = stopsWithCoords.map((c) => ({
        type: "Feature" as const,
        properties: { id: c.id },
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [c.departure_lng!, c.departure_lat!],
            [c.destination_lng!, c.destination_lat!],
          ],
        },
      }));
      map.addSource("legs", {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });
      map.addLayer({
        id: "legs-line",
        type: "line",
        source: "legs",
        paint: {
          "line-color": "hsl(217 91% 60%)",
          "line-width": 2.5,
          "line-opacity": 0.7,
          "line-dasharray": [2, 1.5],
        },
      });

      const bounds = new maplibregl.LngLatBounds();

      stopsWithCoords.forEach((c, idx) => {
        // Numbered pickup marker
        const pickupEl = document.createElement("div");
        pickupEl.style.cssText = `
          width:24px;height:24px;border-radius:9999px;
          background:hsl(217 91% 60%);color:white;
          font:700 11px system-ui;display:flex;align-items:center;justify-content:center;
          border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);
          cursor:pointer;
        `;
        pickupEl.textContent = String(idx + 1);
        const m1 = new maplibregl.Marker({ element: pickupEl })
          .setLngLat([c.departure_lng!, c.departure_lat!])
          .setPopup(
            new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
              `<div style="font:500 11px system-ui;padding:2px;min-width:160px;">
                 <div style="font-weight:700">Stop ${idx + 1} · ${c.requester_name || c.request_number}</div>
                 <div style="color:#666;margin-top:2px;">📍 ${c.departure_place || "Pickup"}</div>
                 <div style="color:#666;">🏁 ${c.destination || "Drop"}</div>
                 <div style="margin-top:3px;font-size:10px;">${c.passengers ?? 0} pax · ${format(new Date(c.needed_from), "HH:mm")}</div>
               </div>`,
            ),
          )
          .addTo(map);
        markersRef.current.push(m1);

        // Drop marker (square)
        const dropEl = document.createElement("div");
        dropEl.style.cssText = `
          width:12px;height:12px;border-radius:2px;
          background:white;border:2px solid hsl(217 91% 60%);
          box-shadow:0 1px 3px rgba(0,0,0,.25);
        `;
        const m2 = new maplibregl.Marker({ element: dropEl })
          .setLngLat([c.destination_lng!, c.destination_lat!])
          .addTo(map);
        markersRef.current.push(m2);

        bounds.extend([c.departure_lng!, c.departure_lat!]);
        bounds.extend([c.destination_lng!, c.destination_lat!]);
      });

      try {
        map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 0 });
      } catch {
        /* noop */
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [showMap, open, stopsWithCoords]);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* ── COMPACT SUMMARY ROW (always visible) ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <GitMerge className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold">Consolidated trip</span>
            <span className="text-xs text-muted-foreground">
              {stopCount} stop{stopCount === 1 ? "" : "s"} · {totalPax} pax
            </span>
          </div>
          {earliest && (
            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(earliest, "EEE MMM d · HH:mm")}
              {latest && (
                <>
                  <ArrowRight className="w-3 h-3 mx-0.5" />
                  {format(latest, "HH:mm")}
                </>
              )}
              {poolName && <span className="ml-2 truncate">· {poolName}</span>}
            </div>
          )}
        </div>

        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          {open ? "Hide" : "View stops"}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* ── EXPANDED CONTENT ── */}
      {open && (
        <div className="border-t bg-muted/20">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 inline animate-spin mr-1.5" />
              Loading stops…
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No child requests linked to this consolidated trip.
            </div>
          ) : (
            <>
              {/* Map toggle bar */}
              {stopsWithCoords.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 border-b bg-background/40">
                  <span className="text-[11px] text-muted-foreground">
                    {stopsWithCoords.length} of {children.length} stops have coordinates
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowMap((v) => !v)}
                  >
                    {showMap ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 mr-1" />
                        Hide map
                      </>
                    ) : (
                      <>
                        <MapIcon className="w-3.5 h-3.5 mr-1" />
                        Show on map
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Map (only when toggled) */}
              {showMap && stopsWithCoords.length > 0 && (
                <div
                  ref={containerRef}
                  className="w-full h-[260px] bg-muted"
                  aria-label="Consolidated trip map"
                />
              )}

              {/* Numbered timeline */}
              <ScrollArea className="max-h-[260px]">
                <ol className="py-2">
                  {children.map((c, idx) => (
                    <li key={c.id} className="relative px-4 py-3 flex gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold">
                          {idx + 1}
                        </div>
                        {idx < children.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 pb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium truncate">
                            {c.requester_name || c.request_number}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1 gap-0.5 font-normal"
                          >
                            <Users className="w-2.5 h-2.5" />
                            {c.passengers ?? 0}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                            {format(new Date(c.needed_from), "MMM d · HH:mm")}
                          </span>
                        </div>

                        <div className="mt-1.5 text-[11px] text-foreground leading-relaxed">
                          <div className="truncate">
                            <span className="text-muted-foreground">From </span>
                            {c.departure_place || "—"}
                          </div>
                          <div className="truncate">
                            <span className="text-muted-foreground">To </span>
                            {c.destination || "—"}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MergedTripStopsPanel;
