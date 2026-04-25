/**
 * AssignVehicleDriverDialog
 * --------------------------
 * Focused, ergonomic popup for assigning a vehicle + driver to an approved
 * vehicle request. Consolidates everything the operator needs in a single
 * place so they don't have to scroll the request panel:
 *
 *   1. Smart vehicle suggestions (closest GPS / pool roster / top-pick)
 *   2. Searchable Vehicle picker (with class/plate/make filtering)
 *   3. Searchable Driver picker
 *   4. Cross-pool shortcut
 *   5. Live AssignmentDetailsPanel (specs, GPS, compliance, route, cost, SMS preview)
 *   6. Sticky confirm bar with disabled-until-valid Assign action
 *
 * The actual assignment mutation lives in the parent (VehicleRequestApprovalFlow)
 * so we keep auth + side-effects (status transitions, SMS, notifications) in
 * one place. This dialog only collects the selections and calls back.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Truck,
  UserCheck,
  Sparkles,
  MapPin,
  Search,
  Shuffle,
  X,
} from "lucide-react";
import { AssignmentDetailsPanel } from "./AssignmentDetailsPanel";
import { cn } from "@/lib/utils";

interface VehicleOption {
  id: string;
  plate_number: string;
  make?: string | null;
  model?: string | null;
  vehicle_class?: string | null;
  vehicle_type?: string | null;
  status?: string | null;
}

interface DriverOption {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  license_class?: string | null;
  status?: string | null;
}

interface SuggestedVehicle {
  id: string;
  plate_number: string;
  make?: string | null;
  model?: string | null;
  distance_km?: number | null;
  in_geofence?: boolean;
  is_top_pick?: boolean;
  assigned_driver_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
  vehicles: VehicleOption[];
  drivers: DriverOption[];
  suggested: SuggestedVehicle[];
  initialVehicleId?: string;
  initialDriverId?: string;
  isAssigning?: boolean;
  onAssign: (vehicleId: string, driverId: string) => void;
  onCrossPool?: () => void;
}

export const AssignVehicleDriverDialog = ({
  open,
  onOpenChange,
  request,
  vehicles,
  drivers,
  suggested,
  initialVehicleId = "",
  initialDriverId = "",
  isAssigning = false,
  onAssign,
  onCrossPool,
}: Props) => {
  const [vehicleId, setVehicleId] = useState(initialVehicleId);
  const [driverId, setDriverId] = useState(initialDriverId);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");

  // Reset selections whenever the dialog opens for a different request
  useEffect(() => {
    if (open) {
      setVehicleId(initialVehicleId);
      setDriverId(initialDriverId);
      setVehicleSearch("");
      setDriverSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request?.id]);

  // Apply vehicle search across plate / make / model / class
  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    const sugIds = new Set(suggested.slice(0, 5).map((s) => s.id));
    const base = vehicles.filter((v) => !sugIds.has(v.id));
    if (!q) return base;
    return base.filter((v) =>
      [v.plate_number, v.make, v.model, v.vehicle_class, v.vehicle_type]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q))
    );
  }, [vehicles, vehicleSearch, suggested]);

  const filteredDrivers = useMemo(() => {
    const q = driverSearch.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) =>
      [`${d.first_name} ${d.last_name}`, d.phone, d.license_class]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q))
    );
  }, [drivers, driverSearch]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const selectedDriver = drivers.find((d) => d.id === driverId);
  const canAssign = !!vehicleId && !!driverId && !isAssigning;

  const handleSuggestionPick = (s: SuggestedVehicle) => {
    setVehicleId(s.id);
    if (s.assigned_driver_id && !driverId) setDriverId(s.assigned_driver_id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Truck className="w-4 h-4 text-primary" />
                Assign Vehicle &amp; Driver
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5 truncate">
                Request{" "}
                <span className="font-mono font-medium text-foreground">
                  {request?.request_number}
                </span>{" "}
                · {request?.purpose || "—"}
              </DialogDescription>
            </div>
            {onCrossPool && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onCrossPool();
                }}
              >
                <Shuffle className="w-3.5 h-3.5 mr-1" />
                Cross-Pool
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Body — split into pickers (left) + live details (right) */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(320px,1fr)_minmax(380px,1.2fr)]">
          {/* LEFT: pickers */}
          <ScrollArea className="border-b lg:border-b-0 lg:border-r max-h-[60vh] lg:max-h-none">
            <div className="p-4 space-y-4">
              {/* Smart suggestions */}
              {suggested.length > 0 && (
                <div className="rounded-md border bg-muted/30 p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary" />
                      Smart suggestions
                    </span>
                    <span>Closest GPS · pool roster</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggested.slice(0, 5).map((s) => {
                      const isSel = vehicleId === s.id;
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => handleSuggestionPick(s)}
                          className={cn(
                            "text-[11px] rounded border px-2 py-1 flex items-center gap-1.5 transition",
                            isSel
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background hover:bg-accent"
                          )}
                        >
                          {s.is_top_pick && (
                            <Sparkles className="w-3 h-3 text-primary" />
                          )}
                          {s.in_geofence && (
                            <MapPin className="w-3 h-3 text-success" />
                          )}
                          <span className="font-medium">{s.plate_number}</span>
                          <span className="text-muted-foreground">
                            {s.distance_km != null
                              ? `${s.distance_km} km`
                              : "no GPS"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vehicle picker */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Vehicle
                  {selectedVehicle && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {selectedVehicle.plate_number}
                    </Badge>
                  )}
                </Label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    placeholder="Search plate, make, model, class…"
                    className="h-8 text-xs pl-7 pr-7"
                  />
                  {vehicleSearch && (
                    <button
                      type="button"
                      onClick={() => setVehicleSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="max-h-56 overflow-auto rounded-md border divide-y">
                  {filteredVehicles.length === 0 && (
                    <div className="text-[11px] text-muted-foreground px-2 py-3 text-center">
                      No vehicles match
                    </div>
                  )}
                  {filteredVehicles.slice(0, 50).map((v) => {
                    const isSel = vehicleId === v.id;
                    return (
                      <button
                        type="button"
                        key={v.id}
                        onClick={() => setVehicleId(v.id)}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left text-xs transition hover:bg-accent",
                          isSel && "bg-primary/10 text-primary hover:bg-primary/15"
                        )}
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          {isSel && (
                            <CheckCircle className="w-3 h-3 shrink-0" />
                          )}
                          <span className="font-medium truncate">
                            {v.plate_number}
                          </span>
                          <span className="text-muted-foreground truncate">
                            {[v.make, v.model].filter(Boolean).join(" ")}
                          </span>
                        </span>
                        {v.vehicle_class && (
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0"
                          >
                            {v.vehicle_class}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Driver picker */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Driver
                  {selectedDriver && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {selectedDriver.first_name} {selectedDriver.last_name}
                    </Badge>
                  )}
                </Label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                    placeholder="Search name, phone, license…"
                    className="h-8 text-xs pl-7 pr-7"
                  />
                  {driverSearch && (
                    <button
                      type="button"
                      onClick={() => setDriverSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="max-h-56 overflow-auto rounded-md border divide-y">
                  {filteredDrivers.length === 0 && (
                    <div className="text-[11px] text-muted-foreground px-2 py-3 text-center">
                      No drivers match
                    </div>
                  )}
                  {filteredDrivers.slice(0, 50).map((d) => {
                    const isSel = driverId === d.id;
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => setDriverId(d.id)}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left text-xs transition hover:bg-accent",
                          isSel && "bg-primary/10 text-primary hover:bg-primary/15"
                        )}
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          {isSel && (
                            <CheckCircle className="w-3 h-3 shrink-0" />
                          )}
                          <span className="font-medium truncate">
                            {d.first_name} {d.last_name}
                          </span>
                          {d.phone && (
                            <span className="text-muted-foreground truncate">
                              · {d.phone}
                            </span>
                          )}
                        </span>
                        {d.license_class && (
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0"
                          >
                            {d.license_class}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* RIGHT: live assignment details */}
          <ScrollArea className="max-h-[60vh] lg:max-h-none bg-background">
            <div className="p-4">
              {!vehicleId && !driverId ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-center py-12">
                  <Sparkles className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Pick a vehicle and driver
                  </p>
                  <p className="text-xs text-muted-foreground/70 max-w-xs">
                    Live specs, GPS, compliance, route, estimated cost, and the
                    SMS preview will appear here as you select.
                  </p>
                </div>
              ) : (
                <AssignmentDetailsPanel
                  request={request}
                  vehicleId={vehicleId}
                  driverId={driverId}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Sticky confirm bar */}
        <div className="border-t bg-muted/30 px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-2 min-w-0">
            <Separator orientation="vertical" className="h-4" />
            <span className="truncate">
              {vehicleId && driverId
                ? "Ready to assign — driver will be notified by SMS."
                : "Select both a vehicle and a driver to continue."}
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!canAssign}
              onClick={() => onAssign(vehicleId, driverId)}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              {isAssigning ? "Assigning…" : "Confirm Assignment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignVehicleDriverDialog;
