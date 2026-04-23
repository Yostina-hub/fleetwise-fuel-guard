import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, subDays, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePagination } from "@/components/reports/TablePagination";
import { formatTripLocation } from "@/lib/formatTripLocation";
import {
  Clock,
  MapPin,
  Route,
  Fuel,
  Gauge,
  Car,
  ChevronRight,
  TrendingUp,
  Timer,
  Activity,
} from "lucide-react";

interface DriverTripHistoryProps {
  driverId?: string | null;
}

const ITEMS_PER_PAGE = 10;
type RangeKey = "7" | "30" | "90" | "all";

const RANGE_LABEL: Record<RangeKey, string> = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  all: "All time",
};

const DriverTripHistory = ({ driverId }: DriverTripHistoryProps) => {
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeKey>("30");
  const [page, setPage] = useState(1);

  const fromDate = useMemo(() => {
    if (range === "all") return null;
    return startOfDay(subDays(new Date(), Number(range))).toISOString();
  }, [range]);

  const { data: trips, isLoading } = useQuery({
    queryKey: ["driver-trip-history", driverId, range],
    queryFn: async () => {
      if (!driverId) return [];

      // 1) Telemetry-derived trips
      let q = supabase
        .from("trips")
        .select(
          `id, start_time, end_time, start_location, end_location,
           distance_km, duration_minutes, avg_speed_kmh, max_speed_kmh,
           fuel_consumed_liters, idle_time_minutes, status,
           vehicle:vehicles(plate_number, make, model)`
        )
        .eq("driver_id", driverId)
        .order("start_time", { ascending: false })
        .limit(500);
      if (fromDate) q = q.gte("start_time", fromDate);
      const { data: tripRows, error } = await q;
      if (error) throw error;

      // 2) Completed vehicle requests (driver self check-in/out flow).
      //    These never produce a `trips` row, so we synthesize one so the
      //    history tab always reflects what the driver actually did.
      let rq = (supabase as any)
        .from("vehicle_requests")
        .select(
          `id, request_number, status, purpose,
           departure_place, destination,
           driver_checked_in_at, driver_checked_out_at,
           driver_checkin_odometer, driver_checkout_odometer,
           driver_checkout_notes, completed_at,
           assigned_vehicle:assigned_vehicle_id(plate_number, make, model)`
        )
        .eq("assigned_driver_id", driverId)
        .not("driver_checked_out_at", "is", null)
        .order("driver_checked_out_at", { ascending: false })
        .limit(500);
      if (fromDate) rq = rq.gte("driver_checked_out_at", fromDate);
      const { data: requestRows } = await rq;

      const synthesized = (requestRows || []).map((r: any) => {
        const start = r.driver_checked_in_at || r.completed_at || r.driver_checked_out_at;
        const end = r.driver_checked_out_at || r.completed_at;
        const distance =
          r.driver_checkin_odometer != null && r.driver_checkout_odometer != null
            ? Math.max(0, Number(r.driver_checkout_odometer) - Number(r.driver_checkin_odometer))
            : null;
        const durationMinutes =
          start && end ? Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60000) : null;
        return {
          id: `vr-${r.id}`,
          source: "request" as const,
          start_time: start,
          end_time: end,
          start_location: r.departure_place ? { name: r.departure_place } : null,
          end_location: r.destination ? { name: r.destination } : null,
          distance_km: distance,
          duration_minutes: durationMinutes,
          avg_speed_kmh:
            distance != null && durationMinutes && durationMinutes > 0
              ? (distance / (durationMinutes / 60))
              : null,
          max_speed_kmh: null,
          fuel_consumed_liters: null,
          idle_time_minutes: null,
          status: r.status === "closed" ? "completed" : (r.status || "completed"),
          vehicle: r.assigned_vehicle || null,
          request_number: r.request_number,
          driver_checkout_notes: r.driver_checkout_notes,
        };
      });

      const all = [...((tripRows as any[]) || []), ...synthesized];
      all.sort((a, b) => {
        const ta = a.start_time ? new Date(a.start_time).getTime() : 0;
        const tb = b.start_time ? new Date(b.start_time).getTime() : 0;
        return tb - ta;
      });
      return all;
    },
    enabled: !!driverId,
  });

  const stats = useMemo(() => {
    const list = trips || [];
    const completed = list.filter((t) => t.status === "completed");
    const totalDistance = completed.reduce(
      (s, t) => s + Number(t.distance_km || 0),
      0
    );
    const totalDuration = completed.reduce(
      (s, t) => s + Number(t.duration_minutes || 0),
      0
    );
    const totalFuel = completed.reduce(
      (s, t) => s + Number(t.fuel_consumed_liters || 0),
      0
    );
    const avgSpeed =
      completed.length > 0
        ? completed.reduce((s, t) => s + Number(t.avg_speed_kmh || 0), 0) /
          completed.length
        : 0;
    return {
      totalTrips: list.length,
      completedTrips: completed.length,
      totalDistance,
      totalDuration,
      totalFuel,
      avgSpeed,
    };
  }, [trips]);

  const totalItems = trips?.length || 0;
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginated = (trips || []).slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const formatDuration = (minutes?: number | null) => {
    if (!minutes) return "—";
    const m = Math.round(Number(minutes));
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            Completed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
            In Progress
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!driverId) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        No driver profile linked.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Route className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Trips</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold">{stats.totalTrips}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1">
            {stats.completedTrips} completed
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Distance</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <p className="text-2xl font-bold">
              {stats.totalDistance.toFixed(0)}{" "}
              <span className="text-sm font-normal">km</span>
            </p>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Drive Time</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <p className="text-2xl font-bold">
              {formatDuration(stats.totalDuration)}
            </p>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Fuel className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Fuel Used</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <p className="text-2xl font-bold">
              {stats.totalFuel.toFixed(1)}{" "}
              <span className="text-sm font-normal">L</span>
            </p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1">
            Avg {stats.avgSpeed.toFixed(0)} km/h
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4 text-primary" /> Trip History
              <span className="text-xs font-normal text-muted-foreground">
                ({totalItems})
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={range}
                onValueChange={(v) => {
                  setRange(v as RangeKey);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RANGE_LABEL) as RangeKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {RANGE_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/route-history")}
              >
                Map view <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No trips in {RANGE_LABEL[range].toLowerCase()}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Trips appear here automatically after you complete a check-out.
              </p>
            </div>
          ) : (
            <>
              {/* ----- Mobile / narrow: card list (≤ md) ----- */}
              <ul className="md:hidden divide-y divide-border/40">
                {paginated.map((t) => (
                  <li
                    key={t.id}
                    className="px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/route-history?tripId=${t.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">
                            {t.start_time
                              ? format(new Date(t.start_time), "MMM d, yyyy · HH:mm")
                              : "—"}
                          </p>
                          {getStatusBadge(t.status)}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {t.start_time
                            ? formatDistanceToNow(new Date(t.start_time), { addSuffix: true })
                            : ""}
                        </p>
                        <div className="flex items-start gap-1.5 mt-2 text-xs text-foreground/90">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="line-clamp-2 break-words">
                            {formatTripLocation(t.start_location) || "—"}
                            <span className="text-muted-foreground"> → </span>
                            {formatTripLocation(t.end_location) || "—"}
                          </span>
                        </div>
                        {t.vehicle && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                            <Car className="w-3 h-3" />
                            <span className="font-medium text-foreground">
                              {t.vehicle.plate_number}
                            </span>
                            {(t.vehicle as any).make && (
                              <span>· {(t.vehicle as any).make} {(t.vehicle as any).model || ""}</span>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Distance</p>
                            <p className="text-xs font-semibold">
                              {t.distance_km != null ? `${Number(t.distance_km).toFixed(1)} km` : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Duration</p>
                            <p className="text-xs font-semibold">{formatDuration(t.duration_minutes)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg speed</p>
                            <p className="text-xs font-semibold">
                              {t.avg_speed_kmh ? `${Number(t.avg_speed_kmh).toFixed(0)} km/h` : "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </li>
                ))}
              </ul>

              {/* ----- Desktop: table (≥ md) ----- */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Start</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead className="text-right">Distance</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead className="text-right">Avg / Max</TableHead>
                      <TableHead className="text-right">Fuel</TableHead>
                      <TableHead className="text-right">Idle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((t) => (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/route-history?tripId=${t.id}`)}
                      >
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <div>
                              <p className="text-xs font-medium">
                                {t.start_time ? format(new Date(t.start_time), "MMM d, HH:mm") : "—"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {t.start_time
                                  ? formatDistanceToNow(new Date(t.start_time), { addSuffix: true })
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <div className="flex items-center gap-1 text-xs">
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate">
                              {formatTripLocation(t.start_location)} →{" "}
                              {formatTripLocation(t.end_location)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {t.vehicle ? (
                            <div className="flex items-center gap-1 text-xs">
                              <Car className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium">{t.vehicle.plate_number}</span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {t.distance_km != null ? `${Number(t.distance_km).toFixed(1)} km` : "—"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {formatDuration(t.duration_minutes)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 text-xs">
                            <Gauge className="w-3 h-3 text-muted-foreground" />
                            {t.avg_speed_kmh ? `${Number(t.avg_speed_kmh).toFixed(0)}` : "—"}
                            {" / "}
                            {t.max_speed_kmh ? `${Number(t.max_speed_kmh).toFixed(0)} km/h` : "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {t.fuel_consumed_liters
                            ? `${Number(t.fuel_consumed_liters).toFixed(1)} L`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {t.idle_time_minutes ? `${Math.round(t.idle_time_minutes)}m` : "—"}
                        </TableCell>
                        <TableCell>{getStatusBadge(t.status)}</TableCell>
                        <TableCell>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={page}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverTripHistory;
