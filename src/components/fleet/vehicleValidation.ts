/**
 * Vehicle Registration — Validation & Sanitization Schema
 * ========================================================
 * Single source of truth for field-level validation across the
 * registration dialog (Basic Info tabs + Compliance/Operations/Owner).
 *
 * - All string fields are trimmed (sanitization)
 * - Length caps prevent abuse + DB overflow
 * - Patterns enforce VIN, plate, phone, email, year ranges
 * - Used both for onBlur per-field validation AND final submit
 */
import { z } from "zod";

const CURRENT_YEAR = new Date().getFullYear();

// Reusable atoms
const trimmedOptional = (max: number) =>
  z.string().trim().max(max, `Maximum ${max} characters`).optional().or(z.literal(""));

const trimmedRequired = (label: string, min = 1, max = 200) =>
  z
    .string()
    .trim()
    .min(min, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

const numericString = (label: string, opts?: { min?: number; max?: number; integer?: boolean }) =>
  z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => {
        if (!v) return true;
        const n = Number(v);
        if (Number.isNaN(n)) return false;
        if (opts?.integer && !Number.isInteger(n)) return false;
        if (opts?.min !== undefined && n < opts.min) return false;
        if (opts?.max !== undefined && n > opts.max) return false;
        return true;
      },
      {
        message: opts?.integer
          ? `${label} must be a whole number${opts?.min !== undefined ? ` ≥ ${opts.min}` : ""}`
          : `${label} must be a valid number${opts?.min !== undefined ? ` ≥ ${opts.min}` : ""}${opts?.max !== undefined ? `, ≤ ${opts.max}` : ""}`,
      },
    );

/**
 * Compliance expiry date: optional, but if provided MUST be today or future.
 * Blocks registering a vehicle whose insurance / registration / permit
 * has already expired.
 */
const futureOrEmptyDate = (label: string) =>
  z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => {
        if (!v) return true;
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d.getTime() >= today.getTime();
      },
      { message: `${label} is expired — renew it before registering this vehicle` },
    );

/** Per-field schemas — keyed by formData field name. */
export const vehicleFieldSchemas = {
  // ----- Identity -----
  plate_number_part: z
    .string()
    .trim()
    .min(1, "Plate number is required")
    .regex(/^\d{1,5}$/, "Plate number must be 1–5 digits"),
  purpose_for: trimmedOptional(100),
  specific_pool: trimmedOptional(100),
  specific_location: trimmedOptional(200),
  assigned_location: trimmedOptional(100),
  vehicle_type: trimmedOptional(50),
  vehicle_group: trimmedOptional(80),

  // ----- Specifications -----
  make: trimmedRequired("Make", 1, 100),
  model: trimmedRequired("Model", 1, 100),
  model_code: trimmedOptional(50),
  year: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine((n) => !Number.isNaN(n), "Year must be a number")
    .refine((n) => n >= 1900, "Year must be 1900 or later")
    .refine((n) => n <= CURRENT_YEAR + 2, `Year cannot exceed ${CURRENT_YEAR + 2}`),
  mfg_date: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid manufacturing date")
    .refine((v) => !v || new Date(v) <= new Date(), "MFG date cannot be in the future"),
  color: trimmedOptional(40),
  vin: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[A-HJ-NPR-Z0-9]{11,17}$/i.test(v), "VIN must be 11–17 characters (no I, O, Q)"),
  engine_number: trimmedOptional(50),
  transmission_type: trimmedOptional(30),
  drive_type: trimmedOptional(20),
  engine_cc: numericString("Engine CC", { min: 0, max: 50000, integer: true }),
  fuel_type: trimmedOptional(30),

  // ----- Valuation -----
  purchasing_price: numericString("Purchasing price", { min: 0 }),
  current_market_price: numericString("Market price", { min: 0 }),
  current_condition: trimmedOptional(50),
  fuel_standard_km_per_liter: numericString("Fuel standard", { min: 0, max: 200 }),
  seating_capacity: numericString("Seating capacity", { min: 0, max: 200, integer: true }),
  loading_capacity_quintal: numericString("Loading capacity", { min: 0 }),
  year_of_ownership: numericString("Year of ownership", {
    min: 1900,
    max: CURRENT_YEAR + 1,
    integer: true,
  }),
  safety_comfort_category: trimmedOptional(50),

  // ----- Compliance -----
  registration_cert_no: trimmedOptional(100),
  registration_expiry: z.string().optional().or(z.literal("")),
  insurance_policy_no: trimmedOptional(100),
  insurance_expiry: z.string().optional().or(z.literal("")),
  permit_expiry: z.string().optional().or(z.literal("")),

  // ----- Operations -----
  capacity_kg: numericString("Capacity (kg)", { min: 0, max: 200000 }),
  capacity_volume: numericString("Cargo volume", { min: 0, max: 1000 }),
  gps_device_id: trimmedOptional(100),
  odometer_km: numericString("Odometer", { min: 0, max: 9999999 }),
  tank_capacity_liters: numericString("Tank capacity", { min: 0, max: 10000 }),

  // ----- Owner -----
  owner_full_name: trimmedOptional(200),
  owner_contact_person: trimmedOptional(150),
  owner_phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[+\d\s\-().]{7,20}$/.test(v), "Invalid phone number"),
  owner_email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email address"),
  owner_govt_id: trimmedOptional(100),
  owner_tax_id: trimmedOptional(50),

  notes: trimmedOptional(2000),
} as const;

export type VehicleFieldName = keyof typeof vehicleFieldSchemas;

/** Validate a single field; returns error message or null. */
export function validateVehicleField(field: VehicleFieldName, value: unknown): string | null {
  const schema = vehicleFieldSchemas[field];
  if (!schema) return null;
  const result = schema.safeParse(value);
  if (result.success) return null;
  return result.error.errors[0]?.message ?? "Invalid value";
}

/** Validate the full form. Returns { ok, errors } where errors maps field → message. */
export function validateVehicleForm(formData: Record<string, unknown>): {
  ok: boolean;
  errors: Partial<Record<VehicleFieldName, string>>;
  firstError?: { field: VehicleFieldName; message: string };
} {
  const errors: Partial<Record<VehicleFieldName, string>> = {};
  let firstError: { field: VehicleFieldName; message: string } | undefined;
  (Object.keys(vehicleFieldSchemas) as VehicleFieldName[]).forEach((key) => {
    const msg = validateVehicleField(key, formData[key]);
    if (msg) {
      errors[key] = msg;
      if (!firstError) firstError = { field: key, message: msg };
    }
  });
  return { ok: Object.keys(errors).length === 0, errors, firstError };
}

/** Map a field name → which top-level dialog tab contains it. */
export const FIELD_TO_SECTION: Record<VehicleFieldName, string> = {
  plate_number_part: "basic", purpose_for: "basic", specific_pool: "basic",
  specific_location: "basic", assigned_location: "basic",
  vehicle_type: "basic", vehicle_group: "basic",
  make: "basic", model: "basic", model_code: "basic", year: "basic", mfg_date: "basic",
  color: "basic", vin: "basic", engine_number: "basic", transmission_type: "basic",
  drive_type: "basic", engine_cc: "basic", fuel_type: "basic",
  purchasing_price: "basic", current_market_price: "basic", current_condition: "basic",
  fuel_standard_km_per_liter: "basic", seating_capacity: "basic",
  loading_capacity_quintal: "basic", year_of_ownership: "basic",
  safety_comfort_category: "basic",
  registration_cert_no: "compliance", registration_expiry: "compliance",
  insurance_policy_no: "compliance", insurance_expiry: "compliance",
  permit_expiry: "compliance",
  capacity_kg: "operations", capacity_volume: "operations",
  gps_device_id: "operations", odometer_km: "operations", tank_capacity_liters: "operations",
  owner_full_name: "owner", owner_contact_person: "owner", owner_phone: "owner",
  owner_email: "owner", owner_govt_id: "owner", owner_tax_id: "owner",
  notes: "notes",
};
