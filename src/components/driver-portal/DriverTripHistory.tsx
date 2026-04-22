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
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) || [];
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
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No trips in {RANGE_LABEL[range].toLowerCase()}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Start</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Avg / Max Speed</TableHead>
                      <TableHead>Fuel</TableHead>
                      <TableHead>Idle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((t) => (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate(`/route-history?tripId=${t.id}`)
                        }
                      >
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <div>
                              <p className="text-xs font-medium">
                                {format(new Date(t.start_time), "MMM d, HH:mm")}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(t.start_time), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
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
                              <span className="font-medium">
                                {t.vehicle.plate_number}
                              </span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {t.distance_km
                            ? `${Number(t.distance_km).toFixed(1)} km`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {formatDuration(t.duration_minutes)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs">
                            <Gauge className="w-3 h-3 text-muted-foreground" />
                            {t.avg_speed_kmh
                              ? `${Number(t.avg_speed_kmh).toFixed(0)}`
                              : "—"}
                            {" / "}
                            {t.max_speed_kmh
                              ? `${Number(t.max_speed_kmh).toFixed(0)} km/h`
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {t.fuel_consumed_liters
                            ? `${Number(t.fuel_consumed_liters).toFixed(1)} L`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {t.idle_time_minutes
                            ? `${Math.round(t.idle_time_minutes)}m`
                            : "—"}
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
