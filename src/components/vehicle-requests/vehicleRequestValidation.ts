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

/** Phone normalizer: keep digits, +, spaces, dashes, parentheses. */
export const sanitizePhone = (v: unknown): string =>
  sanitizeText(v).replace(/[^\d+\s\-()]/g, "");

/** Project number normalizer: uppercase, allow letters/digits/dash/underscore. */
export const sanitizeProjectNumber = (v: unknown): string =>
  sanitizeText(v).toUpperCase().replace(/[^A-Z0-9_\-/]/g, "");

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/;
const PROJECT_RE = /^[A-Z0-9][A-Z0-9_\-/]{2,29}$/;

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
  | "project_number"
  | "priority"
  | "contact_phone";

export interface VRFormValues {
  request_type: string;
  date?: Date | string | null;
  start_time?: string;
  end_time?: string;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  departure_place?: string;
  destination?: string;
  num_vehicles?: string | number;
  passengers?: string | number;
  vehicle_type?: string;
  trip_type?: string;
  pool_category?: string;
  pool_name?: string;
  purpose?: string;
  project_number?: string;
  priority?: string;
  contact_phone?: string;
  /** Drives passenger+cargo fitness check on vehicle_type. */
  cargo_load?: CargoLoad;
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
  // Nighttime is a single-day variant of Daily (uses `date` + start/end times)
  // but locked to a 02:00–12:00 window to match the night-shift policy.
  const isDaily = ctx.request_type === "daily_operation" || isNighttime;
  const NIGHT_WINDOW = { start: "02:00", end: "12:00" };

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
      if (isNighttime && (v < NIGHT_WINDOW.start || v >= NIGHT_WINDOW.end)) {
        return `Nighttime operations must start between ${NIGHT_WINDOW.start} and ${NIGHT_WINDOW.end}.`;
      }
      // If the trip date is today, reject times already in the past on the
      // requester's machine clock — we cannot schedule a trip for a moment
      // that has already passed.
      const tripDate = toDate(ctx.date);
      if (tripDate) {
        const today = startOfToday();
        const sameDay = tripDate.getFullYear() === today.getFullYear()
          && tripDate.getMonth() === today.getMonth()
          && tripDate.getDate() === today.getDate();
        if (sameDay) {
          const now = new Date();
          const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          if (v < nowHHMM)
            return `Start time (${v}) is already in the past — current time is ${nowHHMM}. Pick a future time or change the date.`;
        }
      }
      return;
    }

    case "end_time": {
      if (!isDaily) return;
      const v = sanitizeText(value);
      if (!v) return "End time is required.";
      if (!HHMM_RE.test(v)) return "End time must use 24-hour HH:MM format (e.g. 17:00).";
      if (isNighttime && (v <= NIGHT_WINDOW.start || v > NIGHT_WINDOW.end)) {
        return `Nighttime operations must end by ${NIGHT_WINDOW.end} (and after ${NIGHT_WINDOW.start}).`;
      }
      const start = sanitizeText(ctx.start_time);
      if (start && HHMM_RE.test(start) && v <= start)
        return `End time (${v}) must be later than start time (${start}). A trip needs at least 1 minute.`;
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
      if (v && v.length < 2) return "Departure place is too short. Enter at least 2 characters or pick a saved location.";
      if (v.length > 200) return "Departure place is too long (max 200 characters).";
      return;
    }

    case "destination": {
      const v = sanitizeShortText(value);
      if (v && v.length < 2) return "Destination is too short. Enter at least 2 characters or pick a saved location.";
      if (v.length > 200) return "Destination is too long (max 200 characters).";
      return;
    }

    case "num_vehicles": {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 1)
        return "Enter the number of vehicles needed (minimum 1).";
      if (!Number.isInteger(n))
        return "Number of vehicles must be a whole number (e.g. 1, 2, 3).";
      const max = isProject ? 50 : 1;
      if (n > max)
        return isProject
          ? "Maximum 50 vehicles per request. Split into multiple requests if you need more."
          : "Daily and Field operations are limited to 1 vehicle. Switch to Project Operation to request more.";
      return;
    }

    case "passengers": {
      const n = Number(value);
      // -1 is the sentinel for "not applicable" (cargo / courier vehicles).
      if (n === -1) return;
      if (!Number.isFinite(n) || n < 1)
        return "Enter at least 1 passenger (the driver counts only if traveling).";
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
      return;
    }

    case "trip_type": {
      const v = sanitizeText(value);
      if (v && !["one_way", "round_trip"].includes(v))
        return "Trip type must be either 'One Way' or 'Round Trip'.";
      return;
    }

    case "pool_category": {
      const v = sanitizeText(value);
      if (v && !["corporate", "zone", "region"].includes(v))
        return "Invalid pool category. Choose Corporate, Zone, or Region.";
      return;
    }

    case "pool_name": {
      const v = sanitizeText(value);
      if (v && !ctx.pool_category)
        return "Choose a pool category first, then select the specific pool.";
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
      if (v && !["low", "normal", "high", "urgent"].includes(v))
        return "Priority must be Low, Normal, High, or Urgent.";
      return;
    }

    case "contact_phone": {
      const raw = sanitizeText(value);
      if (!raw) return "Contact phone is required so dispatch can reach you during the trip.";
      const v = sanitizePhone(value);
      // User typed something but only invalid characters remained after sanitizing.
      if (!v)
        return "Phone number contains invalid characters. Use digits, spaces, dashes, parentheses, and an optional leading + (e.g. +251 911 234 567).";
      // Detect characters the user typed that are not allowed in a phone.
      if (raw.replace(/[^\d+\s\-()]/g, "").length !== raw.length)
        return "Phone number contains invalid characters. Only digits, spaces, dashes, parentheses, and a leading + are allowed.";
      if (!PHONE_RE.test(v))
        return "Phone number looks invalid. Use international format with 7–20 digits (e.g. +251 911 234 567).";
      const digitsOnly = v.replace(/\D/g, "");
      if (digitsOnly.length < 7)
        return `Phone number is too short (${digitsOnly.length} digits). It must contain at least 7 digits.`;
      if (digitsOnly.length > 15)
        return `Phone number is too long (${digitsOnly.length} digits). Maximum is 15 digits per ITU E.164.`;
      // Reject a leading + followed by no digits, or multiple + signs.
      if ((v.match(/\+/g) || []).length > 1)
        return "Phone number can only contain one leading + sign.";
      if (v.includes("+") && !v.startsWith("+"))
        return "The + sign must appear only at the start of the phone number.";
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
    "purpose",
    "project_number",
    "priority",
    "contact_phone",
  ];
  const errors: Partial<Record<VRFieldName, string>> = {};
  for (const f of fields) {
    const msg = validateVRField(f, (values as any)[f], values);
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
    "daily_operation",
    "nighttime_operation",
    "project_operation",
    "field_operation",
    "group_operation",
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
  vehicle_type_justification: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("")),
});

export type VehicleRequestPayload = z.infer<typeof vehicleRequestZodSchema>;
