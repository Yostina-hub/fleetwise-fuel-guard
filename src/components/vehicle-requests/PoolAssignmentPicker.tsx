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

  const inPoolVehicles = vehicles.filter(
    (v) => request.pool_name && v.specific_pool === request.pool_name,
  );
  const otherVehicles = vehicles.filter(
    (v) => !(request.pool_name && v.specific_pool === request.pool_name),
  );

  const inPoolDrivers = drivers.filter((d) => d.in_pool);
  const otherDrivers = drivers.filter((d) => !d.in_pool);

  return (
    <div className="space-y-3">
      {/* Pool context */}
      {request.pool_name && (
        <div className="text-xs flex items-center gap-2 text-muted-foreground">
          <Crosshair className="w-3 h-3 text-primary" />
          Suggestions ranked for pool
          <Badge variant="secondary" className="text-[10px] font-mono">
            {request.pool_name}
          </Badge>
          <span className="opacity-70">
            • {inPoolVehicles.length} pool vehicle(s) • {inPoolDrivers.length} pool driver(s)
          </span>
        </div>
      )}

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
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="font-mono font-semibold">
                      {selectedVehicle.plate_number}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {selectedVehicle.make} {selectedVehicle.model}
                    </span>
                    {selectedVehicle.is_top_pick && (
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                    )}
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
                  {otherVehicles.length > 0 && (
                    <CommandGroup heading={`Other available (${otherVehicles.length})`}>
                      {otherVehicles.slice(0, 30).map((v) => (
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
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="font-medium">
                      {selectedDriver.first_name} {selectedDriver.last_name}
                    </span>
                    {selectedDriver.in_pool && (
                      <Badge variant="secondary" className="text-[9px] py-0 h-4">
                        pool
                      </Badge>
                    )}
                    {selectedDriver.is_busy && (
                      <Badge
                        variant="outline"
                        className="text-[9px] py-0 h-4 text-amber-600 border-amber-500/30"
                      >
                        busy
                      </Badge>
                    )}
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

const VehicleRow = ({
  v,
  selected,
  onSelect,
}: {
  v: any;
  selected: boolean;
  onSelect: () => void;
}) => (
  <CommandItem
    value={`${v.plate_number} ${v.make ?? ""} ${v.model ?? ""} ${v.specific_pool ?? ""}`}
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
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-semibold">{v.plate_number}</span>
          {v.is_top_pick && (
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          )}
          {v.in_geofence && (
            <Badge variant="outline" className="text-[9px] py-0 h-4 border-emerald-500/40 text-emerald-600">
              <MapPin className="w-2.5 h-2.5 mr-0.5" /> in zone
            </Badge>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {v.make} {v.model}
          {v.seating_capacity ? ` • ${v.seating_capacity} seats` : ""}
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

const DriverRow = ({
  d,
  selected,
  onSelect,
}: {
  d: any;
  selected: boolean;
  onSelect: () => void;
}) => (
  <CommandItem
    value={`${d.first_name ?? ""} ${d.last_name ?? ""} ${d.phone ?? ""}`}
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
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate">
            {d.first_name} {d.last_name}
          </span>
          {d.is_top_pick && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
        </div>
        {d.phone && (
          <div className="text-[11px] text-muted-foreground truncate">{d.phone}</div>
        )}
      </div>
    </div>
    <div className="flex items-center gap-1 shrink-0">
      {d.in_pool && (
        <Badge variant="secondary" className="text-[9px] py-0 h-4">
          pool
        </Badge>
      )}
      {d.is_busy && (
        <Badge variant="outline" className="text-[9px] py-0 h-4 text-amber-600 border-amber-500/30">
          {d.status}
        </Badge>
      )}
    </div>
  </CommandItem>
);

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
