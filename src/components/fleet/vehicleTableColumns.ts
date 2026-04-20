import { format } from "date-fns";

/**
 * Single source of truth for every column the Fleet table can render.
 * Each entry knows how to read its value from a row and how to display it.
 *
 * `row.raw` is the original DB row from `vehicles`, so any future column
 * added to the database can be exposed here without touching the table component.
 */
export type VehicleColumnId =
  // identity / classification
  | "plate"
  | "vin"
  | "make_model"
  | "year"
  | "color"
  | "vehicle_type"
  | "vehicle_category"
  | "vehicle_group"
  | "fuel_type"
  | "transmission_type"
  | "drive_type"
  | "route_type"
  | "ownership_type"
  | "lifecycle_stage"
  | "current_condition"
  | "safety_comfort_category"
  // live telemetry
  | "live_status"
  | "speed"
  | "fuel_level"
  | "device_connected"
  | "last_seen"
  | "location"
  // operations
  | "driver"
  | "assigned_location"
  | "specific_pool"
  | "specific_location"
  | "purpose_for"
  | "depot_id"
  // metrics & wear
  | "odometer"
  | "engine_hours"
  | "next_service"
  | "fuel_standard_km_per_liter"
  | "tank_capacity_liters"
  | "capacity_kg"
  | "capacity_volume"
  | "loading_capacity_quintal"
  | "seating_capacity"
  | "engine_cc"
  | "engine_number"
  | "model_code"
  // financial
  | "acquisition_date"
  | "acquisition_cost"
  | "purchasing_price"
  | "current_market_price"
  | "current_value"
  | "depreciation_rate"
  | "total_maintenance_cost"
  | "total_fuel_cost"
  | "total_downtime_hours"
  // rental
  | "rental_provider"
  | "rental_contract_number"
  | "rental_daily_rate"
  | "rental_start_date"
  | "rental_end_date"
  // compliance
  | "registration_cert_no"
  | "registration_expiry"
  | "insurance_policy_no"
  | "insurance_expiry"
  | "commercial_permit"
  | "permit_expiry"
  | "mfg_date"
  | "year_of_ownership"
  // safety / governor
  | "speed_cutoff_enabled"
  | "speed_cutoff_limit_kmh"
  | "speed_cutoff_grace_seconds"
  | "speed_governor_bypass_alert"
  // hardware
  | "gps_installed"
  | "gps_device_id"
  | "temperature_control"
  // status / housekeeping
  | "status"
  | "is_active"
  | "notes"
  | "created_at"
  | "updated_at"
  // actions (always rendered, never hidden)
  | "actions";

export type VehicleColumnGroup =
  | "Identity"
  | "Classification"
  | "Live"
  | "Operations"
  | "Specs"
  | "Financial"
  | "Rental"
  | "Compliance"
  | "Safety"
  | "Hardware"
  | "System";

export interface VehicleColumnDef {
  id: VehicleColumnId;
  label: string;
  group: VehicleColumnGroup;
  /** Visible by default when the user has no saved preferences. */
  defaultVisible: boolean;
  /** Cannot be hidden via the picker (Plate + Actions). */
  required?: boolean;
  /** Approximate width hint used to keep the table compact. */
  width?: string;
  /** Right-align numeric columns. */
  align?: "left" | "right" | "center";
}

/**
 * Column registry — order here = order in the table.
 */
export const VEHICLE_COLUMNS: VehicleColumnDef[] = [
  // Identity
  { id: "plate", label: "Plate", group: "Identity", defaultVisible: true, required: true, width: "w-[160px]" },
  { id: "vin", label: "VIN", group: "Identity", defaultVisible: true, width: "w-[140px]" },
  { id: "make_model", label: "Vehicle", group: "Identity", defaultVisible: true },
  { id: "year", label: "Year", group: "Identity", defaultVisible: false, align: "right" },
  { id: "color", label: "Color", group: "Identity", defaultVisible: false },

  // Classification
  { id: "vehicle_type", label: "Type", group: "Classification", defaultVisible: false },
  { id: "vehicle_category", label: "Category", group: "Classification", defaultVisible: false },
  { id: "vehicle_group", label: "Group", group: "Classification", defaultVisible: false },
  { id: "fuel_type", label: "Fuel Type", group: "Classification", defaultVisible: false },
  { id: "transmission_type", label: "Transmission", group: "Classification", defaultVisible: false },
  { id: "drive_type", label: "Drive Type", group: "Classification", defaultVisible: false },
  { id: "route_type", label: "Route Type", group: "Classification", defaultVisible: false },
  { id: "ownership_type", label: "Ownership", group: "Classification", defaultVisible: false },
  { id: "lifecycle_stage", label: "Lifecycle Stage", group: "Classification", defaultVisible: false },
  { id: "current_condition", label: "Condition", group: "Classification", defaultVisible: false },
  { id: "safety_comfort_category", label: "Safety/Comfort", group: "Classification", defaultVisible: false },

  // Live telemetry
  { id: "live_status", label: "Status", group: "Live", defaultVisible: true },
  { id: "speed", label: "Speed", group: "Live", defaultVisible: true, align: "right", width: "w-[100px]" },
  { id: "fuel_level", label: "Fuel", group: "Live", defaultVisible: true, width: "w-[140px]" },
  { id: "device_connected", label: "Device", group: "Live", defaultVisible: false },
  { id: "last_seen", label: "Last Update", group: "Live", defaultVisible: true },
  { id: "location", label: "Location", group: "Live", defaultVisible: false },

  // Operations
  { id: "driver", label: "Driver", group: "Operations", defaultVisible: true },
  { id: "assigned_location", label: "Assigned Location", group: "Operations", defaultVisible: false },
  { id: "specific_pool", label: "Specific Pool", group: "Operations", defaultVisible: false },
  { id: "specific_location", label: "Specific Location", group: "Operations", defaultVisible: false },
  { id: "purpose_for", label: "Purpose", group: "Operations", defaultVisible: false },
  { id: "depot_id", label: "Depot", group: "Operations", defaultVisible: false },

  // Specs
  { id: "odometer", label: "Odometer", group: "Specs", defaultVisible: true, align: "right" },
  { id: "engine_hours", label: "Engine Hours", group: "Specs", defaultVisible: false, align: "right" },
  { id: "next_service", label: "Next Service", group: "Specs", defaultVisible: false },
  { id: "fuel_standard_km_per_liter", label: "Std km/L", group: "Specs", defaultVisible: false, align: "right" },
  { id: "tank_capacity_liters", label: "Tank (L)", group: "Specs", defaultVisible: false, align: "right" },
  { id: "capacity_kg", label: "Capacity (kg)", group: "Specs", defaultVisible: false, align: "right" },
  { id: "capacity_volume", label: "Capacity (m³)", group: "Specs", defaultVisible: false, align: "right" },
  { id: "loading_capacity_quintal", label: "Load (quintal)", group: "Specs", defaultVisible: false, align: "right" },
  { id: "seating_capacity", label: "Seats", group: "Specs", defaultVisible: false, align: "right" },
  { id: "engine_cc", label: "Engine CC", group: "Specs", defaultVisible: false, align: "right" },
  { id: "engine_number", label: "Engine #", group: "Specs", defaultVisible: false },
  { id: "model_code", label: "Model Code", group: "Specs", defaultVisible: false },

  // Financial
  { id: "acquisition_date", label: "Acquired", group: "Financial", defaultVisible: false },
  { id: "acquisition_cost", label: "Acquisition Cost", group: "Financial", defaultVisible: false, align: "right" },
  { id: "purchasing_price", label: "Purchase Price", group: "Financial", defaultVisible: false, align: "right" },
  { id: "current_market_price", label: "Market Price", group: "Financial", defaultVisible: false, align: "right" },
  { id: "current_value", label: "Current Value", group: "Financial", defaultVisible: false, align: "right" },
  { id: "depreciation_rate", label: "Depreciation %", group: "Financial", defaultVisible: false, align: "right" },
  { id: "total_maintenance_cost", label: "Maint. Cost", group: "Financial", defaultVisible: false, align: "right" },
  { id: "total_fuel_cost", label: "Fuel Cost", group: "Financial", defaultVisible: false, align: "right" },
  { id: "total_downtime_hours", label: "Downtime (h)", group: "Financial", defaultVisible: false, align: "right" },

  // Rental
  { id: "rental_provider", label: "Rental Provider", group: "Rental", defaultVisible: false },
  { id: "rental_contract_number", label: "Rental Contract #", group: "Rental", defaultVisible: false },
  { id: "rental_daily_rate", label: "Daily Rate", group: "Rental", defaultVisible: false, align: "right" },
  { id: "rental_start_date", label: "Rental Start", group: "Rental", defaultVisible: false },
  { id: "rental_end_date", label: "Rental End", group: "Rental", defaultVisible: false },

  // Compliance
  { id: "registration_cert_no", label: "Reg. Cert #", group: "Compliance", defaultVisible: false },
  { id: "registration_expiry", label: "Reg. Expiry", group: "Compliance", defaultVisible: false },
  { id: "insurance_policy_no", label: "Insurance #", group: "Compliance", defaultVisible: false },
  { id: "insurance_expiry", label: "Insurance Expiry", group: "Compliance", defaultVisible: false },
  { id: "commercial_permit", label: "Commercial Permit", group: "Compliance", defaultVisible: false },
  { id: "permit_expiry", label: "Permit Expiry", group: "Compliance", defaultVisible: false },
  { id: "mfg_date", label: "Mfg. Date", group: "Compliance", defaultVisible: false },
  { id: "year_of_ownership", label: "Year of Ownership", group: "Compliance", defaultVisible: false, align: "right" },

  // Safety / governor
  { id: "speed_cutoff_enabled", label: "Speed Cutoff", group: "Safety", defaultVisible: false },
  { id: "speed_cutoff_limit_kmh", label: "Cutoff Limit", group: "Safety", defaultVisible: false, align: "right" },
  { id: "speed_cutoff_grace_seconds", label: "Cutoff Grace (s)", group: "Safety", defaultVisible: false, align: "right" },
  { id: "speed_governor_bypass_alert", label: "Bypass Alert", group: "Safety", defaultVisible: false },

  // Hardware
  { id: "gps_installed", label: "GPS Installed", group: "Hardware", defaultVisible: false },
  { id: "gps_device_id", label: "GPS Device ID", group: "Hardware", defaultVisible: false },
  { id: "temperature_control", label: "Temp. Control", group: "Hardware", defaultVisible: false },

  // System
  { id: "status", label: "DB Status", group: "System", defaultVisible: false },
  { id: "is_active", label: "Active", group: "System", defaultVisible: false },
  { id: "notes", label: "Notes", group: "System", defaultVisible: false },
  { id: "created_at", label: "Created", group: "System", defaultVisible: false },
  { id: "updated_at", label: "Updated", group: "System", defaultVisible: false },

  // Actions (always last, always shown)
  { id: "actions", label: "Actions", group: "System", defaultVisible: true, required: true, width: "w-[180px]", align: "right" },
];

export const COLUMN_BY_ID: Record<VehicleColumnId, VehicleColumnDef> = VEHICLE_COLUMNS.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<VehicleColumnId, VehicleColumnDef>,
);

export const DEFAULT_VISIBLE_COLUMNS: VehicleColumnId[] = VEHICLE_COLUMNS
  .filter((c) => c.defaultVisible || c.required)
  .map((c) => c.id);

const STORAGE_KEY = "fleet.vehicleTable.visibleColumns.v1";

export const loadVisibleColumns = (): VehicleColumnId[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_COLUMNS;
    const parsed = JSON.parse(raw) as VehicleColumnId[];
    if (!Array.isArray(parsed)) return DEFAULT_VISIBLE_COLUMNS;
    // Always keep required columns visible.
    const set = new Set(parsed);
    VEHICLE_COLUMNS.filter((c) => c.required).forEach((c) => set.add(c.id));
    return VEHICLE_COLUMNS.map((c) => c.id).filter((id) => set.has(id));
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
};

export const saveVisibleColumns = (cols: VehicleColumnId[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
  } catch {
    /* ignore quota errors */
  }
};

/* ------------------------- formatting helpers ------------------------- */

export const fmtDate = (value: string | null | undefined) => {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd MMM yyyy");
  } catch {
    return "—";
  }
};

export const fmtDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd MMM yyyy HH:mm");
  } catch {
    return "—";
  }
};

export const fmtNumber = (
  value: number | null | undefined,
  options: Intl.NumberFormatOptions = {},
) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined, options).format(value);
};

export const fmtMoney = (value: number | null | undefined) =>
  fmtNumber(value, { style: "currency", currency: "ETB", maximumFractionDigits: 0 });

export const fmtBool = (value: boolean | null | undefined) =>
  value === null || value === undefined ? "—" : value ? "Yes" : "No";

export const fmtText = (value: string | null | undefined) =>
  value && value.trim() !== "" ? value : "—";
