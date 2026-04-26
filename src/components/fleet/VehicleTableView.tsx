import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import VehicleLiveStatusBadge from "@/components/fleet/VehicleLiveStatusBadge";
import { QuickStatusChange } from "@/components/fleet/QuickStatusChange";
import { getVehicleTypeIcon } from "@/lib/vehicleTypeIcon";
import type { FleetLiveStatus } from "@/lib/fleetLiveStatus";
import { useVehicleFuelStatus } from "@/hooks/useVehicleFuelStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Eye,
  MapPin,
  MoreHorizontal,
  Wrench,
  Fuel,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Power,
  Radio,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  Gauge,
  Clock,
  Wifi,
  WifiOff,
  Settings2,
  Droplets,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  loadVisibleColumns,
  saveVisibleColumns,
  COLUMN_BY_ID,
  fmtBool,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  fmtNumber,
  fmtText,
  type VehicleColumnId,
} from "./vehicleTableColumns";
import VehicleColumnsPicker from "./VehicleColumnsPicker";

interface VehicleItem {
  id: string;
  vehicleId: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  /** Collapsed status used by legacy callers (kept for back-compat). */
  status: "moving" | "idle" | "offline";
  /** Full live status — preferred. Mirrors `getFleetLiveStatus()` output. */
  liveStatus?: FleetLiveStatus;
  fuel: number | null;
  odometer: number;
  nextService: string | null;
  vehicleType?: string;
  fuelType?: string;
  assignedDriver?: string;
  speed?: number;
  latitude?: number | null;
  longitude?: number | null;
  lastSeen?: string | null;
  deviceConnected?: boolean;
  vin?: string;
  /** Raw DB row — gives the table access to every column. */
  raw?: Record<string, any>;
}

type SortField = "plate_number" | "make" | "status" | "fuel_level_percent" | "odometer_km" | "speed_kmh" | "created_at";
type SortDirection = "asc" | "desc";

/** Per-column accessor used for client-side sorting on non-backend fields. */
const getSortValue = (vehicle: VehicleItem, col: VehicleColumnId): string | number | null => {
  const raw = vehicle.raw ?? {};
  switch (col) {
    case "plate":
      return vehicle.plate?.toLowerCase() ?? "";
    case "vin":
      return vehicle.vin?.toLowerCase() ?? "";
    case "make_model":
      return `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.toLowerCase();
    case "year":
      return vehicle.year ?? null;
    case "live_status":
      return vehicle.status ?? "";
    case "speed":
      return vehicle.speed ?? 0;
    case "fuel_level":
      return vehicle.fuel ?? -1;
    case "device_connected":
      return vehicle.deviceConnected ? 1 : 0;
    case "last_seen":
      return vehicle.lastSeen ? new Date(vehicle.lastSeen).getTime() : 0;
    case "driver":
      return (vehicle.assignedDriver ?? "").toLowerCase();
    case "odometer":
      return Number(raw.odometer_km ?? vehicle.odometer ?? 0);
    case "next_service":
      return vehicle.nextService ?? "";
    default: {
      const v = raw[col as string];
      if (v === null || v === undefined || v === "") return null;
      if (typeof v === "boolean") return v ? 1 : 0;
      if (typeof v === "number") return v;
      // try to detect ISO date strings → numeric for proper ordering
      if (typeof v === "string") {
        const ts = Date.parse(v);
        if (!Number.isNaN(ts) && /\d{4}-\d{2}-\d{2}/.test(v)) return ts;
        return v.toLowerCase();
      }
      return String(v).toLowerCase();
    }
  }
};

const compareValues = (a: string | number | null, b: string | number | null) => {
  if (a === null && b === null) return 0;
  if (a === null) return 1; // nulls last
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
};

interface VehicleTableViewProps {
  vehicles: VehicleItem[];
  onVehicleClick: (vehicle: VehicleItem) => void;
  onEditVehicle?: (vehicle: VehicleItem) => void;
  onDeleteVehicle?: (vehicle: VehicleItem) => void;
  onAssignDriver?: (vehicle: VehicleItem) => void;
  onFuelHistory?: (vehicle: VehicleItem) => void;
  onTripHistory?: (vehicle: VehicleItem) => void;
  onSendCommand?: (vehicle: VehicleItem) => void;
  onAssignDevice?: (vehicle: VehicleItem) => void;
  onTerminalSettings?: (vehicle: VehicleItem) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSortChange?: (field: SortField, direction: SortDirection) => void;
}

/** Map column id → optional sortable backend field. */
const SORTABLE_COLUMNS: Partial<Record<VehicleColumnId, SortField>> = {
  plate: "plate_number",
  make_model: "make",
  live_status: "status",
  speed: "speed_kmh",
  fuel_level: "fuel_level_percent",
  odometer: "odometer_km",
  created_at: "created_at",
};

const getFuelColor = (level: number) => {
  if (level > 60) return "bg-success";
  if (level > 30) return "bg-warning";
  return "bg-destructive";
};

const formatLastSeen = (lastSeen: string | null | undefined) => {
  if (!lastSeen) return "Never";
  try {
    return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
  } catch {
    return "Unknown";
  }
};

const BoolCell = ({ value }: { value: boolean | null | undefined }) => {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  return value ? (
    <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
      <CheckCircle2 className="w-3.5 h-3.5" /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
      <XCircle className="w-3.5 h-3.5" /> No
    </span>
  );
};

export const VehicleTableView = ({
  vehicles,
  onVehicleClick,
  onEditVehicle,
  onDeleteVehicle,
  onAssignDriver,
  onFuelHistory,
  onTripHistory,
  onSendCommand,
  onAssignDevice,
  onTerminalSettings,
  selectedIds = [],
  onSelectionChange,
  sortField: externalSortField,
  sortDirection: externalSortDirection,
  onSortChange,
}: VehicleTableViewProps) => {
  const navigate = useNavigate();
  const { fuelStatusMap } = useVehicleFuelStatus();

  const [visibleColumns, setVisibleColumns] = useState<VehicleColumnId[]>(() => loadVisibleColumns());

  /** Local client-side sort, used for any column that isn't a backend SortField. */
  const [localSort, setLocalSort] = useState<{ col: VehicleColumnId; dir: SortDirection } | null>(null);

  const sortField = externalSortField;
  const sortDirection = externalSortDirection || "asc";

  const visibleColumnDefs = useMemo(
    () => visibleColumns.map((id) => COLUMN_BY_ID[id]).filter(Boolean),
    [visibleColumns],
  );

  const handleSort = (col: VehicleColumnId) => {
    if (col === "actions") return;
    const backend = SORTABLE_COLUMNS[col];
    if (backend && onSortChange) {
      // Backend sorting (works across paginated data)
      setLocalSort(null);
      if (sortField === backend) {
        onSortChange(backend, sortDirection === "asc" ? "desc" : "asc");
      } else {
        onSortChange(backend, "asc");
      }
      return;
    }
    // Client-side sorting (current page)
    setLocalSort((prev) => {
      if (!prev || prev.col !== col) return { col, dir: "asc" };
      if (prev.dir === "asc") return { col, dir: "desc" };
      return null; // third click clears
    });
  };

  const sortIcon = (col: VehicleColumnId) => {
    const backend = SORTABLE_COLUMNS[col];
    const isBackendActive = backend && sortField === backend;
    const isLocalActive = localSort?.col === col;
    if (!isBackendActive && !isLocalActive) {
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-50" />;
    }
    const dir = isBackendActive ? sortDirection : (localSort?.dir ?? "asc");
    return dir === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 ml-1" />
      : <ArrowDown className="w-3.5 h-3.5 ml-1" />;
  };

  /** Apply client-side sorting on top of the (already backend-sorted) page. */
  const displayedVehicles = useMemo(() => {
    if (!localSort) return vehicles;
    const { col, dir } = localSort;
    const sorted = [...vehicles].sort((a, b) => compareValues(getSortValue(a, col), getSortValue(b, col)));
    return dir === "desc" ? sorted.reverse() : sorted;
  }, [vehicles, localSort]);

  const allSelected = vehicles.length > 0 && selectedIds.length === vehicles.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < vehicles.length;

  const handleSelectAll = () => {
    if (allSelected) onSelectionChange?.([]);
    else onSelectionChange?.(vehicles.map((v) => v.vehicleId));
  };

  const handleSelectOne = (vehicleId: string) => {
    if (selectedIds.includes(vehicleId)) {
      onSelectionChange?.(selectedIds.filter((id) => id !== vehicleId));
    } else {
      onSelectionChange?.([...selectedIds, vehicleId]);
    }
  };

  const updateVisible = (cols: VehicleColumnId[]) => {
    setVisibleColumns(cols);
    saveVisibleColumns(cols);
  };

  const renderCell = (col: VehicleColumnId, vehicle: VehicleItem): ReactNode => {
    const raw = vehicle.raw ?? {};

    switch (col) {
      case "plate": {
        const TypeIcon = getVehicleTypeIcon(vehicle.vehicleType);
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20"
                      aria-hidden="true"
                    >
                      <TypeIcon className="w-3.5 h-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs capitalize">
                    {vehicle.vehicleType ? vehicle.vehicleType.replace(/_/g, " ") : "Vehicle"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="font-bold text-foreground">{vehicle.plate}</span>
              {vehicle.deviceConnected ? (
                <Wifi className="w-3 h-3 text-success" />
              ) : (
                <WifiOff className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
            {(vehicle.vehicleType || vehicle.fuelType) && (
              <div className="flex flex-wrap gap-1 mt-1">
                {vehicle.vehicleType && (
                  <Badge variant="outline" className="text-[10px] w-fit capitalize px-1.5 py-0">
                    {vehicle.vehicleType.replace("_", " ")}
                  </Badge>
                )}
                {vehicle.fuelType && (
                  <Badge variant="secondary" className="text-[10px] w-fit capitalize px-1.5 py-0">
                    {vehicle.fuelType.replace("_", " ")}
                  </Badge>
                )}
              </div>
            )}
          </div>
        );
      }
      case "vin":
        return (
          <span className="text-xs font-mono text-muted-foreground">
            {vehicle.vin ? vehicle.vin : "—"}
          </span>
        );
      case "make_model":
        return (
          <div className="flex flex-col">
            <span className="font-medium">{vehicle.make} {vehicle.model}</span>
            <span className="text-xs text-muted-foreground">{vehicle.year}</span>
          </div>
        );
      case "year":
        return <span>{fmtNumber(raw.year)}</span>;
      case "color":
        return <span className="capitalize">{fmtText(raw.color)}</span>;

      case "vehicle_type":
      case "vehicle_category":
      case "vehicle_group":
      case "fuel_type":
      case "transmission_type":
      case "drive_type":
      case "route_type":
      case "ownership_type":
      case "lifecycle_stage":
      case "current_condition":
      case "safety_comfort_category":
      case "purpose_for":
      case "specific_pool":
      case "specific_location":
      case "assigned_location":
      case "rental_provider":
      case "rental_contract_number":
      case "registration_cert_no":
      case "insurance_policy_no":
      case "engine_number":
      case "model_code":
      case "gps_device_id":
      case "temperature_control":
      case "depot_id":
      case "status":
      case "notes":
        return <span className="capitalize text-sm">{fmtText(raw[col])}</span>;

      case "live_status":
        return <VehicleLiveStatusBadge status={vehicle.liveStatus ?? vehicle.status} />;

      case "speed":
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">{vehicle.speed || 0}</span>
            <span className="text-xs text-muted-foreground">km/h</span>
          </div>
        );

      case "fuel_level": {
        const fuelStatus = fuelStatusMap.get(vehicle.vehicleId);
        const hasSensor = fuelStatus?.has_fuel_sensor;
        const fuelLevel = fuelStatus?.last_fuel_reading ?? vehicle.fuel;
        if (hasSensor && fuelLevel !== null && fuelLevel !== undefined) {
          return (
            <div className="flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-primary" />
              <div className="w-16 bg-muted rounded-full h-2">
                <div
                  className={cn("h-2 rounded-full", getFuelColor(fuelLevel))}
                  style={{ width: `${Math.min(100, Math.max(0, fuelLevel))}%` }}
                />
              </div>
              <span className="text-sm font-medium w-10">{Math.round(fuelLevel)}%</span>
            </div>
          );
        }
        return (
          <Badge variant="secondary" className="text-xs gap-1">
            <Fuel className="h-3 w-3" />
            No Sensor
          </Badge>
        );
      }

      case "device_connected":
        return <BoolCell value={vehicle.deviceConnected} />;

      case "last_seen":
        return (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{formatLastSeen(vehicle.lastSeen)}</span>
          </div>
        );

      case "location":
        if (vehicle.latitude && vehicle.longitude) {
          return (
            <span className="text-xs font-mono text-muted-foreground">
              {vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}
            </span>
          );
        }
        return <span className="text-muted-foreground">—</span>;

      case "driver":
        return vehicle.assignedDriver ? (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm">{vehicle.assignedDriver}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        );

      case "odometer":
        return <span className="font-medium">{fmtNumber(raw.odometer_km)} km</span>;
      case "engine_hours":
        return <span>{fmtNumber(raw.engine_hours)} h</span>;
      case "next_service":
        return <span className="text-sm">{vehicle.nextService ?? "—"}</span>;
      case "fuel_standard_km_per_liter":
        return <span>{fmtNumber(raw.fuel_standard_km_per_liter)} km/L</span>;
      case "tank_capacity_liters":
        return <span>{fmtNumber(raw.tank_capacity_liters)} L</span>;
      case "capacity_kg":
        return <span>{fmtNumber(raw.capacity_kg)} kg</span>;
      case "capacity_volume":
        return <span>{fmtNumber(raw.capacity_volume)} m³</span>;
      case "loading_capacity_quintal":
        return <span>{fmtNumber(raw.loading_capacity_quintal)} q</span>;
      case "seating_capacity":
        return <span>{fmtNumber(raw.seating_capacity)}</span>;
      case "engine_cc":
        return <span>{fmtNumber(raw.engine_cc)} cc</span>;

      case "acquisition_date":
      case "rental_start_date":
      case "rental_end_date":
      case "registration_expiry":
      case "insurance_expiry":
      case "permit_expiry":
      case "mfg_date":
        return <span className="text-sm">{fmtDate(raw[col])}</span>;

      case "year_of_ownership":
        return <span>{fmtNumber(raw.year_of_ownership)}</span>;

      case "acquisition_cost":
      case "purchasing_price":
      case "current_market_price":
      case "current_value":
      case "total_maintenance_cost":
      case "total_fuel_cost":
      case "rental_daily_rate":
        return <span className="font-medium">{fmtMoney(raw[col])}</span>;

      case "depreciation_rate":
        return <span>{raw.depreciation_rate != null ? `${fmtNumber(raw.depreciation_rate)}%` : "—"}</span>;

      case "total_downtime_hours":
        return <span>{fmtNumber(raw.total_downtime_hours)} h</span>;

      case "speed_cutoff_enabled":
        return <BoolCell value={raw.speed_cutoff_enabled} />;
      case "speed_cutoff_limit_kmh":
        return <span>{fmtNumber(raw.speed_cutoff_limit_kmh)} km/h</span>;
      case "speed_cutoff_grace_seconds":
        return <span>{fmtNumber(raw.speed_cutoff_grace_seconds)} s</span>;
      case "speed_governor_bypass_alert":
        return <BoolCell value={raw.speed_governor_bypass_alert} />;

      case "gps_installed":
        return <BoolCell value={raw.gps_installed} />;
      case "commercial_permit":
        return <BoolCell value={raw.commercial_permit} />;
      case "is_active":
        return <BoolCell value={raw.is_active} />;

      case "created_at":
      case "updated_at":
        return <span className="text-xs text-muted-foreground">{fmtDateTime(raw[col])}</span>;

      case "actions":
        return (
          <TooltipProvider>
            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onVehicleClick(vehicle)}
                    aria-label={`View details for ${vehicle.plate}`}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View details</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate("/map", { state: { selectedVehicleId: vehicle.vehicleId } })}
                    aria-label={`Track ${vehicle.plate} on map`}
                  >
                    <MapPin className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Track on map</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`More actions for ${vehicle.plate}`}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onVehicleClick(vehicle)}>
                    <Eye className="w-4 h-4 mr-2" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/map", { state: { selectedVehicleId: vehicle.vehicleId } })}>
                    <MapPin className="w-4 h-4 mr-2" /> Track on Map
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEditVehicle?.(vehicle)}>
                    <Edit className="w-4 h-4 mr-2" /> Edit Vehicle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAssignDriver?.(vehicle)}>
                    <UserPlus className="w-4 h-4 mr-2" /> Assign Driver
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAssignDevice?.(vehicle)}>
                    <Radio className="w-4 h-4 mr-2" /> GPS Device
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSendCommand?.(vehicle)}>
                    <Power className="w-4 h-4 mr-2" /> Send Command
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onTerminalSettings?.(vehicle)}>
                    <Settings2 className="w-4 h-4 mr-2" /> Terminal Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/maintenance")}>
                    <Wrench className="w-4 h-4 mr-2" /> Maintenance
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFuelHistory?.(vehicle)}>
                    <Fuel className="w-4 h-4 mr-2" /> Fuel History
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onTripHistory?.(vehicle)}>
                    <FileText className="w-4 h-4 mr-2" /> Trip History
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDeleteVehicle?.(vehicle)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Vehicle
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipProvider>
        );

      default: {
        const value = raw[col as string];
        if (value === null || value === undefined || value === "") {
          return <span className="text-muted-foreground">—</span>;
        }
        if (typeof value === "boolean") return <BoolCell value={value} />;
        if (typeof value === "number") return <span>{fmtNumber(value)}</span>;
        return <span className="text-sm">{String(value)}</span>;
      }
    }
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{visibleColumnDefs.length}</span> columns
        </div>
        <VehicleColumnsPicker visibleColumns={visibleColumns} onChange={updateVisible} />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {onSelectionChange && (
                  <TableHead className="w-[44px] sticky left-0 bg-muted/40 z-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                    />
                  </TableHead>
                )}
                {visibleColumnDefs.map((col) => {
                  const isActions = col.id === "actions";
                  const isSortable = !isActions;
                  const backendField = SORTABLE_COLUMNS[col.id];
                  const isActive =
                    (backendField && sortField === backendField) || localSort?.col === col.id;
                  return (
                    <TableHead
                      key={col.id}
                      className={cn(
                        col.width,
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        isActions && "text-right",
                      )}
                    >
                      {isSortable ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-8 -ml-3 font-medium text-xs uppercase tracking-wide",
                            col.align === "right" && "ml-auto -mr-3",
                            isActive && "text-foreground",
                          )}
                          onClick={() => handleSort(col.id)}
                          aria-label={`Sort by ${col.label}`}
                        >
                          {col.label} {sortIcon(col.id)}
                        </Button>
                      ) : (
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {col.label}
                        </span>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedVehicles.map((vehicle) => (
                <TableRow
                  key={vehicle.id}
                  className={cn(
                    "hover:bg-muted/40 cursor-pointer transition-colors",
                    selectedIds.includes(vehicle.vehicleId) && "bg-primary/5",
                  )}
                  onClick={() => onVehicleClick(vehicle)}
                >
                  {onSelectionChange && (
                    <TableCell
                      className="sticky left-0 bg-card z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedIds.includes(vehicle.vehicleId)}
                        onCheckedChange={() => handleSelectOne(vehicle.vehicleId)}
                        aria-label={`Select ${vehicle.plate}`}
                      />
                    </TableCell>
                  )}
                  {visibleColumnDefs.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn(
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.id === "actions" && "text-right",
                      )}
                    >
                      {renderCell(col.id, vehicle)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {vehicles.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnDefs.length + (onSelectionChange ? 1 : 0)}
                    className="text-center py-12"
                  >
                    <p className="text-muted-foreground">No vehicles found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
