/**
 * vehicleRequestValidation
 * ------------------------
 * Professional, descriptive validation + sanitization for the Fleet
 * (Vehicle) Request form. Mirrors the project standard used by driver/vehicle
 * forms — every field has a clear, human-readable message that explains:
 *   1. What is wrong
 *   2. Why it is wrong (the rule)
 *   3. What the user should do to fix it
 *
 * Validation runs:
 *   - on blur (per-field) — see `useVehicleRequestValidation`
 *   - on submit (whole form) via `validateVehicleRequestForm`
 *
 * Sanitization:
 *   - trims whitespace
 *   - collapses internal whitespace where safe
 *   - normalizes phone numbers (keeps + digits spaces -)
 *   - strips control chars from free-text fields
 */
import { z } from "zod";
import {
  getVehicleClassProfile,
  type CargoLoad,
} from "@/lib/vehicle-requests/vehicleClassRecommendation";

/** Cargo size ordering — keeps validation in sync with the recommender. */
const CARGO_ORDER: Record<CargoLoad, number> = { none: 0, small: 1, medium: 2, large: 3 };

/** Strip ASCII control chars (except \n, \t) and trim. Safe default for free-text. */
export const sanitizeText = (v: unknown): string => {
  if (v == null) return "";
  return String(v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
};

/** Collapse internal spaces — used for short text (names, codes). */
export const sanitizeShortText = (v: unknown): string =>
  sanitizeText(v).replace(/\s+/g, " ");

/**
 * Phone normalizer — Ethiopian numbers only.
 * Strips every character except digits and an optional leading `+`.
 * Spaces, dashes, parentheses, and any other formatting are removed so the
 * stored value is the raw E.164-style string (e.g. "+251911234567" or
 * "0911234567"). This matches what the SMS gateway and ERPNext expect.
 */
export const sanitizePhone = (v: unknown): string => {
  const s = sanitizeText(v);
  if (!s) return "";
  // Keep only digits and a single leading +.
  const hasPlus = s.trim().startsWith("+");
  const digits = s.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
};

/** Project number normalizer: uppercase, allow letters/digits/dash/underscore. */
export const sanitizeProjectNumber = (v: unknown): string =>
  sanitizeText(v).toUpperCase().replace(/[^A-Z0-9_\-/]/g, "");

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
/**
 * Ethiopian phone formats accepted (digits only, no separators):
 *   • Mobile local:        09XXXXXXXX                (10 digits)
 *   • Mobile international: +2519XXXXXXXX            (13 chars incl. +)
 *   • Landline local:       0[1-8]XXXXXXXX           (10 digits, area codes 11–88)
 *   • Landline international: +251[1-8]XXXXXXXX      (13 chars incl. +)
 * Numbers from any other country are rejected.
 */
const ETHIOPIAN_MOBILE_LOCAL_RE = /^09\d{8}$/;
const ETHIOPIAN_MOBILE_INTL_RE = /^\+2519\d{8}$/;
const ETHIOPIAN_LANDLINE_LOCAL_RE = /^0[1-8]\d{8}$/;
const ETHIOPIAN_LANDLINE_INTL_RE = /^\+251[1-8]\d{8}$/;
const PROJECT_RE = /^[A-Z0-9][A-Z0-9_\-/]{2,29}$/;

/** True when the (already sanitized) phone matches any Ethiopian format. */
export function isEthiopianPhone(v: string): boolean {
  return (
    ETHIOPIAN_MOBILE_LOCAL_RE.test(v) ||
    ETHIOPIAN_MOBILE_INTL_RE.test(v) ||
    ETHIOPIAN_LANDLINE_LOCAL_RE.test(v) ||
    ETHIOPIAN_LANDLINE_INTL_RE.test(v)
  );
}

export type VRFieldName =
  | "request_type"
  | "date"
  | "start_time"
  | "end_time"
  | "start_date"
  | "end_date"
  | "departure_place"
  | "destination"
  | "num_vehicles"
  | "passengers"
  | "vehicle_type"
  | "trip_type"
  | "pool_category"
  | "pool_name"
  | "purpose"
  | "purpose_category"
  | "cargo_load"
  | "project_number"
  | "priority"
  | "contact_phone"
  | "cargo_weight_kg"
  | "stops";

export interface VRFormValues {
  request_type: string;
  date?: Date | string | null;
  start_time?: string;
  end_time?: string;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  departure_place?: string;
  destination?: string;
  /** Coordinates required so the trip resolves to a real map location. */
  departure_lat?: number | null;
  departure_lng?: number | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  /** Ordered intermediate waypoints — each must have a real map coordinate. */
  stops?: Array<{ name?: string; lat?: number | null; lng?: number | null }>;
  num_vehicles?: string | number;
  passengers?: string | number;
  vehicle_type?: string;
  trip_type?: string;
  pool_category?: string;
  pool_name?: string;
  purpose?: string;
  purpose_category?: string;
  project_number?: string;
  priority?: string;
  contact_phone?: string;
  /** Drives passenger+cargo fitness check on vehicle_type. */
  cargo_load?: CargoLoad | "";
  /** Optional cargo total weight (kg) — validated against vehicle max payload. */
  cargo_weight_kg?: string | number | null;
}

/* --------------------------------------------------------------------------
 * Field-level validators — return a descriptive error message or undefined.
 * Each message is intentionally specific (what's wrong + how to fix).
 * -------------------------------------------------------------------------- */

const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
};

/** Coordinate sanity: finite number within Earth's lat/lng bounds. */
const isFiniteCoord = (n: unknown): boolean => {
  const v = Number(n);
  return Number.isFinite(v) && v !== 0 && Math.abs(v) <= 180;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function validateVRField(
  field: VRFieldName,
  value: unknown,
  ctx: Partial<VRFormValues> = {},
): string | undefined {
  const isProject = ctx.request_type === "project_operation";
  const isNighttime = ctx.request_type === "nighttime_operation";
  // Nighttime is a single-day variant of Daily (uses `date` + start/end times).
  // Operational window (EAT, 24h): start ≥ 20:00 (8:00 night) OR start < 06:00,
  // end ≤ 06:00 (next morning) OR end > 20:00. This matches the auto-switcher
  // in VehicleRequestForm.tsx so a trip categorized as Night never fails the
  // window check it was just classified by.
  const isDaily = ctx.request_type === "daily_operation" || isNighttime;

  switch (field) {
    case "request_type": {
      const v = sanitizeText(value);
      if (!v) return "Please choose a request type (Daily, Nighttime, Project, Field, Group, or Messenger Service).";
      if (!["daily_operation", "nighttime_operation", "project_operation", "field_operation", "group_operation", "messenger_service"].includes(v))
        return "Invalid request type. Pick one of the operation cards above.";
      return;
    }

    case "date": {
      if (!isDaily) return;
      const d = toDate(value);
      if (!d) return "Trip date is required. Use the calendar to pick the day of travel.";
      if (d < startOfToday()) return "Trip date cannot be in the past. Pick today or a future date.";
      return;
    }

    case "start_time": {
      if (!isDaily) return;
      const v = sanitizeText(value);
      if (!v) return "Start time is required.";
      if (!HHMM_RE.test(v)) return "Start time must use 24-hour HH:MM format (e.g. 08:30).";
      if (isNighttime && !(v >= "20:00" || v < "06:00")) {
        return "Nighttime operations must start at or after 20:00 (8:00 night) or before 06:00 EAT.";
      }
      // If the trip date is today, reject times already in the past on the
      // requester's machine clock — but allow a small grace window so the
      // live-clock auto-fill, network latency, and submit-click delay never
      // turn a freshly-prefilled time into a "you're in the past" error.
      const tripDate = toDate(ctx.date);
      if (tripDate) {
        const today = startOfToday();
        const sameDay = tripDate.getFullYear() === today.getFullYear()
          && tripDate.getMonth() === today.getMonth()
          && tripDate.getDate() === today.getDate();
        if (sameDay) {
          const GRACE_MINUTES = 5;
          const now = new Date();
          const graceCutoff = new Date(now.getTime() - GRACE_MINUTES * 60_000);
          const cutoffHHMM = `${String(graceCutoff.getHours()).padStart(2, "0")}:${String(graceCutoff.getMinutes()).padStart(2, "0")}`;
          if (v < cutoffHHMM) {
            const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
            return `Start time (${v}) is more than ${GRACE_MINUTES} minutes in the past — current time is ${nowHHMM}. Pick a future time or change the date.`;
          }
        }
      }
      return;
    }

    case "end_time": {
      if (!isDaily) return;
      const v = sanitizeText(value);
      if (!v) return "End time is required.";
      if (!HHMM_RE.test(v)) return "End time must use 24-hour HH:MM format (e.g. 17:00).";
      if (isNighttime && !(v <= "06:00" || v > "20:00")) {
        return "Nighttime operations must end by 06:00 (next morning) or after 20:00 EAT.";
      }
      const start = sanitizeText(ctx.start_time);
      // For night ops the trip can cross midnight, so equal-time / earlier end
      // is only invalid when both times sit on the same side of midnight.
      if (start && HHMM_RE.test(start) && v <= start) {
        const startsAtNight = start >= "20:00";
        const endsAtNight = v >= "20:00";
        const sameSide = !isNighttime || startsAtNight === endsAtNight;
        if (sameSide)
          return `End time (${v}) must be later than start time (${start}). A trip needs at least 1 minute.`;
      }
      return;
    }

    case "start_date": {
      if (isDaily) return;
      const d = toDate(value);
      if (!d) return "Start date is required for multi-day operations.";
      if (d < startOfToday()) return "Start date cannot be in the past. Pick today or a future date.";
      return;
    }

    case "end_date": {
      if (isDaily) return;
      const d = toDate(value);
      if (isProject && !d) return "End date is required for Project Operations so the duration can be approved.";
      if (!d) return;
      const start = toDate(ctx.start_date);
      if (start && d < start)
        return `End date (${d.toLocaleDateString()}) cannot be before the start date (${start.toLocaleDateString()}).`;
      return;
    }

    case "departure_place": {
      const v = sanitizeShortText(value);
      if (!v) return "Departure place is required. Pick a location from the map.";
      if (v.length < 2) return "Departure place is too short. Pick a location from the map.";
      if (v.length > 200) return "Departure place is too long (max 200 characters).";
      // Coordinates are required so the trip resolves to a real map location —
      // typed text alone is not enough for routing, distance, or dispatch.
      if (!isFiniteCoord(ctx.departure_lat) || !isFiniteCoord(ctx.departure_lng)) {
        return "Pick the departure on the map. Free-text addresses without coordinates are not allowed.";
      }
      return;
    }

    case "destination": {
      const v = sanitizeShortText(value);
      if (!v) return "Destination is required. Pick a location from the map.";
      if (v.length < 2) return "Destination is too short. Pick a location from the map.";
      if (v.length > 200) return "Destination is too long (max 200 characters).";
      if (!isFiniteCoord(ctx.destination_lat) || !isFiniteCoord(ctx.destination_lng)) {
        return "Pick the destination on the map. Free-text addresses without coordinates are not allowed.";
      }
      return;
    }

    case "num_vehicles": {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 1)
        return "Enter the number of vehicles needed (minimum 1).";
      if (!Number.isInteger(n))
        return "Number of vehicles must be a whole number (e.g. 1, 2, 3).";
      // Hard ceiling only — every operation type may request up to 50 vehicles
      // per single submission. Per-operation caps were removed by request:
      // dispatchers decide what's appropriate for Daily / Nighttime / Field /
      // Project / Messenger without the form blocking them.
      if (n > 50)
        return "Maximum 50 vehicles per request. Split into multiple requests if you need more.";
      return;
    }

    case "passengers": {
      const cargo = sanitizeText(ctx.cargo_load) as CargoLoad | "";
      const n = Number(value);
      // -1 is the sentinel for "Cargo Only" (driver only, no passengers).
      if (n === -1) return;
      if (!Number.isFinite(n) || n < 1) {
        return cargo && cargo !== "none"
          ? "Passenger count is required for Passengers + Cargo. Enter at least 1, or switch to Cargo Only."
          : "Passenger count is required for Passengers Only. Enter at least 1.";
      }
      if (!Number.isInteger(n))
        return "Passengers must be a whole number.";
      if (n > 100)
        return "That's a lot of passengers (max 100). For larger groups, file multiple requests or a bus charter.";
      return;
    }

    case "vehicle_type": {
      const v = sanitizeText(value);
      if (!v) {
        return "Pick a vehicle type that fits your passengers and cargo.";
      }
      if (v.length > 50) return "Vehicle type is too long.";

      // Cross-field fitness check: ensure the chosen class can actually carry
      // the requested passengers and cargo. Mirrors the recommender so the
      // form can never submit an under-spec'd combination.
      const profile = getVehicleClassProfile(v);
      if (!profile) {
        return "That vehicle type isn't in the catalogue. Pick one from the list.";
      }
      if (profile.costBand === "specialised") {
        return `${profile.label} is dispatcher-assigned only. Pick a personnel-transport class or contact dispatch.`;
      }
      const passengersRaw = Number(ctx.passengers);
      const passengers = passengersRaw === -1 ? 0 : Math.max(1, passengersRaw || 1);
      if (passengers > 0 && profile.capacity < passengers) {
        return `${profile.label} seats ${profile.capacity} but you need ${passengers}. Pick a larger class or reduce passengers.`;
      }
      const cargo: CargoLoad = (ctx.cargo_load as CargoLoad) || "none";
      const cargoNeeded = CARGO_ORDER[cargo] ?? 0;
      if (CARGO_ORDER[profile.cargo] < cargoNeeded) {
        return `${profile.label} can't carry ${cargo} cargo. Pick a class with at least ${cargo} cargo capacity.`;
      }
      // Cargo weight: ensure the chosen vehicle's max payload covers the
      // requested kilograms. We tolerate up to 0 weight (passengers only).
      const weightRaw = Number(ctx.cargo_weight_kg);
      const weight = Number.isFinite(weightRaw) && weightRaw > 0 ? weightRaw : 0;
      if (weight > 0 && profile.maxPayloadKg < weight) {
        return `${profile.label} carries up to ${profile.maxPayloadKg.toLocaleString()} kg but you need ${weight.toLocaleString()} kg. Pick a class with greater payload capacity.`;
      }
      return;
    }

    case "trip_type": {
      const v = sanitizeText(value);
      if (!v) return "Trip type is required. Choose 'One Way' or 'Round Trip'.";
      if (!["one_way", "round_trip"].includes(v))
        return "Trip type must be either 'One Way' or 'Round Trip'.";
      return;
    }

    case "pool_category": {
      const v = sanitizeText(value);
      if (!v) return "Pool category is required. Choose Corporate, Zone, or Region.";
      if (!["corporate", "zone", "region"].includes(v))
        return "Invalid pool category. Choose Corporate, Zone, or Region.";
      return;
    }

    case "pool_name": {
      const v = sanitizeText(value);
      if (!ctx.pool_category) {
        // Surface a clear blocker so the user knows why this field is empty.
        return "Pick a pool category first to enable assigned location.";
      }
      if (!v) return "Assigned location is required. Pick the specific pool / location.";
      return;
    }

    case "cargo_load": {
      const v = sanitizeText(value);
      const passengersN = Number(ctx.passengers);
      const isCargoOnly = passengersN === -1;
      // Passengers Only mode: cargo_load is implicitly "none" and not required.
      // The form auto-sets it; only validate the value if the user picked one.
      if (!isCargoOnly && v === "none") return;
      if (!v) {
        return isCargoOnly
          ? "Cargo size is required for Cargo Only. Pick Small, Medium, or Large."
          : "Cargo size is required for Passengers + Cargo. Pick Small, Medium, or Large (or switch to Passengers Only).";
      }
      if (!["none", "small", "medium", "large"].includes(v))
        return "Invalid cargo size. Pick Small, Medium, or Large.";
      if (isCargoOnly && v === "none")
        return "Cargo Only requires a real cargo size. Pick Small, Medium, or Large.";
      return;
    }

    case "purpose_category": {
      const v = sanitizeText(value);
      if (!v) return "Business purpose is required. Pick the closest category from the list.";
      return;
    }

    case "purpose": {
      const v = sanitizeText(value);
      if (!v) return "Trip description is required so approvers understand the purpose.";
      if (v.length < 10)
        return `Trip description is too brief (${v.length}/10 chars). Add more detail — what, where, and why.`;
      if (v.length > 1000)
        return `Trip description is too long (${v.length}/1000 chars). Please summarize.`;
      return;
    }

    case "project_number": {
      if (!isProject) return;
      const v = sanitizeProjectNumber(value);
      if (!v) return "Project number is required for Project Operations (e.g. PRJ-2026-001).";
      if (!PROJECT_RE.test(v))
        return "Project number must be 3–30 chars, letters/digits/dashes only (e.g. PRJ-2026-001).";
      return;
    }

    case "priority": {
      const v = sanitizeText(value);
      if (!v) return "Priority is required. Pick Low, Normal, High, or Urgent.";
      if (!["low", "normal", "high", "urgent"].includes(v))
        return "Priority must be Low, Normal, High, or Urgent.";
      return;
    }

    case "contact_phone": {
      const raw = sanitizeText(value);
      if (!raw) return "Contact phone is required so dispatch can reach you during the trip.";
      const v = sanitizePhone(value);
      // User typed something but only invalid characters remained after sanitizing.
      if (!v)
        return "Phone number contains invalid characters. Use digits, spaces, dashes, parentheses, and an optional leading + (e.g. 0911 234 567 or +251 911 234 567).";
      // Detect characters the user typed that are not allowed in a phone.
      if (raw.replace(/[^\d+\s\-()]/g, "").length !== raw.length)
        return "Phone number contains invalid characters. Only digits, spaces, dashes, parentheses, and a leading + are allowed.";
      if (!PHONE_RE.test(v))
        return "Phone number looks invalid. Use Ethiopian local format starting with 09 (e.g. 0911 234 567), or international format (e.g. +251 911 234 567).";
      const digitsOnly = v.replace(/\D/g, "");
      // Reject a leading + followed by no digits, or multiple + signs.
      if ((v.match(/\+/g) || []).length > 1)
        return "Phone number can only contain one leading + sign.";
      if (v.includes("+") && !v.startsWith("+"))
        return "The + sign must appear only at the start of the phone number.";
      const hasPlus = v.startsWith("+");
      // Ethiopian local format: must start with 09 and be exactly 10 digits.
      if (!hasPlus && digitsOnly.startsWith("09")) {
        if (digitsOnly.length !== 10)
          return `Ethiopian mobile numbers must be exactly 10 digits starting with 09 (you entered ${digitsOnly.length} digits).`;
        return;
      }
      // Ethiopian local format requirement: if no + sign, the number must
      // start with 09 for mobile.
      if (!hasPlus && digitsOnly.startsWith("0") && !digitsOnly.startsWith("09"))
        return "Local Ethiopian numbers must start with 09 (e.g. 0911 234 567).";
      if (!hasPlus && !digitsOnly.startsWith("0"))
        return "Phone number must start with 09 (local) or + (international, e.g. +251 911 234 567).";
      // International format checks.
      if (digitsOnly.length < 7)
        return `Phone number is too short (${digitsOnly.length} digits). It must contain at least 7 digits.`;
      if (digitsOnly.length > 15)
        return `Phone number is too long (${digitsOnly.length} digits). Maximum is 15 digits per ITU E.164.`;
      return;
    }

    case "cargo_weight_kg": {
      // Only required when the trip carries cargo (Passengers + Cargo or
      // Cargo Only). Passengers Only trips don't need a weight.
      const passengersN = Number(ctx.passengers);
      const isCargoOnly = passengersN === -1;
      const cargo = sanitizeText(ctx.cargo_load) as CargoLoad | "";
      const hasCargo = isCargoOnly || (cargo && cargo !== "none");
      if (!hasCargo) return;
      const raw = sanitizeText(value);
      if (!raw) return "Total cargo weight is required. Enter the approximate weight in kilograms (e.g. 250).";
      const n = Number(raw);
      if (!Number.isFinite(n)) return "Cargo weight must be a number in kilograms.";
      if (n <= 0) return "Cargo weight must be greater than 0 kg. Switch to Passengers Only if there is no cargo.";
      if (n > 50000) return "Cargo weight is too high (max 50,000 kg). Split the load across multiple requests.";
      return;
    }

    case "stops": {
      const list = Array.isArray(value) ? value : [];
      for (let i = 0; i < list.length; i++) {
        const s = list[i] || {};
        const name = sanitizeShortText(s.name);
        const hasCoords = isFiniteCoord(s.lat) && isFiniteCoord(s.lng);
        // Empty rows are tolerated (the form drops them on submit), but if
        // the user typed a stop name OR picked partial coords, require a
        // real map pick — typed text without a coordinate is rejected.
        if ((name || s.lat != null || s.lng != null) && !hasCoords) {
          return `Stop ${i + 1} must be picked on the map. Free-text stops without coordinates are not allowed.`;
        }
        if (name && name.length > 200) {
          return `Stop ${i + 1} name is too long (max 200 characters).`;
        }
      }
      return;
    }

    default:
      return;
  }
}

/** Validate the whole form. Returns descriptive errors keyed by field. */
export function validateVehicleRequestForm(values: VRFormValues): {
  valid: boolean;
  errors: Partial<Record<VRFieldName, string>>;
} {
  const fields: VRFieldName[] = [
    "request_type",
    "date",
    "start_time",
    "end_time",
    "start_date",
    "end_date",
    "departure_place",
    "destination",
    "num_vehicles",
    "passengers",
    "vehicle_type",
    "trip_type",
    "pool_category",
    "pool_name",
    "cargo_load",
    "purpose_category",
    "purpose",
    "project_number",
    "priority",
    "contact_phone",
    "cargo_weight_kg",
    "stops",
  ];
  const errors: Partial<Record<VRFieldName, string>> = {};
  for (const f of fields) {
    const raw = f === "stops" ? (values as any).stops : (values as any)[f];
    const msg = validateVRField(f, raw, values);
    if (msg) errors[f] = msg;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/** Sanitize an entire form before submission. */
export function sanitizeVehicleRequestForm(values: VRFormValues): VRFormValues {
  return {
    ...values,
    departure_place: sanitizeShortText(values.departure_place),
    destination: sanitizeShortText(values.destination),
    purpose: sanitizeText(values.purpose),
    project_number: sanitizeProjectNumber(values.project_number),
    contact_phone: sanitizePhone(values.contact_phone),
    vehicle_type: sanitizeText(values.vehicle_type),
    trip_type: sanitizeText(values.trip_type),
    pool_category: sanitizeText(values.pool_category),
    pool_name: sanitizeText(values.pool_name),
    priority: sanitizeText(values.priority),
  };
}

/**
 * Hardened Zod schema — final server-bound guard. Run this on the sanitized
 * form right before the network insert. Any failure short-circuits the
 * mutation with a descriptive error, so we can never POST a payload that
 * skipped the per-field UI validators (e.g. via programmatic form mutation).
 */
export const vehicleRequestZodSchema = z.object({
  request_type: z.enum([
    "incident_urgent",
    "daily_operation",
    "nighttime_operation",
    "project_operation",
    "field_operation",
    "group_operation",
    "messenger_service",
  ]),
  purpose: z
    .string()
    .trim()
    .min(10, "Trip description must be at least 10 characters.")
    .max(1000, "Trip description must be 1000 characters or fewer."),
  purpose_category: z
    .string()
    .trim()
    .min(1, "Business purpose category is required."),
  project_number: z
    .string()
    .trim()
    .max(30, "Project number must be 30 characters or fewer.")
    .optional()
    .or(z.literal("")),
  contact_phone: z
    .string()
    .trim()
    .min(1, "Contact phone is required so dispatch can reach you during the trip.")
    .max(20, "Phone number must be 20 characters or fewer."),
  departure_place: z.string().trim().max(200).optional().or(z.literal("")),
  destination: z.string().trim().max(200).optional().or(z.literal("")),
  num_vehicles: z.coerce.number().int().min(1).max(50),
  passengers: z.coerce.number().int().refine((n) => n === -1 || (n >= 1 && n <= 100), {
    message: "Passengers must be between 1 and 100, or -1 for non-passenger vehicles.",
  }),
  vehicle_type: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal("")),
  trip_type: z
    .enum(["one_way", "round_trip"])
    .optional()
    .or(z.literal("")),
  pool_category: z
    .enum(["corporate", "zone", "region"])
    .optional()
    .or(z.literal("")),
  priority: z
    .enum(["low", "normal", "high", "urgent"])
    .optional()
    .or(z.literal("")),
  cargo_load: z.enum(["none", "small", "medium", "large"]).optional(),
  cargo_weight_kg: z
    .union([z.coerce.number().min(0).max(50000), z.literal(""), z.null()])
    .optional(),
  vehicle_type_justification: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("")),
});

export type VehicleRequestPayload = z.infer<typeof vehicleRequestZodSchema>;
