/**
 * PoolAssignmentPicker
 * --------------------
 * Professional vehicle + driver picker used inside the Pool Supervisor Review
 * table. It mirrors the look of the request form: ranked suggestions, pool
 * badges, distance/geofence hints, and a primary "Assign & Approve" CTA.
 *
 * The picker is purely presentational — the parent owns the mutation. We just
 * surface selection state via callbacks.
 */
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CheckCircle,
  ChevronsUpDown,
  Crosshair,
  MapPin,
  Star,
  Truck,
  User,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuggestedVehicles } from "@/hooks/useSuggestedVehicles";
import { useSuggestedDrivers } from "@/hooks/useSuggestedDrivers";

interface Props {
  request: any;
  organizationId: string;
  onAssign: (vehicleId: string, driverId?: string) => void;
  onUnavailable: () => void;
  isAssigning?: boolean;
  primaryLabel?: string;
}

export const PoolAssignmentPicker = ({
  request,
  organizationId,
  onAssign,
  onUnavailable,
  isAssigning,
  primaryLabel = "Assign & Approve",
}: Props) => {
  const [vehicleId, setVehicleId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [driverOpen, setDriverOpen] = useState(false);

  const { data: vehicles = [], isLoading: vehiclesLoading } = useSuggestedVehicles({
    organizationId,
    poolName: request.pool_name,
    pickupLat: request.departure_lat,
    pickupLng: request.departure_lng,
    passengers: request.passengers,
  });
  const { data: drivers = [], isLoading: driversLoading } = useSuggestedDrivers({
    organizationId,
    poolName: request.pool_name,
  });

  // Auto-pin top suggestion on first load (supervisor can override).
  useEffect(() => {
    if (!vehicleId && vehicles[0]?.id) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);
  useEffect(() => {
    if (!driverId) {
      // Auto-suggest driver assigned to the chosen vehicle if any
      const v = vehicles.find((x) => x.id === vehicleId);
      if (v?.assigned_driver_id) {
        setDriverId(v.assigned_driver_id);
        return;
      }
      const top = drivers.find((d) => d.in_pool && !d.is_busy) || drivers[0];
      if (top?.id) setDriverId(top.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, vehicleId]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId),
    [vehicles, vehicleId],
  );
  const selectedDriver = useMemo(
    () => drivers.find((d) => d.id === driverId),
    [drivers, driverId],
  );

  const inPoolVehicles = vehicles.filter((v) => v.in_pool);
  const otherVehicles = vehicles.filter((v) => !v.in_pool);

  const inPoolDrivers = drivers.filter((d) => d.in_pool);
  const otherDrivers = drivers.filter((d) => !d.in_pool);

  // Cross-pool resource map for decision-making.
  // Groups vehicles by pool (or "Unassigned"), counting idle vs busy.
  const vehiclesByPool = useMemo(() => {
    const map = new Map<string, { total: number; idle: number; busy: number }>();
    vehicles.forEach((v) => {
      const key = v.specific_pool || "Unassigned";
      const cur = map.get(key) || { total: 0, idle: 0, busy: 0 };
      cur.total += 1;
      if (v.is_idle) cur.idle += 1;
      else cur.busy += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries()).sort((a, b) => {
      // Requested pool first, then by idle desc
      if (request.pool_name) {
        if (a[0] === request.pool_name) return -1;
        if (b[0] === request.pool_name) return 1;
      }
      return b[1].idle - a[1].idle;
    });
  }, [vehicles, request.pool_name]);

  const totalIdle = vehicles.filter((v) => v.is_idle).length;

  return (
    <div className="space-y-3">
      {/* Pool context + cross-pool resource visibility */}
      <div className="rounded-md border border-border/40 bg-muted/30 p-2.5 space-y-2">
        <div className="text-xs flex flex-wrap items-center gap-2">
          <Crosshair className="w-3 h-3 text-primary" />
          {request.pool_name ? (
            <>
              <span className="text-muted-foreground">Requested pool</span>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {request.pool_name}
              </Badge>
            </>
          ) : (
            <span className="text-muted-foreground">No pool specified — choose any vehicle</span>
          )}
          <span className="text-muted-foreground/80">
            • {inPoolVehicles.length} in-pool / {totalIdle} idle of {vehicles.length} active vehicles
            • {inPoolDrivers.length} pool drivers / {drivers.length} total
          </span>
        </div>

        {/* Cross-pool resource matrix — helps cross-checking other pools/zones */}
        {vehiclesByPool.length > 1 && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 self-center mr-1">
              Resources by pool:
            </span>
            {vehiclesByPool.map(([pool, stats]) => {
              const isRequested = pool === request.pool_name;
              const exhausted = stats.idle === 0;
              return (
                <div
                  key={pool}
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px]",
                    isRequested
                      ? "border-primary/50 bg-primary/10"
                      : exhausted
                        ? "border-border/30 bg-muted/40 opacity-70"
                        : "border-border/40 bg-background",
                  )}
                  title={`${stats.idle} idle / ${stats.busy} busy / ${stats.total} total`}
                >
                  <span className="font-mono font-semibold">{pool}</span>
                  <span
                    className={cn(
                      "font-medium",
                      exhausted ? "text-muted-foreground" : "text-emerald-600",
                    )}
                  >
                    {stats.idle}
                  </span>
                  <span className="text-muted-foreground">/{stats.total}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {/* ───── Vehicle ───── */}
        <div className="space-y-1">
          <label className="text-xs font-medium flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-primary" />
            Vehicle
            <span className="text-muted-foreground font-normal">
              ({vehicles.length})
            </span>
          </label>
          <Popover open={vehicleOpen} onOpenChange={setVehicleOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between h-9 text-xs font-normal"
                disabled={vehiclesLoading}
              >
                {vehiclesLoading ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading suggestions…
                  </span>
                ) : selectedVehicle ? (
                  <span className="flex items-center gap-1.5 truncate w-full">
                    <span className="font-mono font-semibold">
                      {selectedVehicle.plate_number}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {selectedVehicle.make} {selectedVehicle.model}
                    </span>
                    {selectedVehicle.is_top_pick && (
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0 rounded border ml-auto shrink-0",
                        AVAILABILITY_STYLES[(selectedVehicle as any).availability] || AVAILABILITY_STYLES.inactive,
                      )}
                    >
                      {AVAILABILITY_LABELS[(selectedVehicle as any).availability] || (selectedVehicle as any).availability}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select vehicle…</span>
                )}
                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[340px]" align="start">
              <Command>
                <CommandInput placeholder="Search plate, make, model…" className="h-9" />
                <CommandList>
                  <CommandEmpty>No vehicles found</CommandEmpty>
                  {inPoolVehicles.length > 0 && (
                    <CommandGroup heading={`In pool (${inPoolVehicles.length})`}>
                      {inPoolVehicles.map((v) => (
                        <VehicleRow
                          key={v.id}
                          v={v}
                          selected={vehicleId === v.id}
                          onSelect={() => {
                            setVehicleId(v.id);
                            setVehicleOpen(false);
                          }}
                        />
                      ))}
                    </CommandGroup>
                  )}
                  {otherVehicles.length > 0 && (() => {
                    // Group by pool so supervisor can cross-check pools/zones
                    const groups = new Map<string, typeof otherVehicles>();
                    otherVehicles.forEach((v) => {
                      const k = v.specific_pool || "Unassigned pool";
                      if (!groups.has(k)) groups.set(k, []);
                      groups.get(k)!.push(v);
                    });
                    return Array.from(groups.entries()).map(([poolKey, items]) => {
                      const idleCount = items.filter((x) => x.is_idle).length;
                      return (
                        <CommandGroup
                          key={poolKey}
                          heading={`${poolKey} — ${idleCount} idle / ${items.length}`}
                        >
                          {items.slice(0, 30).map((v) => (
                            <VehicleRow
                              key={v.id}
                              v={v}
                              selected={vehicleId === v.id}
                              onSelect={() => {
                                setVehicleId(v.id);
                                setVehicleOpen(false);
                              }}
                            />
                          ))}
                        </CommandGroup>
                      );
                    });
                  })()}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedVehicle && (
            <VehicleHints v={selectedVehicle} requestPool={request.pool_name} />
          )}
        </div>

        {/* ───── Driver ───── */}
        <div className="space-y-1">
          <label className="text-xs font-medium flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary" />
            Driver
            <span className="text-muted-foreground font-normal">
              ({drivers.length})
            </span>
          </label>
          <Popover open={driverOpen} onOpenChange={setDriverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between h-9 text-xs font-normal"
                disabled={driversLoading}
              >
                {driversLoading ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                  </span>
                ) : selectedDriver ? (
                  <span className="flex items-center gap-1.5 truncate w-full">
                    <span className="font-medium truncate">
                      {selectedDriver.first_name} {selectedDriver.last_name}
                    </span>
                    {(selectedDriver as any).assigned_vehicle_plate && (
                      <span className="text-[10px] text-muted-foreground font-mono truncate">
                        · {(selectedDriver as any).assigned_vehicle_plate}
                      </span>
                    )}
                    {selectedDriver.in_pool && (
                      <Badge variant="secondary" className="text-[9px] py-0 h-4 shrink-0">
                        pool
                      </Badge>
                    )}
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0 rounded border ml-auto shrink-0",
                        AVAILABILITY_STYLES[(selectedDriver as any).availability] || AVAILABILITY_STYLES.inactive,
                      )}
                    >
                      {AVAILABILITY_LABELS[(selectedDriver as any).availability] || (selectedDriver as any).availability}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select driver…</span>
                )}
                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[340px]" align="start">
              <Command>
                <CommandInput placeholder="Search driver name or phone…" className="h-9" />
                <CommandList>
                  <CommandEmpty>No drivers found</CommandEmpty>
                  {inPoolDrivers.length > 0 && (
                    <CommandGroup heading={`In pool (${inPoolDrivers.length})`}>
                      {inPoolDrivers.map((d) => (
                        <DriverRow
                          key={d.id}
                          d={d}
                          selected={driverId === d.id}
                          onSelect={() => {
                            setDriverId(d.id);
                            setDriverOpen(false);
                          }}
                        />
                      ))}
                    </CommandGroup>
                  )}
                  {otherDrivers.length > 0 && (
                    <CommandGroup heading={`Other (${otherDrivers.length})`}>
                      {otherDrivers.slice(0, 50).map((d) => (
                        <DriverRow
                          key={d.id}
                          d={d}
                          selected={driverId === d.id}
                          onSelect={() => {
                            setDriverId(d.id);
                            setDriverOpen(false);
                          }}
                        />
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedDriver?.phone && (
            <p className="text-[11px] text-muted-foreground">
              Will SMS {selectedDriver.phone} on assignment.
            </p>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
          disabled={!vehicleId || isAssigning}
          onClick={() => onAssign(vehicleId, driverId || undefined)}
        >
          {isAssigning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5" />
          )}
          {isAssigning ? "Assigning…" : primaryLabel}
        </Button>
        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={onUnavailable}>
          <XCircle className="w-3.5 h-3.5" /> No vehicles available
        </Button>
      </div>
    </div>
  );
};

// ── Row renderers ─────────────────────────────────────────────────────────

const AVAILABILITY_STYLES: Record<string, string> = {
  available: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  busy: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  on_trip: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  maintenance: "bg-destructive/10 text-destructive border-destructive/30",
  off_duty: "bg-muted text-muted-foreground border-border",
  suspended: "bg-destructive/10 text-destructive border-destructive/30",
  inactive: "bg-muted text-muted-foreground border-border",
};
const AVAILABILITY_LABELS: Record<string, string> = {
  available: "Available",
  busy: "Busy",
  on_trip: "On trip",
  maintenance: "Maintenance",
  off_duty: "Off duty",
  suspended: "Suspended",
  inactive: "Inactive",
};

const VehicleRow = ({
  v,
  selected,
  onSelect,
}: {
  v: any;
  selected: boolean;
  onSelect: () => void;
}) => {
  const availCls = AVAILABILITY_STYLES[v.availability] || AVAILABILITY_STYLES.inactive;
  const availLabel = AVAILABILITY_LABELS[v.availability] || v.availability;
  return (
  <CommandItem
    value={`${v.plate_number} ${v.make ?? ""} ${v.model ?? ""} ${v.specific_pool ?? ""} ${v.assigned_driver_name ?? ""}`}
    onSelect={onSelect}
    className="flex items-center justify-between gap-2"
  >
    <div className="flex items-center gap-2 min-w-0">
      <CheckCircle
        className={cn(
          "w-3.5 h-3.5 shrink-0",
          selected ? "text-emerald-500" : "text-transparent",
        )}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-xs font-semibold">{v.plate_number}</span>
          {v.is_top_pick && (
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          )}
          <span className={cn("text-[9px] px-1.5 py-0 rounded border", availCls)}>
            {availLabel}
          </span>
          {v.in_geofence && (
            <Badge variant="outline" className="text-[9px] py-0 h-4 border-emerald-500/40 text-emerald-600">
              <MapPin className="w-2.5 h-2.5 mr-0.5" /> in zone
            </Badge>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {v.make} {v.model}
          {v.seating_capacity ? ` • ${v.seating_capacity} seats` : ""}
          {v.assigned_driver_name && (
            <span className="ml-1">
              • <User className="inline w-2.5 h-2.5 -mt-0.5" /> {v.assigned_driver_name}
            </span>
          )}
        </div>
      </div>
    </div>
    <div className="text-right shrink-0">
      {v.specific_pool && (
        <Badge variant="secondary" className="text-[9px] py-0 h-4">
          {v.specific_pool}
        </Badge>
      )}
      {v.distance_km != null && (
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {v.distance_km} km
        </div>
      )}
      {!v.has_gps && (
        <div className="text-[10px] text-muted-foreground mt-0.5">no GPS</div>
      )}
    </div>
  </CommandItem>
  );
};

const DriverRow = ({
  d,
  selected,
  onSelect,
}: {
  d: any;
  selected: boolean;
  onSelect: () => void;
}) => {
  const availCls = AVAILABILITY_STYLES[d.availability] || AVAILABILITY_STYLES.inactive;
  const availLabel = AVAILABILITY_LABELS[d.availability] || d.availability;
  return (
  <CommandItem
    value={`${d.first_name ?? ""} ${d.last_name ?? ""} ${d.phone ?? ""} ${d.assigned_vehicle_plate ?? ""}`}
    onSelect={onSelect}
    className="flex items-center justify-between gap-2"
  >
    <div className="flex items-center gap-2 min-w-0">
      <CheckCircle
        className={cn(
          "w-3.5 h-3.5 shrink-0",
          selected ? "text-emerald-500" : "text-transparent",
        )}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium truncate">
            {d.first_name} {d.last_name}
          </span>
          {d.is_top_pick && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
          <span className={cn("text-[9px] px-1.5 py-0 rounded border", availCls)}>
            {availLabel}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {d.assigned_vehicle_plate ? (
            <span><Truck className="inline w-2.5 h-2.5 -mt-0.5" /> {d.assigned_vehicle_plate}</span>
          ) : (
            <span className="italic">No vehicle assigned</span>
          )}
          {d.phone && <span> • {d.phone}</span>}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-1 shrink-0">
      {d.in_pool && (
        <Badge variant="secondary" className="text-[9px] py-0 h-4">
          pool
        </Badge>
      )}
    </div>
  </CommandItem>
  );
};
const VehicleHints = ({
  v,
  requestPool,
}: {
  v: any;
  requestPool?: string | null;
}) => {
  const inPool = requestPool && v.specific_pool === requestPool;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
      {inPool ? (
        <Badge variant="default" className="text-[9px] py-0 h-4">
          In requested pool
        </Badge>
      ) : v.specific_pool ? (
        <Badge variant="outline" className="text-[9px] py-0 h-4">
          Pool: {v.specific_pool}
        </Badge>
      ) : null}
      {v.in_geofence && (
        <Badge variant="outline" className="text-[9px] py-0 h-4 border-emerald-500/40 text-emerald-600">
          <MapPin className="w-2.5 h-2.5 mr-0.5" /> Inside pickup zone
        </Badge>
      )}
      {v.distance_km != null && (
        <span>{v.distance_km} km from pickup</span>
      )}
      {!v.has_gps && <span>• No live GPS</span>}
    </div>
  );
};
