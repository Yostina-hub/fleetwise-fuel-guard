/**
 * Vehicle bulk import/export schema — single source of truth.
 *
 * `IMPORTABLE_FIELDS` lists every column the user can populate via
 * the spreadsheet template. Each entry knows:
 *   - column header shown in the template (human friendly)
 *   - the DB column to write to
 *   - how to coerce the cell value (string/number/int/bool/date/enum)
 *   - whether it's required
 *
 * Adding a new importable field is a one-line change here — the parser,
 * validator and template generator pick it up automatically.
 */

export type FieldType =
  | "string"
  | "number"
  | "int"
  | "bool"
  | "date"
  | "enum";

export interface ImportField {
  /** Excel/CSV column header */
  header: string;
  /** vehicles.<column> name */
  dbKey: string;
  type: FieldType;
  required?: boolean;
  /** For type === "enum" */
  enumValues?: string[];
  maxLength?: number;
  min?: number;
  max?: number;
  /** Tooltip / template note */
  hint?: string;
}

export const FUEL_TYPES = [
  "diesel", "petrol", "gasoline", "electric", "hybrid", "cng", "lpg",
];
export const VEHICLE_STATUSES = ["active", "maintenance", "inactive"];
export const OWNERSHIP_TYPES = ["owned", "leased", "rented"];
export const VEHICLE_TYPES = [
  "sedan", "suv", "pickup", "truck", "van", "bus",
  "motorcycle", "trailer", "tanker", "other",
];
export const TRANSMISSION_TYPES = ["manual", "automatic", "amt", "cvt"];
export const DRIVE_TYPES = ["fwd", "rwd", "awd", "4wd"];

export const IMPORTABLE_FIELDS: ImportField[] = [
  // Identity (required)
  { header: "Plate Number",       dbKey: "plate_number",  type: "string", required: true,  maxLength: 20, hint: "e.g. AA-12345 (unique key for upsert)" },
  { header: "Make",               dbKey: "make",          type: "string", required: true,  maxLength: 100 },
  { header: "Model",              dbKey: "model",         type: "string", required: true,  maxLength: 100 },
  { header: "Year",               dbKey: "year",          type: "int",    required: true,  min: 1900, max: new Date().getFullYear() + 1 },

  // Classification
  { header: "Vehicle Type",       dbKey: "vehicle_type",       type: "enum",   enumValues: VEHICLE_TYPES },
  { header: "Vehicle Group",      dbKey: "vehicle_group",      type: "string", maxLength: 80 },
  { header: "Vehicle Category",   dbKey: "vehicle_category",   type: "string", maxLength: 80 },
  { header: "Color",              dbKey: "color",              type: "string", maxLength: 30 },
  { header: "VIN",                dbKey: "vin",                type: "string", maxLength: 30 },

  // Powertrain
  { header: "Fuel Type",          dbKey: "fuel_type",          type: "enum",   enumValues: FUEL_TYPES },
  { header: "Transmission Type",  dbKey: "transmission_type",  type: "enum",   enumValues: TRANSMISSION_TYPES },
  { header: "Drive Type",         dbKey: "drive_type",         type: "enum",   enumValues: DRIVE_TYPES },
  { header: "Engine CC",          dbKey: "engine_cc",          type: "number", min: 0,   max: 30000 },
  { header: "Engine Number",      dbKey: "engine_number",      type: "string", maxLength: 80 },
  { header: "Model Code",         dbKey: "model_code",         type: "string", maxLength: 80 },

  // Capacity
  { header: "Tank Capacity (L)",  dbKey: "tank_capacity_liters",  type: "number", min: 0, max: 10000 },
  { header: "Seating Capacity",   dbKey: "seating_capacity",      type: "int",    min: 0, max: 200 },
  { header: "Loading Capacity (Quintal)", dbKey: "loading_capacity_quintal", type: "number", min: 0, max: 10000 },
  { header: "Capacity (kg)",      dbKey: "capacity_kg",           type: "number", min: 0, max: 1_000_000 },

  // Operations
  { header: "Status",             dbKey: "status",             type: "enum",   enumValues: VEHICLE_STATUSES },
  { header: "Ownership Type",     dbKey: "ownership_type",     type: "enum",   enumValues: OWNERSHIP_TYPES },
  { header: "Assigned Location",  dbKey: "assigned_location",  type: "string", maxLength: 80, hint: "Use codes from the picker (e.g. zone_eaaz_aa, region_nr_mekelle)" },
  { header: "Specific Pool",      dbKey: "specific_pool",      type: "string", maxLength: 80 },
  { header: "Specific Location",  dbKey: "specific_location",  type: "string", maxLength: 200 },
  { header: "Purpose For",        dbKey: "purpose_for",        type: "string", maxLength: 80 },

  // Metrics
  { header: "Odometer (km)",      dbKey: "odometer_km",        type: "number", min: 0, max: 10_000_000 },
  { header: "Fuel Standard (km/L)", dbKey: "fuel_standard_km_per_liter", type: "number", min: 0, max: 100 },

  // Financial
  { header: "Purchasing Price (ETB)",  dbKey: "purchasing_price",     type: "number", min: 0, max: 1_000_000_000 },
  { header: "Current Market Price (ETB)", dbKey: "current_market_price", type: "number", min: 0, max: 1_000_000_000 },

  // Compliance / dates
  { header: "MFG Date",           dbKey: "mfg_date",           type: "date", hint: "YYYY-MM-DD or Excel date" },
  { header: "Year of Ownership",  dbKey: "year_of_ownership",  type: "int",  min: 1900, max: 2100 },
  { header: "Registration Cert No", dbKey: "registration_cert_no", type: "string", maxLength: 80 },
  { header: "Registration Expiry", dbKey: "registration_expiry", type: "date" },
  { header: "Insurance Policy No", dbKey: "insurance_policy_no", type: "string", maxLength: 80 },
  { header: "Insurance Expiry",   dbKey: "insurance_expiry",   type: "date" },
  { header: "Permit Expiry",      dbKey: "permit_expiry",      type: "date" },

  // Owner info
  { header: "Owner Type",         dbKey: "owner_type",         type: "string", maxLength: 50 },
  { header: "Owner Full Name",    dbKey: "owner_full_name",    type: "string", maxLength: 200 },
  { header: "Owner Phone",        dbKey: "owner_phone",        type: "string", maxLength: 30 },
  { header: "Owner Email",        dbKey: "owner_email",        type: "string", maxLength: 120 },
];

/** Quick lookup tables */
export const FIELD_BY_HEADER = new Map(
  IMPORTABLE_FIELDS.map((f) => [f.header.toLowerCase(), f]),
);
export const FIELD_BY_DBKEY = new Map(
  IMPORTABLE_FIELDS.map((f) => [f.dbKey.toLowerCase(), f]),
);

/** Resolve a header (header label OR dbKey) to a field definition */
export function resolveField(header: string): ImportField | undefined {
  const k = header.trim().toLowerCase();
  return FIELD_BY_HEADER.get(k) ?? FIELD_BY_DBKEY.get(k);
}
