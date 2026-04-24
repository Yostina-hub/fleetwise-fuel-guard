/**
 * AssignmentDetailsPanel
 * ----------------------
 * Rich, read-only context panel rendered above the assignment picker in the
 * request detail view. Surfaces every detail an operator needs before
 * confirming a vehicle/driver assignment so they don't have to bounce between
 * pages:
 *   • Vehicle  → specs & capacity, live GPS/fuel, compliance docs, recent usage
 *   • Driver   → identity & contact, license & training, performance, schedule
 *   • Trip     → route summary, ETA, estimated cost, SMS preview
 *
 * Receives the currently selected vehicleId / driverId from the parent so the
 * details stay in sync with the picker.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, formatDistanceToNow, isAfter, addDays } from "date-fns";
import {
  Truck,
  User,
  MapPin,
  Fuel,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  Calendar,
  Award,
  AlertTriangle,
  Activity,
  Clock,
  DollarSign,
  MessageSquare,
  Wrench,
  Briefcase,
} from "lucide-react";

interface Props {
  request: any;
  vehicleId?: string;
  driverId?: string;
}

const FUEL_PRICE_ETB_PER_L = 95; // org-default; falls back if no setting

export const AssignmentDetailsPanel = ({ request, vehicleId, driverId }: Props) => {
  // ── Vehicle full record ──────────────────────────────────────────────────
  const { data: vehicle } = useQuery({
    queryKey: ["assign-vehicle-detail", vehicleId],
    enabled: !!vehicleId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select(
          "id, plate_number, make, model, year, color, vehicle_type, fuel_type, tank_capacity_liters, odometer_km, status, registration_expiry, insurance_expiry, permit_expiry, capacity_kg, capacity_volume",
        )
        .eq("id", vehicleId!)
        .maybeSingle();
      return data;
    },
  });

  // Live telemetry (GPS / fuel / ignition / odometer / last comm)
  const { data: telemetry } = useQuery({
    queryKey: ["assign-vehicle-telemetry", vehicleId],
    enabled: !!vehicleId,
    refetchInterval: 30_000,
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicle_telemetry")
        .select(
          "latitude, longitude, fuel_level_percent, ignition_on, engine_on, odometer_km, last_communication_at, speed_kmh",
        )
        .eq("vehicle_id", vehicleId!)
        .maybeSingle();
      return data;
    },
  });

  // Open work-orders + recent trip
  const { data: openWO = 0 } = useQuery({
    queryKey: ["assign-vehicle-open-wo", vehicleId],
    enabled: !!vehicleId,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("work_orders" as any)
        .select("id", { count: "exact", head: true })
        .eq("vehicle_id", vehicleId!)
        .in("status", ["open", "in_progress", "pending"]);
      return count ?? 0;
    },
  });

  const { data: recentTrip } = useQuery({
    queryKey: ["assign-vehicle-last-trip", vehicleId],
    enabled: !!vehicleId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicle_requests")
        .select("request_number, destination, completed_at, needed_from")
        .eq("assigned_vehicle_id", vehicleId!)
        .neq("id", request.id)
        .order("needed_from", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Conflicting bookings TODAY for this vehicle
  const { data: conflictCount = 0 } = useQuery({
    queryKey: ["assign-vehicle-conflicts", vehicleId, request.needed_from, request.needed_until],
    enabled: !!vehicleId && !!request.needed_from,
    staleTime: 30_000,
    queryFn: async () => {
      const from = request.needed_from;
      const until = request.needed_until || request.needed_from;
      const { count } = await supabase
        .from("vehicle_requests")
        .select("id", { count: "exact", head: true })
        .eq("assigned_vehicle_id", vehicleId!)
        .neq("id", request.id)
        .in("status", ["assigned", "approved"])
        .lte("needed_from", until)
        .gte("needed_until", from);
      return count ?? 0;
    },
  });

  // ── Driver full record ───────────────────────────────────────────────────
  const { data: driver } = useQuery({
    queryKey: ["assign-driver-detail", driverId],
    enabled: !!driverId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("drivers")
        .select(
          "id, first_name, last_name, phone, email, employee_id, department, license_number, license_class, license_expiry, medical_certificate_expiry, safety_score, total_trips, total_distance_km, status, avatar_url, hire_date, experience_years",
        )
        .eq("id", driverId!)
        .maybeSingle();
      return data;
    },
  });

  // Driver penalties (last 90 days) — best-effort, optional table
  const { data: recentPenalties = 0 } = useQuery({
    queryKey: ["assign-driver-penalties", driverId],
    enabled: !!driverId,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("driver_penalties" as any)
        .select("id", { count: "exact", head: true })
        .eq("driver_id", driverId!)
        .gte("created_at", since);
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Today's other assignments + (best-effort) leave today
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const todayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, []);

  const { data: driverToday = 0 } = useQuery({
    queryKey: ["assign-driver-today", driverId, todayStart],
    enabled: !!driverId,
    staleTime: 30_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("vehicle_requests")
        .select("id", { count: "exact", head: true })
        .eq("assigned_driver_id", driverId!)
        .neq("id", request.id)
        .gte("needed_from", todayStart)
        .lte("needed_from", todayEnd);
      return count ?? 0;
    },
  });

  // ── Trip distance / ETA / cost estimate ──────────────────────────────────
  const distanceKm = useMemo(() => {
    if (request.distance_log_km) return Number(request.distance_log_km);
    const lat1 = request.departure_lat;
    const lng1 = request.departure_lng;
    const lat2 = request.destination_lat;
    const lng2 = request.destination_lng;
    if ([lat1, lng1, lat2, lng2].some((v) => v == null)) return null;
    const R = 6371;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 1.25); // 25% road factor
  }, [request]);

  const etaMinutes = distanceKm != null ? Math.round((distanceKm / 40) * 60) : null; // 40 km/h avg

  const tripHours = useMemo(() => {
    if (!request.needed_from || !request.needed_until) return null;
    const ms =
      new Date(request.needed_until).getTime() - new Date(request.needed_from).getTime();
    return Math.max(1, Math.round(ms / 3_600_000));
  }, [request]);

  const fuelCost = useMemo(() => {
    if (!distanceKm) return null;
    // ~10 km/L average for sedans; bus/truck heavier (~5)
    const kmpl = vehicle?.vehicle_type?.toLowerCase().includes("bus") || vehicle?.vehicle_type?.toLowerCase().includes("truck") ? 5 : 10;
    const litres = distanceKm / kmpl;
    return Math.round(litres * FUEL_PRICE_ETB_PER_L);
  }, [distanceKm, vehicle]);

  const driverCost = useMemo(() => {
    if (!tripHours) return null;
    return tripHours * 150; // ETB / hr placeholder
  }, [tripHours]);

  const totalCost =
    fuelCost != null && driverCost != null ? fuelCost + driverCost : fuelCost ?? driverCost;

  // ── SMS preview text (mirrors notifyAssignmentSms format) ────────────────
  const smsPreview = useMemo(() => {
    if (!vehicle || !driver) return null;
    const sched = request.needed_from
      ? format(new Date(request.needed_from), "MMM dd, h:mm a")
      : "TBD";
    return [
      `Hi ${driver.first_name}, you've been assigned to trip ${request.request_number}.`,
      `Vehicle: ${vehicle.plate_number}`,
      `Route: ${request.departure_place || "TBD"} → ${request.destination || "TBD"}`,
      `When: ${sched}`,
      `Open the Driver Portal for details.`,
    ].join("\n");
  }, [vehicle, driver, request]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const expiryStatus = (date?: string | null) => {
    if (!date) return { ok: false, label: "Missing", tone: "destructive" as const };
    const d = new Date(date);
    if (isAfter(new Date(), d)) return { ok: false, label: "Expired", tone: "destructive" as const };
    if (isAfter(addDays(new Date(), 30), d))
      return { ok: false, label: "Expiring soon", tone: "warning" as const };
    return { ok: true, label: format(d, "MMM dd, yyyy"), tone: "ok" as const };
  };

  if (!vehicleId && !driverId) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        Select a vehicle and driver below to see full assignment details.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
        <Activity className="w-3 h-3 text-primary" />
        Assignment details
        <span className="text-muted-foreground/60 normal-case font-normal">
          — review before confirming
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        {/* ───── VEHICLE CARD ───── */}
        {vehicle && (
          <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
            <div className="px-3 py-2 bg-muted/40 border-b border-border/40 flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold">Vehicle</span>
              <Badge variant="outline" className="ml-auto font-mono text-[10px]">
                {vehicle.plate_number}
              </Badge>
            </div>
            <div className="p-3 space-y-3 text-xs">
              {/* Specs & capacity */}
              <Section icon={<Briefcase className="w-3 h-3" />} title="Specs & capacity">
                <Row k="Make / Model" v={`${vehicle.make} ${vehicle.model} · ${vehicle.year}`} />
                <Row k="Type" v={vehicle.vehicle_type || "—"} />
                <Row k="Fuel" v={vehicle.fuel_type || "—"} />
                {vehicle.tank_capacity_liters && (
                  <Row k="Tank" v={`${vehicle.tank_capacity_liters} L`} />
                )}
                {vehicle.capacity_kg && <Row k="Cargo" v={`${vehicle.capacity_kg} kg`} />}
              </Section>

              {/* Live status */}
              <Section icon={<Gauge className="w-3 h-3" />} title="Live status">
                {telemetry ? (
                  <>
                    <Row
                      k="Position"
                      v={
                        telemetry.latitude && telemetry.longitude
                          ? `${Number(telemetry.latitude).toFixed(4)}, ${Number(telemetry.longitude).toFixed(4)}`
                          : "No GPS"
                      }
                    />
                    <Row
                      k="Fuel"
                      v={
                        telemetry.fuel_level_percent != null ? (
                          <span className="flex items-center gap-1">
                            <Fuel className="w-3 h-3" />
                            {Number(telemetry.fuel_level_percent).toFixed(0)}%
                          </span>
                        ) : "—"
                      }
                    />
                    <Row
                      k="Ignition"
                      v={
                        <Badge variant={telemetry.ignition_on ? "default" : "secondary"} className="text-[10px] py-0">
                          {telemetry.ignition_on ? "ON" : "OFF"}
                        </Badge>
                      }
                    />
                    <Row k="Odometer" v={`${Math.round(Number(telemetry.odometer_km ?? vehicle.odometer_km ?? 0)).toLocaleString()} km`} />
                    {telemetry.last_communication_at && (
                      <Row
                        k="Last ping"
                        v={formatDistanceToNow(new Date(telemetry.last_communication_at), { addSuffix: true })}
                      />
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground italic">No live telemetry available</p>
                )}
              </Section>

              {/* Compliance */}
              <Section icon={<ShieldCheck className="w-3 h-3" />} title="Compliance">
                <ExpiryRow label="Registration" date={vehicle.registration_expiry} />
                <ExpiryRow label="Insurance" date={vehicle.insurance_expiry} />
                <ExpiryRow label="Permit" date={vehicle.permit_expiry} />
                <Row
                  k="Open work orders"
                  v={
                    openWO > 0 ? (
                      <Badge variant="destructive" className="text-[10px] py-0 gap-1">
                        <Wrench className="w-2.5 h-2.5" /> {openWO}
                      </Badge>
                    ) : (
                      <span className="text-emerald-600">None</span>
                    )
                  }
                />
              </Section>

              {/* Recent usage */}
              <Section icon={<Clock className="w-3 h-3" />} title="Recent usage">
                {recentTrip ? (
                  <Row
                    k="Last trip"
                    v={`${recentTrip.request_number} → ${recentTrip.destination || "—"}`}
                  />
                ) : (
                  <Row k="Last trip" v="No history" />
                )}
                <Row
                  k="Conflicts"
                  v={
                    conflictCount > 0 ? (
                      <Badge variant="destructive" className="text-[10px] py-0 gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> {conflictCount} overlapping
                      </Badge>
                    ) : (
                      <span className="text-emerald-600">None in window</span>
                    )
                  }
                />
              </Section>
            </div>
          </div>
        )}

        {/* ───── DRIVER CARD ───── */}
        {driver && (
          <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
            <div className="px-3 py-2 bg-muted/40 border-b border-border/40 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold">Driver</span>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {driver.status}
              </Badge>
            </div>
            <div className="p-3 space-y-3 text-xs">
              {/* Identity & contact */}
              <Section icon={<User className="w-3 h-3" />} title="Identity & contact">
                <div className="flex items-center gap-2 mb-1">
                  {driver.avatar_url ? (
                    <img
                      src={driver.avatar_url}
                      alt={`${driver.first_name} ${driver.last_name}`}
                      className="w-9 h-9 rounded-full object-cover border border-border/40"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                      {driver.first_name?.[0]}
                      {driver.last_name?.[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {driver.first_name} {driver.last_name}
                    </div>
                    {driver.employee_id && (
                      <div className="text-[10px] text-muted-foreground font-mono">
                        ID: {driver.employee_id}
                      </div>
                    )}
                  </div>
                </div>
                {driver.phone && (
                  <Row k={<><Phone className="inline w-2.5 h-2.5 mr-1" />Phone</>} v={driver.phone} />
                )}
                {driver.email && (
                  <Row k={<><Mail className="inline w-2.5 h-2.5 mr-1" />Email</>} v={driver.email} />
                )}
                {driver.department && <Row k="Department" v={driver.department} />}
              </Section>

              {/* License & training */}
              <Section icon={<Award className="w-3 h-3" />} title="License & training">
                <Row k="License #" v={driver.license_number || "—"} />
                <Row k="Class" v={driver.license_class || "—"} />
                <ExpiryRow label="License expiry" date={driver.license_expiry} />
                <ExpiryRow label="Medical cert" date={driver.medical_certificate_expiry} />
              </Section>

              {/* Performance */}
              <Section icon={<Activity className="w-3 h-3" />} title="Performance">
                <Row
                  k="Safety score"
                  v={
                    <span
                      className={
                        Number(driver.safety_score ?? 0) >= 85
                          ? "text-emerald-600 font-medium"
                          : Number(driver.safety_score ?? 0) >= 60
                            ? "text-amber-600 font-medium"
                            : "text-destructive font-medium"
                      }
                    >
                      {Number(driver.safety_score ?? 0).toFixed(0)} / 100
                    </span>
                  }
                />
                <Row k="Total trips" v={(driver.total_trips ?? 0).toLocaleString()} />
                <Row
                  k="Distance driven"
                  v={`${Number(driver.total_distance_km ?? 0).toLocaleString()} km`}
                />
                <Row
                  k="Penalties (90d)"
                  v={
                    recentPenalties > 0 ? (
                      <Badge variant="destructive" className="text-[10px] py-0">
                        {recentPenalties}
                      </Badge>
                    ) : (
                      <span className="text-emerald-600">Clean</span>
                    )
                  }
                />
                {driver.experience_years != null && (
                  <Row k="Experience" v={`${driver.experience_years} years`} />
                )}
              </Section>

              {/* Schedule */}
              <Section icon={<Calendar className="w-3 h-3" />} title="Schedule">
                <Row
                  k="Other trips today"
                  v={
                    driverToday > 0 ? (
                      <Badge variant="outline" className="text-[10px] py-0 border-amber-500/40 text-amber-600">
                        {driverToday}
                      </Badge>
                    ) : (
                      <span className="text-emerald-600">Free</span>
                    )
                  }
                />
                {driver.hire_date && (
                  <Row k="Hired" v={format(new Date(driver.hire_date), "MMM yyyy")} />
                )}
              </Section>
            </div>
          </div>
        )}
      </div>

      {/* ───── TRIP CARD ───── */}
      <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
        <div className="px-3 py-2 bg-muted/40 border-b border-border/40 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold">Trip & cost</span>
        </div>
        <div className="p-3 grid sm:grid-cols-3 gap-3 text-xs">
          {/* Route summary */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
              Route
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground">From</div>
                <div className="truncate">{request.departure_place || "—"}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground">To</div>
                <div className="truncate">{request.destination || "—"}</div>
              </div>
            </div>
            <Separator className="my-1" />
            <Row k="Distance" v={distanceKm != null ? `${distanceKm} km` : "—"} />
            <Row
              k="ETA"
              v={
                etaMinutes != null
                  ? etaMinutes >= 60
                    ? `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60}m`
                    : `${etaMinutes} min`
                  : "—"
              }
            />
          </div>

          {/* Estimated cost */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Estimated cost
            </div>
            <Row k="Fuel" v={fuelCost != null ? `${fuelCost.toLocaleString()} ETB` : "—"} />
            <Row
              k="Driver hours"
              v={
                tripHours != null
                  ? `${tripHours} h × 150 = ${(driverCost ?? 0).toLocaleString()} ETB`
                  : "—"
              }
            />
            <Separator className="my-1" />
            <Row
              k="Total"
              v={
                <span className="font-semibold text-foreground">
                  {totalCost != null ? `${totalCost.toLocaleString()} ETB` : "—"}
                </span>
              }
            />
            <p className="text-[10px] text-muted-foreground italic pt-1">
              Indicative only · based on {distanceKm ?? 0} km Haversine + 25% road factor
            </p>
          </div>

          {/* SMS preview */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> SMS preview
            </div>
            {smsPreview ? (
              <>
                <pre className="text-[11px] whitespace-pre-wrap bg-muted/40 rounded border border-border/40 p-2 max-h-32 overflow-y-auto leading-snug">
                  {smsPreview}
                </pre>
                <p className="text-[10px] text-muted-foreground">
                  Sent to {driver?.phone || "(no driver phone)"}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground italic">
                Select vehicle + driver to preview SMS.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────
const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1">
      {icon} {title}
    </div>
    <div className="space-y-1">{children}</div>
  </div>
);

const Row = ({ k, v }: { k: React.ReactNode; v: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-2 min-w-0">
    <span className="text-muted-foreground shrink-0">{k}</span>
    <span className="text-foreground text-right truncate">{v}</span>
  </div>
);

const ExpiryRow = ({ label, date }: { label: string; date?: string | null }) => {
  const d = date ? new Date(date) : null;
  const expired = d ? isAfter(new Date(), d) : true;
  const soon = d ? !expired && isAfter(addDays(new Date(), 30), d) : false;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      {!d ? (
        <Badge variant="destructive" className="text-[10px] py-0 gap-1">
          <ShieldAlert className="w-2.5 h-2.5" /> Missing
        </Badge>
      ) : expired ? (
        <Badge variant="destructive" className="text-[10px] py-0">
          Expired {format(d, "MMM yyyy")}
        </Badge>
      ) : soon ? (
        <Badge variant="outline" className="text-[10px] py-0 border-amber-500/40 text-amber-600">
          Expires {format(d, "MMM dd, yyyy")}
        </Badge>
      ) : (
        <span className="text-emerald-600 text-[11px]">{format(d, "MMM dd, yyyy")}</span>
      )}
    </div>
  );
};
