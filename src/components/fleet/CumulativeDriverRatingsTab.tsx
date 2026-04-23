import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Star, Info } from "lucide-react";
import { useDriverScores } from "@/hooks/useDriverScores";
import { useFleetPassengerFeedback } from "@/hooks/useDriverPassengerFeedback";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Issue #99 — Cumulative Driver Rating
 * --------------------------------------
 * Combines four criteria into a single weighted score (out of 5):
 *   • Safety / Behavior  40%   (telemetry — overall_score / 20)
 *   • Passenger: Driver  25%   (avgDriver)
 *   • Passenger: Vehicle 15%   (avgVehicle)
 *   • Punctuality        20%   (avgPunctuality)
 *
 * Drivers without any passenger ratings show only the safety dimension and
 * are flagged as "Insufficient feedback" so reviewers can chase data.
 */

const WEIGHTS = {
  safety: 0.4,
  driver: 0.25,
  vehicle: 0.15,
  punctuality: 0.2,
} as const;

const fmt = (n: number | null | undefined, dp = 2) =>
  n == null || Number.isNaN(n) ? "—" : n.toFixed(dp);

const ratingBadge = (cum: number | null) => {
  if (cum == null) return <Badge variant="outline">No data</Badge>;
  if (cum >= 4.5) return <Badge className="bg-success text-success-foreground">Excellent</Badge>;
  if (cum >= 4.0) return <Badge className="bg-primary text-primary-foreground">Good</Badge>;
  if (cum >= 3.0) return <Badge className="bg-warning text-warning-foreground">Fair</Badge>;
  if (cum >= 2.0) return <Badge variant="destructive">Poor</Badge>;
  return <Badge variant="destructive">Critical</Badge>;
};

const Stars = ({ value }: { value: number | null }) => {
  if (value == null) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      <span className="font-medium tabular-nums">{value.toFixed(2)}</span>
    </div>
  );
};

export const CumulativeDriverRatingsTab = () => {
  const { driverScores } = useDriverScores();
  const { data: passengerFeedback = {} } = useFleetPassengerFeedback();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const driverMap = new Map<
      string,
      {
        driverId: string;
        name: string;
        avatar: string | null;
        plate: string | null;
        safety5: number | null;
        avgDriver: number | null;
        avgVehicle: number | null;
        avgPunctuality: number | null;
        ratedTrips: number;
        cumulative: number | null;
        components: number;
      }
    >();

    (driverScores || []).forEach((s) => {
      if (!s.driver_id) return;
      const safety5 = s.overall_score != null ? s.overall_score / 20 : null;
      driverMap.set(s.driver_id, {
        driverId: s.driver_id,
        name: s.driver ? `${s.driver.first_name} ${s.driver.last_name}` : "Unknown driver",
        avatar: s.driver?.avatar_url || null,
        plate: s.vehicle?.plate_number || null,
        safety5,
        avgDriver: null,
        avgVehicle: null,
        avgPunctuality: null,
        ratedTrips: 0,
        cumulative: null,
        components: 0,
      });
    });

    Object.entries(passengerFeedback).forEach(([driverId, fb]) => {
      const existing = driverMap.get(driverId) || {
        driverId,
        name: "Driver " + driverId.slice(0, 6),
        avatar: null,
        plate: null,
        safety5: null,
        avgDriver: null,
        avgVehicle: null,
        avgPunctuality: null,
        ratedTrips: 0,
        cumulative: null,
        components: 0,
      };
      existing.avgDriver = fb.avgDriver;
      existing.avgVehicle = fb.avgVehicle;
      existing.avgPunctuality = fb.avgPunctuality;
      existing.ratedTrips = fb.totalRated;
      driverMap.set(driverId, existing);
    });

    // Compute weighted cumulative (renormalize over present components)
    driverMap.forEach((row) => {
      const parts: { value: number; weight: number }[] = [];
      if (row.safety5 != null) parts.push({ value: row.safety5, weight: WEIGHTS.safety });
      if (row.avgDriver != null) parts.push({ value: row.avgDriver, weight: WEIGHTS.driver });
      if (row.avgVehicle != null) parts.push({ value: row.avgVehicle, weight: WEIGHTS.vehicle });
      if (row.avgPunctuality != null) parts.push({ value: row.avgPunctuality, weight: WEIGHTS.punctuality });
      row.components = parts.length;
      if (parts.length === 0) {
        row.cumulative = null;
      } else {
        const totalWeight = parts.reduce((a, p) => a + p.weight, 0);
        row.cumulative =
          parts.reduce((a, p) => a + p.value * p.weight, 0) / (totalWeight || 1);
      }
    });

    const arr = Array.from(driverMap.values());
    const q = search.trim().toLowerCase();
    const filtered = q ? arr.filter((r) => r.name.toLowerCase().includes(q)) : arr;
    return filtered.sort((a, b) => (b.cumulative ?? -1) - (a.cumulative ?? -1));
  }, [driverScores, passengerFeedback, search]);

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              Cumulative Driver Ratings
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Weighted score (out of 5) combining telemetry safety (40%),
                      passenger driver rating (25%), vehicle rating (15%) and
                      punctuality (20%). Missing components are renormalized.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>
              Per-criteria ratings combined into a single weighted score for each driver.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search driver..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Rank</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead className="text-center">Safety (40%)</TableHead>
                <TableHead className="text-center">Driver (25%)</TableHead>
                <TableHead className="text-center">Vehicle (15%)</TableHead>
                <TableHead className="text-center">Punctuality (20%)</TableHead>
                <TableHead className="text-center">Rated Trips</TableHead>
                <TableHead className="text-center">Cumulative</TableHead>
                <TableHead>Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No drivers with rating data yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r, i) => (
                <TableRow key={r.driverId}>
                  <TableCell className="font-bold text-muted-foreground">#{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={r.avatar || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {initials(r.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium leading-tight">{r.name}</div>
                        {r.plate && (
                          <div className="text-xs text-muted-foreground">{r.plate}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Stars value={r.safety5} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Stars value={r.avgDriver} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Stars value={r.avgVehicle} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Stars value={r.avgPunctuality} />
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums">
                    {r.ratedTrips}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-lg font-bold tabular-nums">
                      {fmt(r.cumulative)}
                    </span>
                    {r.components > 0 && r.components < 4 && (
                      <div className="text-[10px] text-muted-foreground">
                        {r.components}/4 inputs
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{ratingBadge(r.cumulative)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
