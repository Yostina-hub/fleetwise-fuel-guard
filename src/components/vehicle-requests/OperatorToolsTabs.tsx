/**
 * OperatorToolsTabs
 * -----------------
 * Inline operator toolset shown inside VehicleRequestApprovalFlow for users
 * with the operator/admin tier. Four tabs:
 *   1. Geofencing    — pickup / drop / stop containment vs active org fences
 *   2. Optimization  — TSP-style intermediate-stop reorder + best vehicle picker
 *   3. Consolidation — embeds the existing org-wide ConsolidationPanel
 *   4. Navigate      — in-app map preview, Google Maps deep link, SMS to driver
 *
 * All mutations are scoped to the request and use existing RLS-protected
 * tables (`vehicle_request_stops`, `vehicle_requests`).
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MapPin,
  Navigation,
  Route,
  Sparkles,
  Layers,
  ArrowDown,
  ExternalLink,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { RouteMapPreview, type RoutePoint } from "./RouteMapPreview";
import { ConsolidationPanel } from "./ConsolidationPanel";
import { PoolAssignmentPicker } from "./PoolAssignmentPicker";
import { notifyNavigationSms } from "@/services/vehicleRequestSmsService";

interface Geofence {
  id: string;
  name: string;
  geometry_type: "circle" | "polygon" | string;
  center_lat: number | null;
  center_lng: number | null;
  radius_meters: number | null;
  polygon_points: Array<{ lat: number; lng: number }> | null;
  is_active: boolean;
}

interface Stop {
  id: string;
  sequence: number;
  name: string | null;
  lat: number | null;
  lng: number | null;
}

interface Props {
  request: any;
  onAssignViaPicker?: (vehicleId: string, driverId?: string) => void;
  onUnavailable?: () => void;
  isAssigning?: boolean;
  canManage: boolean;
}

// Geometry helpers --------------------------------------------------------
const haversineKm = (a: number, b: number, c: number, d: number) => {
  const R = 6371;
  const dLat = ((c - a) * Math.PI) / 180;
  const dLng = ((d - b) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a * Math.PI) / 180) *
      Math.cos((c * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
};

const pointInPolygon = (
  pt: { lat: number; lng: number },
  poly: Array<{ lat: number; lng: number }>,
) => {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lng,
      yi = poly[i].lat;
    const xj = poly[j].lng,
      yj = poly[j].lat;
    const intersect =
      yi > pt.lat !== yj > pt.lat &&
      pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const insideFence = (pt: { lat: number; lng: number }, f: Geofence) => {
  if (
    f.geometry_type === "circle" &&
    f.center_lat != null &&
    f.center_lng != null &&
    f.radius_meters
  ) {
    return (
      haversineKm(pt.lat, pt.lng, f.center_lat, f.center_lng) * 1000 <=
      f.radius_meters
    );
  }
  if (f.geometry_type === "polygon" && Array.isArray(f.polygon_points)) {
    return pointInPolygon(pt, f.polygon_points);
  }
  return false;
};

// Nearest-neighbour TSP between departure → stops → destination
const optimizeStopOrder = (
  start: { lat: number; lng: number },
  end: { lat: number; lng: number } | null,
  stops: Stop[],
): Stop[] => {
  const valid = stops.filter((s) => s.lat != null && s.lng != null);
  if (valid.length <= 1) return valid;
  const remaining = [...valid];
  const ordered: Stop[] = [];
  let current = start;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(
        current.lat,
        current.lng,
        remaining[i].lat!,
        remaining[i].lng!,
      );
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = { lat: next.lat!, lng: next.lng! };
  }
  return ordered;
};

const totalRouteKm = (
  start: { lat: number; lng: number },
  end: { lat: number; lng: number } | null,
  stops: Stop[],
): number => {
  let total = 0;
  let cur = start;
  for (const s of stops) {
    if (s.lat == null || s.lng == null) continue;
    total += haversineKm(cur.lat, cur.lng, s.lat, s.lng);
    cur = { lat: s.lat, lng: s.lng };
  }
  if (end) total += haversineKm(cur.lat, cur.lng, end.lat, end.lng);
  return total;
};

// Build a Google Maps directions URL with waypoints
const buildGoogleMapsUrl = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number } | null,
  stops: Stop[],
): string | null => {
  if (!destination) return null;
  const waypoints = stops
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) => `${s.lat},${s.lng}`)
    .join("|");
  const base = "https://www.google.com/maps/dir/?api=1";
  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "driving",
  });
  if (waypoints) params.set("waypoints", waypoints);
  return `${base}&${params.toString()}`;
};

// -----------------------------------------------------------------------

export const OperatorToolsTabs = ({
  request,
  onAssignViaPicker,
  onUnavailable,
  isAssigning,
  canManage,
}: Props) => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("geofencing");

  // Stops (from vehicle_request_stops table)
  const stopsQuery = useQuery({
    queryKey: ["vehicle-request-stops", request.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_request_stops")
        .select("id, sequence, name, lat, lng")
        .eq("vehicle_request_id", request.id)
        .order("sequence");
      if (error) throw error;
      return (data || []) as Stop[];
    },
  });

  // Active geofences for this org
  const fencesQuery = useQuery({
    queryKey: ["vr-geofences", request.organization_id],
    enabled: !!request.organization_id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("geofences")
        .select(
          "id, name, geometry_type, center_lat, center_lng, radius_meters, polygon_points, is_active",
        )
        .eq("organization_id", request.organization_id)
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as Geofence[];
    },
  });

  const fences = fencesQuery.data || [];
  const stops = stopsQuery.data || [];

  const departure: { lat: number; lng: number } | null =
    request.departure_lat != null && request.departure_lng != null
      ? { lat: request.departure_lat, lng: request.departure_lng }
      : null;
  const destination: { lat: number; lng: number } | null =
    request.destination_lat != null && request.destination_lng != null
      ? { lat: request.destination_lat, lng: request.destination_lng }
      : null;

  // Convert to RoutePoint[] for the map
  const routeStops: RoutePoint[] = stops.map((s) => ({
    lat: s.lat,
    lng: s.lng,
    label: s.name || `Stop ${s.sequence}`,
  }));

  // ---- Geofencing tab data
  const containment = useMemo(() => {
    const find = (pt: { lat: number; lng: number } | null) =>
      pt ? fences.find((f) => insideFence(pt, f)) : undefined;
    return {
      departure: find(departure),
      destination: find(destination),
      stops: stops.map((s) => ({
        stop: s,
        fence: s.lat != null && s.lng != null ? find({ lat: s.lat, lng: s.lng }) : undefined,
      })),
    };
  }, [fences, departure, destination, stops]);

  // ---- Optimization
  const optimized = useMemo(() => {
    if (!departure) return null;
    const order = optimizeStopOrder(departure, destination, stops);
    const currentKm = totalRouteKm(departure, destination, stops);
    const optimizedKm = totalRouteKm(departure, destination, order);
    const changed = order.some((s, i) => stops[i]?.id !== s.id);
    return {
      order,
      currentKm,
      optimizedKm,
      savedKm: Math.max(0, currentKm - optimizedKm),
      changed,
    };
  }, [departure, destination, stops]);

  const reorderMut = useMutation({
    mutationFn: async (newOrder: Stop[]) => {
      // Two-phase update to avoid unique-constraint clashes if any
      const offsets = newOrder.map((s, idx) => ({
        id: s.id,
        seq: idx + 1 + 1000,
      }));
      for (const o of offsets) {
        await (supabase as any)
          .from("vehicle_request_stops")
          .update({ sequence: o.seq })
          .eq("id", o.id);
      }
      for (let i = 0; i < newOrder.length; i++) {
        await (supabase as any)
          .from("vehicle_request_stops")
          .update({ sequence: i + 1 })
          .eq("id", newOrder[i].id);
      }
    },
    onSuccess: () => {
      toast.success("Stops reordered");
      queryClient.invalidateQueries({
        queryKey: ["vehicle-request-stops", request.id],
      });
    },
    onError: (e: any) => toast.error(e?.message || "Reorder failed"),
  });

  // ---- Navigate
  const mapsUrl = departure ? buildGoogleMapsUrl(departure, destination, stops) : null;
  const sendNavMut = useMutation({
    mutationFn: async () => {
      if (!mapsUrl) throw new Error("Route is missing coordinates");
      // Pull driver phone
      let phone: string | null = null;
      if (request.assigned_driver_id) {
        const { data } = await supabase
          .from("drivers")
          .select("phone")
          .eq("id", request.assigned_driver_id)
          .maybeSingle();
        phone = data?.phone || null;
      }
      if (!phone) throw new Error("No assigned driver phone on file");
      const ok = await notifyNavigationSms({
        driverPhone: phone,
        requestNumber: request.request_number,
        mapsUrl,
      });
      if (!ok) throw new Error("SMS send failed");
    },
    onSuccess: () => toast.success("Navigation link sent to driver"),
    onError: (e: any) => toast.error(e?.message || "Send failed"),
  });

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-4 py-2 bg-muted/40 border-b border-border/40 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
          Operator Tools
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="p-3">
        <TabsList className="grid grid-cols-4 w-full h-9">
          <TabsTrigger value="geofencing" className="text-xs">
            <MapPin className="w-3.5 h-3.5 mr-1" /> Geofence
          </TabsTrigger>
          <TabsTrigger value="optimization" className="text-xs">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Optimize
          </TabsTrigger>
          <TabsTrigger value="consolidation" className="text-xs">
            <Layers className="w-3.5 h-3.5 mr-1" /> Consolidate
          </TabsTrigger>
          <TabsTrigger value="navigate" className="text-xs">
            <Navigation className="w-3.5 h-3.5 mr-1" /> Navigate
          </TabsTrigger>
        </TabsList>

        {/* GEOFENCING ----------------------------------------------------- */}
        <TabsContent value="geofencing" className="mt-3 space-y-2">
          {fencesQuery.isLoading ? (
            <div className="text-xs text-muted-foreground py-4 text-center">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Loading geofences…
            </div>
          ) : fences.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              No active geofences in this organisation.
            </div>
          ) : (
            <>
              <div className="text-[11px] text-muted-foreground">
                {fences.length} active geofence{fences.length !== 1 ? "s" : ""} checked
                against this trip.
              </div>
              <div className="space-y-1.5">
                <FenceRow
                  label="Departure"
                  pt={departure}
                  fence={containment.departure}
                  dotClass="bg-emerald-500"
                />
                {containment.stops.map((s, i) => (
                  <FenceRow
                    key={s.stop.id}
                    label={`Stop ${i + 1}${s.stop.name ? ` · ${s.stop.name}` : ""}`}
                    pt={s.stop.lat != null && s.stop.lng != null ? { lat: s.stop.lat, lng: s.stop.lng } : null}
                    fence={s.fence}
                    dotClass="bg-amber-500"
                  />
                ))}
                <FenceRow
                  label="Destination"
                  pt={destination}
                  fence={containment.destination}
                  dotClass="bg-rose-500"
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* OPTIMIZATION --------------------------------------------------- */}
        <TabsContent value="optimization" className="mt-3 space-y-3">
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1">
              <Route className="w-3 h-3" /> Stop reordering
            </div>
            {!departure ? (
              <div className="text-xs text-muted-foreground">
                Departure coordinates missing — cannot optimise.
              </div>
            ) : stops.length < 2 ? (
              <div className="text-xs text-muted-foreground">
                Need at least 2 intermediate stops to optimise the order.
              </div>
            ) : (
              <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Current</span>
                  <span className="font-medium">
                    {optimized?.currentKm.toFixed(1)} km
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Optimised (nearest-neighbour)</span>
                  <span className="font-medium text-success">
                    {optimized?.optimizedKm.toFixed(1)} km
                  </span>
                </div>
                {optimized && optimized.savedKm > 0.05 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Saving</span>
                    <Badge variant="secondary" className="text-[10px]">
                      −{optimized.savedKm.toFixed(1)} km
                    </Badge>
                  </div>
                )}
                {optimized?.changed && (
                  <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    New order:{" "}
                    {optimized.order
                      .map((s, i) => `${i + 1}. ${s.name || "stop"}`)
                      .join("  →  ")}
                  </div>
                )}
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={
                      !optimized?.changed ||
                      reorderMut.isPending ||
                      !canManage
                    }
                    onClick={() => optimized && reorderMut.mutate(optimized.order)}
                  >
                    {reorderMut.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 mr-1" />
                    )}
                    {optimized?.changed ? "Apply optimised order" : "Already optimal"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {request.status === "approved" && canManage && onAssignViaPicker && onUnavailable && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Best vehicle &amp; driver
              </div>
              <PoolAssignmentPicker
                request={request}
                organizationId={request.organization_id}
                isAssigning={isAssigning}
                onAssign={onAssignViaPicker}
                onUnavailable={onUnavailable}
                primaryLabel="Assign"
              />
            </div>
          )}
        </TabsContent>

        {/* CONSOLIDATION ------------------------------------------------- */}
        <TabsContent value="consolidation" className="mt-3">
          <ConsolidationPanel organizationId={request.organization_id} />
        </TabsContent>

        {/* NAVIGATE ------------------------------------------------------ */}
        <TabsContent value="navigate" className="mt-3 space-y-3">
          <RouteMapPreview
            departure={
              departure
                ? { lat: departure.lat, lng: departure.lng, label: request.departure_place }
                : undefined
            }
            destination={
              destination
                ? { lat: destination.lat, lng: destination.lng, label: request.destination }
                : undefined
            }
            stops={routeStops}
            heightPx={260}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!mapsUrl}
              onClick={() => mapsUrl && window.open(mapsUrl, "_blank", "noopener")}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open in Google Maps
            </Button>
            <Button
              size="sm"
              variant="default"
              disabled={!mapsUrl || sendNavMut.isPending || !canManage}
              onClick={() => sendNavMut.mutate()}
            >
              {sendNavMut.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1" />
              )}
              SMS link to driver
            </Button>
          </div>
          {!request.assigned_driver_id && (
            <div className="text-[11px] text-muted-foreground">
              Assign a driver first to enable the SMS option.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ----- subcomponents -------------------------------------------------------

const FenceRow = ({
  label,
  pt,
  fence,
  dotClass,
}: {
  label: string;
  pt: { lat: number; lng: number } | null;
  fence?: Geofence;
  dotClass: string;
}) => (
  <div className="flex items-center justify-between text-xs rounded-md border border-border/40 bg-background/40 px-2.5 py-1.5">
    <div className="flex items-center gap-2 min-w-0">
      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
      <span className="truncate">{label}</span>
    </div>
    {pt ? (
      fence ? (
        <Badge variant="default" className="text-[10px]">
          <MapPin className="w-2.5 h-2.5 mr-1" />
          {fence.name}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          Outside any fence
        </Badge>
      )
    ) : (
      <Badge variant="outline" className="text-[10px] text-muted-foreground">
        No coordinates
      </Badge>
    )}
  </div>
);
