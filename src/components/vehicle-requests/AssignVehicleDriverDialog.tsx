/**
 * AssignVehicleDriverDialog
 * --------------------------
 * Redesigned, professional, ergonomic popup for assigning a vehicle + driver
 * to an approved vehicle request. Three top-level tabs keep the operator
 * focused without leaving the dialog:
 *
 *   1. Assignment   — pickers + live AssignmentDetailsPanel
 *   2. Ops Map      — embedded operations map (idle vehicles, demand, borrow)
 *   3. Consolidate  — embedded smart-rules consolidation panel
 *
 * The actual assignment mutation lives in the parent
 * (VehicleRequestApprovalFlow) so we keep auth + side-effects in one place.
 * This dialog only collects selections and calls back.
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CheckCircle,
  Truck,
  UserCheck,
  Sparkles,
  MapPin,
  Search,
  Shuffle,
  X,
  ClipboardCheck,
  Layers,
  Map as MapIcon,
  Phone,
  IdCard,
} from "lucide-react";
import { AssignmentDetailsPanel } from "./AssignmentDetailsPanel";
import { OpsMapView } from "./OpsMapView";
import { ConsolidationPanel } from "./ConsolidationPanel";
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
  const [tab, setTab] = useState<"assignment" | "ops_map" | "consolidate">(
    "assignment",
  );
  const [pickerTab, setPickerTab] = useState<"vehicle" | "driver">("vehicle");
  const [showDetailsMobile, setShowDetailsMobile] = useState(false);

  useEffect(() => {
    if (open) {
      setVehicleId(initialVehicleId);
      setDriverId(initialDriverId);
      setVehicleSearch("");
      setDriverSearch("");
      setTab("assignment");
      setPickerTab("vehicle");
      setShowDetailsMobile(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request?.id]);

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    const sugIds = new Set(suggested.slice(0, 5).map((s) => s.id));
    const base = vehicles.filter((v) => !sugIds.has(v.id));
    if (!q) return base;
    return base.filter((v) =>
      [v.plate_number, v.make, v.model, v.vehicle_class, v.vehicle_type]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q)),
    );
  }, [vehicles, vehicleSearch, suggested]);

  const filteredDrivers = useMemo(() => {
    const q = driverSearch.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) =>
      [`${d.first_name} ${d.last_name}`, d.phone, d.license_class]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q)),
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
      <DialogContent className="max-w-6xl w-[96vw] max-h-[94vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* ============================ HEADER ============================ */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 via-background to-background">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  Assign Vehicle &amp; Driver
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-medium text-foreground">
                    {request?.request_number}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="truncate">{request?.purpose || "—"}</span>
                  {request?.passenger_count != null && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {request.passenger_count} pax
                    </Badge>
                  )}
                </DialogDescription>
              </div>
            </div>
            {onCrossPool && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  onOpenChange(false);
                  onCrossPool();
                }}
              >
                <Shuffle className="w-3.5 h-3.5 mr-1.5" />
                Cross-Pool
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* ============================ TABS ============================ */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as any)}
          className="flex-1 min-h-0 flex flex-col"
        >
          <div className="px-6 pt-3 border-b bg-muted/20">
            <TabsList className="h-9 bg-transparent p-0 gap-1">
              <TabsTrigger
                value="assignment"
                className="text-xs h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
              >
                <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                Assignment
              </TabsTrigger>
              <TabsTrigger
                value="ops_map"
                className="text-xs h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
              >
                <MapIcon className="w-3.5 h-3.5 mr-1.5" />
                Ops Map
              </TabsTrigger>
              <TabsTrigger
                value="consolidate"
                className="text-xs h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" />
                Consolidate
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ===== ASSIGNMENT TAB ===== */}
          <TabsContent
            value="assignment"
            className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden overflow-hidden"
          >
            <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(320px,1fr)_minmax(380px,1.2fr)] min-h-0">
              {/* LEFT: pickers (sub-tabs Vehicle | Driver) */}
              <div className="flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r overflow-hidden">
                {/* Smart suggestions — always visible above sub-tabs */}
                {suggested.length > 0 && (
                  <div className="px-4 pt-4 pb-3 border-b bg-muted/20 shrink-0">
                    <SectionLabel
                      icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                      title="Smart suggestions"
                      hint="Closest GPS · pool roster"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {suggested.slice(0, 5).map((s) => {
                        const isSel = vehicleId === s.id;
                        return (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => handleSuggestionPick(s)}
                            className={cn(
                              "text-[11px] rounded-md border px-2.5 py-1.5 flex items-center gap-1.5 transition-all",
                              isSel
                                ? "border-primary bg-primary/10 text-primary shadow-sm"
                                : "border-border bg-background hover:bg-accent hover:border-primary/30",
                            )}
                          >
                            {s.is_top_pick && (
                              <Sparkles className="w-3 h-3 text-primary" />
                            )}
                            {s.in_geofence && (
                              <MapPin className="w-3 h-3 text-emerald-500" />
                            )}
                            <span className="font-semibold">
                              {s.plate_number}
                            </span>
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

                <Tabs
                  value={pickerTab}
                  onValueChange={(v) => setPickerTab(v as "vehicle" | "driver")}
                  className="flex-1 min-h-0 flex flex-col"
                >
                  <div className="px-4 pt-3 pb-2 shrink-0 flex items-center gap-2">
                    <TabsList className="h-8 grid grid-cols-2 flex-1 max-w-[260px]">
                      <TabsTrigger value="vehicle" className="text-xs h-7">
                        <Truck className="w-3 h-3 mr-1" />
                        Vehicle
                        {selectedVehicle && (
                          <CheckCircle className="w-2.5 h-2.5 ml-1 text-emerald-500" />
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="driver" className="text-xs h-7">
                        <UserCheck className="w-3 h-3 mr-1" />
                        Driver
                        {selectedDriver && (
                          <CheckCircle className="w-2.5 h-2.5 ml-1 text-emerald-500" />
                        )}
                      </TabsTrigger>
                    </TabsList>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="lg:hidden h-8 text-xs ml-auto shrink-0"
                      onClick={() => setShowDetailsMobile((v) => !v)}
                      disabled={!vehicleId && !driverId}
                    >
                      {showDetailsMobile ? "Hide" : "Show"} details
                    </Button>
                  </div>

                  <TabsContent
                    value="vehicle"
                    className="flex-1 min-h-0 mt-0 flex flex-col data-[state=inactive]:hidden"
                  >
                    <div className="px-4 pb-2 shrink-0">
                      <SearchInput
                        value={vehicleSearch}
                        onChange={setVehicleSearch}
                        placeholder="Search plate, make, model, class…"
                      />
                      {selectedVehicle && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          Selected:
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 px-1.5 gap-1"
                          >
                            <CheckCircle className="w-2.5 h-2.5" />
                            {selectedVehicle.plate_number}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <ScrollArea className="flex-1 min-h-0 px-4 pb-4">
                      <div className="rounded-md border bg-card overflow-hidden">
                        <div className="divide-y divide-border/60">
                          {filteredVehicles.length === 0 && (
                            <EmptyState text="No vehicles match" />
                          )}
                          {filteredVehicles.slice(0, 100).map((v) => {
                            const isSel = vehicleId === v.id;
                            return (
                              <button
                                type="button"
                                key={v.id}
                                onClick={() => {
                                  setVehicleId(v.id);
                                  if (!driverId) setPickerTab("driver");
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition hover:bg-accent",
                                  isSel &&
                                    "bg-primary/10 text-primary hover:bg-primary/15",
                                )}
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={cn(
                                      "h-6 w-6 rounded-md flex items-center justify-center shrink-0",
                                      isSel
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground",
                                    )}
                                  >
                                    {isSel ? (
                                      <CheckCircle className="w-3 h-3" />
                                    ) : (
                                      <Truck className="w-3 h-3" />
                                    )}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="font-semibold block truncate">
                                      {v.plate_number}
                                    </span>
                                    <span className="text-muted-foreground text-[10px] block truncate">
                                      {[v.make, v.model]
                                        .filter(Boolean)
                                        .join(" ") || "—"}
                                    </span>
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
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent
                    value="driver"
                    className="flex-1 min-h-0 mt-0 flex flex-col data-[state=inactive]:hidden"
                  >
                    <div className="px-4 pb-2 shrink-0">
                      <SearchInput
                        value={driverSearch}
                        onChange={setDriverSearch}
                        placeholder="Search name, phone, license…"
                      />
                      {selectedDriver && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          Selected:
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 px-1.5 gap-1"
                          >
                            <CheckCircle className="w-2.5 h-2.5" />
                            {selectedDriver.first_name} {selectedDriver.last_name}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <ScrollArea className="flex-1 min-h-0 px-4 pb-4">
                      <div className="rounded-md border bg-card overflow-hidden">
                        <div className="divide-y divide-border/60">
                          {filteredDrivers.length === 0 && (
                            <EmptyState text="No drivers match" />
                          )}
                          {filteredDrivers.slice(0, 100).map((d) => {
                            const isSel = driverId === d.id;
                            const initials =
                              `${d.first_name?.[0] || ""}${d.last_name?.[0] || ""}`.toUpperCase();
                            return (
                              <button
                                type="button"
                                key={d.id}
                                onClick={() => setDriverId(d.id)}
                                className={cn(
                                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition hover:bg-accent",
                                  isSel &&
                                    "bg-primary/10 text-primary hover:bg-primary/15",
                                )}
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={cn(
                                      "h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold",
                                      isSel
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground",
                                    )}
                                  >
                                    {isSel ? (
                                      <CheckCircle className="w-3 h-3" />
                                    ) : (
                                      initials || "?"
                                    )}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="font-semibold block truncate">
                                      {d.first_name} {d.last_name}
                                    </span>
                                    <span className="text-muted-foreground text-[10px] flex items-center gap-1.5 truncate">
                                      {d.phone && (
                                        <span className="flex items-center gap-0.5">
                                          <Phone className="w-2.5 h-2.5" />
                                          {d.phone}
                                        </span>
                                      )}
                                      {d.license_class && (
                                        <span className="flex items-center gap-0.5">
                                          <IdCard className="w-2.5 h-2.5" />
                                          {d.license_class}
                                        </span>
                                      )}
                                    </span>
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>

              {/* RIGHT: live assignment details (collapsible on mobile) */}
              <div
                className={cn(
                  "min-h-0 bg-muted/10 flex-col lg:flex",
                  showDetailsMobile ? "flex" : "hidden",
                )}
              >
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4">
                    {!vehicleId && !driverId ? (
                      <div className="h-full min-h-[40vh] flex flex-col items-center justify-center gap-3 text-center py-12 rounded-lg border border-dashed bg-background/60">
                        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            Pick a vehicle and driver
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                            Live specs, GPS, compliance, route, estimated cost,
                            and the SMS preview will appear here.
                          </p>
                        </div>
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
            </div>
          </TabsContent>

          {/* ===== OPS MAP TAB ===== */}
          <TabsContent
            value="ops_map"
            className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden overflow-auto"
          >
            <div className="p-4">
              <OpsMapView organizationId={request?.organization_id} />
            </div>
          </TabsContent>

          {/* ===== CONSOLIDATE TAB ===== */}
          <TabsContent
            value="consolidate"
            className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden overflow-auto"
          >
            <div className="p-4">
              <ConsolidationPanel organizationId={request?.organization_id} />
            </div>
          </TabsContent>
        </Tabs>

        {/* ============================ FOOTER ============================ */}
        <div className="border-t bg-muted/30 px-6 py-3 flex items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-2 min-w-0">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                vehicleId && driverId ? "bg-emerald-500" : "bg-muted-foreground/40",
              )}
            />
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
              className="min-w-[150px]"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              {isAssigning ? "Assigning…" : "Confirm Assignment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================== SUB-COMPONENTS ==============================

const SectionLabel = ({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
      {icon}
      {title}
      {hint && (
        <span className="text-muted-foreground/70 normal-case font-normal tracking-normal">
          · {hint}
        </span>
      )}
    </div>
    {action}
  </div>
);

const SearchInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) => (
  <div className="relative">
    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-8 text-xs pl-8 pr-8"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange("")}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="text-[11px] text-muted-foreground px-3 py-4 text-center">
    {text}
  </div>
);

export default AssignVehicleDriverDialog;
