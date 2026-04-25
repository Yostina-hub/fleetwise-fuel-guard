/**
 * MergedTripStopsPanel
 * --------------------
 * Professional, dense visualisation of a *consolidated parent trip*
 * (`is_consolidated_parent = true`). Solves the long-standing UX gap where the
 * Quick-Assign / Assign Vehicle dialogs treated a merged trip as a normal
 * single-leg request, hiding which child requests were rolled up and what
 * stops the driver actually has to make.
 *
 * Renders:
 *   1. A summary strip — child count, total pax, pool, time window, strategy.
 *   2. An ordered "stops" list (each child request → pickup + drop with
 *      requester, pax, ETA, departure time).
 *   3. A mini MapLibre map plotting every pickup + drop in numbered order
 *      connected by a route line so the supervisor can sanity-check the
 *      sequence before assigning.
 *
 * Pure presentation — no mutations. Safe to drop into any dialog.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { getPreviewSafeMapStyle } from "@/lib/lemat";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  GitMerge,
  MapPin,
  Users,
  Clock,
  Route as RouteIcon,
  User as UserIcon,
  Loader2,
  Flag,
  CircleDot,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

interface Props {
  parentRequestId: string;
  organizationId: string;
  /** Optional — used to colour the strip header. */
  poolName?: string | null;
  /** Pulled from the parent record (already known by the dialog). */
  totalPassengers?: number | null;
  childCount?: number | null;
  mergeStrategy?: string | null;
  neededFrom?: string | null;
  neededUntil?: string | null;
  /** Start expanded? Defaults to false (compact summary only). */
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
  departure_lat: number | null;
  departure_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  pool_name: string | null;
}

const ADDIS_CENTER: [number, number] = [38.7525, 9.0192];

export const MergedTripStopsPanel = ({
  parentRequestId,
  organizationId,
  poolName,
  totalPassengers,
  childCount,
  mergeStrategy,
  neededFrom,
  neededUntil,
  defaultOpen = false,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(defaultOpen);

  const { data: children = [], isLoading } = useQuery({
    queryKey: ["merged-children", parentRequestId],
    enabled: !!parentRequestId && !!organizationId,
    staleTime: 30_000,
    queryFn: async (): Promise<Child[]> => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "id, request_number, requester_name, passengers, needed_from, needed_until, departure_place, destination, departure_lat, departure_lng, destination_lat, destination_lng, pool_name",
        )
        .eq("organization_id", organizationId)
        .eq("merged_into_request_id", parentRequestId)
        .order("needed_from", { ascending: true });
      if (error) throw error;
      return (data || []) as Child[];
    },
  });

  // ── Map lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getPreviewSafeMapStyle("streets"),
      center: ADDIS_CENTER,
      zoom: 10,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource("merged-route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "merged-route-line",
        type: "line",
        source: "merged-route",
        paint: {
          "line-color": "hsl(var(--primary))",
          "line-width": 3,
          "line-opacity": 0.85,
          "line-dasharray": [3, 2],
        },
      });
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
  }, []);

  // ── Sync stops onto the map ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const coords: [number, number][] = [];
    const bounds = new maplibregl.LngLatBounds();
    let hasBounds = false;

    children.forEach((c, idx) => {
      const stopNo = idx + 1;

      if (c.departure_lat != null && c.departure_lng != null) {
        const pickupEl = document.createElement("div");
        pickupEl.style.cssText = `
          width:22px;height:22px;border-radius:9999px;
          background:hsl(var(--primary));color:hsl(var(--primary-foreground));
          border:2px solid hsl(var(--background));
          display:flex;align-items:center;justify-content:center;
          font:600 11px system-ui;box-shadow:0 1px 4px rgba(0,0,0,.25);
        `;
        pickupEl.textContent = String(stopNo);
        const m1 = new maplibregl.Marker({ element: pickupEl })
          .setLngLat([c.departure_lng, c.departure_lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14 }).setHTML(
              `<div style="font:500 12px system-ui;padding:4px;min-width:160px;">
                 <div style="font-weight:700">Stop ${stopNo} · Pickup</div>
                 <div>${c.request_number}</div>
                 <div style="color:hsl(var(--muted-foreground));font-size:11px;">${c.departure_place || "—"}</div>
                 <div style="font-size:11px;">${c.requester_name || ""} · ${c.passengers ?? 0} pax</div>
               </div>`,
            ),
          )
          .addTo(map);
        markersRef.current.push(m1);
        coords.push([c.departure_lng, c.departure_lat]);
        bounds.extend([c.departure_lng, c.departure_lat]);
        hasBounds = true;
      }

      if (c.destination_lat != null && c.destination_lng != null) {
        const dropEl = document.createElement("div");
        dropEl.style.cssText = `
          width:18px;height:18px;border-radius:3px;
          background:hsl(var(--background));border:2px solid hsl(var(--primary));
          display:flex;align-items:center;justify-content:center;
          font:600 10px system-ui;color:hsl(var(--primary));
          box-shadow:0 1px 3px rgba(0,0,0,.2);
        `;
        dropEl.textContent = String(stopNo);
        const m2 = new maplibregl.Marker({ element: dropEl })
          .setLngLat([c.destination_lng, c.destination_lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14 }).setHTML(
              `<div style="font:500 12px system-ui;padding:4px;min-width:160px;">
                 <div style="font-weight:700">Stop ${stopNo} · Drop-off</div>
                 <div>${c.request_number}</div>
                 <div style="color:hsl(var(--muted-foreground));font-size:11px;">${c.destination || "—"}</div>
               </div>`,
            ),
          )
          .addTo(map);
        markersRef.current.push(m2);
        coords.push([c.destination_lng, c.destination_lat]);
        bounds.extend([c.destination_lng, c.destination_lat]);
        hasBounds = true;
      }
    });

    const src = map.getSource("merged-route") as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: "FeatureCollection",
      features:
        coords.length >= 2
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: coords },
              },
            ]
          : [],
    });

    if (hasBounds) {
      try {
        map.fitBounds(bounds, { padding: 40, duration: 400, maxZoom: 13 });
      } catch {
        /* noop */
      }
    }
  }, [ready, children]);

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

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 overflow-hidden">
      {/* ── HEADER STRIP ── */}
      <div className="px-3 py-2 bg-primary/10 border-b border-primary/20 flex flex-wrap items-center gap-2">
        <GitMerge className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-semibold text-primary">Consolidated trip</span>
        <Badge variant="secondary" className="text-[10px] gap-1">
          <RouteIcon className="w-2.5 h-2.5" />
          {stopCount} stop{stopCount === 1 ? "" : "s"}
        </Badge>
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Users className="w-2.5 h-2.5" />
          {totalPax} pax total
        </Badge>
        {poolName && (
          <Badge variant="outline" className="text-[10px]">
            {poolName}
          </Badge>
        )}
        {mergeStrategy && (
          <Badge variant="outline" className="text-[10px] capitalize ml-auto">
            {String(mergeStrategy).replace(/_/g, " ")}
          </Badge>
        )}
      </div>

      {/* ── BODY ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-0">
        {/* Stops list */}
        <div className="border-b md:border-b-0 md:border-r border-border/40">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 inline animate-spin mr-1.5" />
              Loading merged stops…
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No child requests linked to this consolidated trip.
            </div>
          ) : (
            <ScrollArea className="h-[260px]">
              <ol className="divide-y divide-border/40">
                {children.map((c, idx) => {
                  const stopNo = idx + 1;
                  return (
                    <li key={c.id} className="px-3 py-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                          {stopNo}
                        </span>
                        <span className="font-mono font-semibold">
                          {c.request_number}
                        </span>
                        {c.requester_name && (
                          <span className="text-muted-foreground flex items-center gap-1 truncate">
                            <UserIcon className="w-2.5 h-2.5" />
                            {c.requester_name}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1 ml-auto gap-0.5"
                        >
                          <Users className="w-2.5 h-2.5" />
                          {c.passengers ?? 0}
                        </Badge>
                      </div>
                      <div className="pl-7 mt-1 space-y-0.5 text-[11px]">
                        <div className="flex items-start gap-1.5">
                          <CircleDot className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                          <span className="text-foreground truncate">
                            <span className="text-muted-foreground">Pickup:</span>{" "}
                            {c.departure_place || "—"}
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Flag className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                          <span className="text-foreground truncate">
                            <span className="text-muted-foreground">Drop:</span>{" "}
                            {c.destination || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-2.5 h-2.5" />
                          {format(new Date(c.needed_from), "EEE MMM d · HH:mm")}
                          {c.needed_until && (
                            <>
                              <span>→</span>
                              {format(new Date(c.needed_until), "HH:mm")}
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </ScrollArea>
          )}
        </div>

        {/* Mini map */}
        <div className="relative h-[260px]">
          <div ref={containerRef} className="w-full h-full" />
          <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur rounded-md border px-1.5 py-1 text-[10px] flex items-center gap-1.5 shadow-sm">
            <MapPin className="w-3 h-3 text-primary" />
            <span>Pickup</span>
            <span className="w-2 h-2 border border-primary ml-1" />
            <span>Drop</span>
          </div>
        </div>
      </div>

      {/* Footer time window */}
      {earliest && (
        <div className="px-3 py-1.5 border-t border-primary/20 bg-primary/5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          Trip window:
          <span className="text-foreground font-medium">
            {format(earliest, "MMM d · HH:mm")}
          </span>
          {latest && (
            <>
              <span>→</span>
              <span className="text-foreground font-medium">
                {format(latest, "MMM d · HH:mm")}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MergedTripStopsPanel;
