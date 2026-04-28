/**
 * fuelRequestValidation
 * ---------------------
 * Per-field + whole-form validation and sanitization for the Fuel Request
 * dialog. Mirrors the Vehicle Request standard:
 *
 *   • Trim + strip control chars from free-text
 *   • Normalize Ethiopian phone numbers (+251 / 0 prefixes)
 *   • Numeric guards with clear, actionable messages
 *   • Conditional rules per request_type ("vehicle" vs "generator")
 *
 * Every error message states what is wrong, why, and what to fix.
 */
import { z } from "zod";

// ─── sanitizers ───────────────────────────────────────────────────────────

export const sanitizeText = (v: unknown): string => {
  if (v == null) return "";
  return String(v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
};

export const sanitizeShortText = (v: unknown): string =>
  sanitizeText(v).replace(/\s+/g, " ");

export const sanitizePhone = (v: unknown): string => {
  const s = sanitizeText(v);
  if (!s) return "";
  const hasPlus = s.trim().startsWith("+");
  const digits = s.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
};

export const sanitizeEmail = (v: unknown): string =>
  sanitizeText(v).toLowerCase().replace(/\s+/g, "");

export const sanitizeNumeric = (v: unknown, opts?: { integer?: boolean }): string => {
  const s = sanitizeText(v);
  if (!s) return "";
  const allow = opts?.integer ? /[^\d]/g : /[^\d.]/g;
  let cleaned = s.replace(allow, "");
  if (!opts?.integer) {
    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) {
      cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
    }
  }
  return cleaned;
};

export const sanitizeProjectNumber = (v: unknown): string =>
  sanitizeText(v).toUpperCase().replace(/[^A-Z0-9_\-/]/g, "").slice(0, 30);

const ETHIOPIAN_MOBILE_LOCAL_RE = /^09\d{8}$/;
const ETHIOPIAN_MOBILE_INTL_RE = /^\+2519\d{8}$/;
const ETHIOPIAN_LANDLINE_LOCAL_RE = /^0[1-8]\d{8}$/;
const ETHIOPIAN_LANDLINE_INTL_RE = /^\+251[1-8]\d{8}$/;

export function isEthiopianPhone(v: string): boolean {
  return (
    ETHIOPIAN_MOBILE_LOCAL_RE.test(v) ||
    ETHIOPIAN_MOBILE_INTL_RE.test(v) ||
    ETHIOPIAN_LANDLINE_LOCAL_RE.test(v) ||
    ETHIOPIAN_LANDLINE_INTL_RE.test(v)
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ─── field set ────────────────────────────────────────────────────────────

export type FRFieldName =
  | "request_type"
  | "vehicle_id"
  | "generator_id"
  | "driver_id"
  | "driver_type"
  | "driver_phone"
  | "phone_number"
  | "email"
  | "current_odometer"
  | "running_hours"
  | "liters_requested"
  | "estimated_cost"
  | "fuel_in_telebirr"
  | "fuel_by_cash_coupon"
  | "fuel_type"
  | "fuel_request_type"
  | "assigned_department"
  | "requestor_department"
  | "request_by_start_date"
  | "request_by_completion_date"
  | "priority"
  | "context_value"
  | "technician_name"
  | "project_number"
  | "purpose"
  | "remark"
  | "additional_description"
  | "notes";

export interface FRFormValues {
  request_type: string;
  vehicle_id?: string;
  generator_id?: string;
  driver_id?: string;
  driver_type?: string;
  driver_phone?: string;
  phone_number?: string;
  email?: string;
  current_odometer?: string;
  running_hours?: string;
  liters_requested?: string;
  estimated_cost?: string;
  fuel_in_telebirr?: string;
  fuel_by_cash_coupon?: string;
  fuel_type?: string;
  fuel_request_type?: string;
  assigned_department?: string;
  requestor_department?: string;
  request_by_start_date?: string;
  request_by_completion_date?: string;
  priority?: string;
  context_value?: string;
  technician_name?: string;
  project_number?: string;
  purpose?: string;
  remark?: string;
  additional_description?: string;
  notes?: string;
}

// ─── per-field validators ─────────────────────────────────────────────────

const requireString = (v: unknown, label: string): string | undefined => {
  const s = sanitizeText(v);
  if (!s) return `${label} is required. Please select or fill it in.`;
  return undefined;
};

const requirePositiveNumber = (
  v: unknown,
  label: string,
  opts?: { min?: number; max?: number; integer?: boolean },
): string | undefined => {
  const s = sanitizeText(v);
  if (!s) return `${label} is required. Please enter a value.`;
  const n = Number(s);
  if (!Number.isFinite(n)) return `${label} must be a number (e.g. 25 or 25.5).`;
  if (opts?.integer && !Number.isInteger(n))
    return `${label} must be a whole number — no decimals.`;
  if (n <= 0) return `${label} must be greater than zero.`;
  if (opts?.min !== undefined && n < opts.min)
    return `${label} must be at least ${opts.min}.`;
  if (opts?.max !== undefined && n > opts.max)
    return `${label} cannot exceed ${opts.max}.`;
  return undefined;
};

const optionalNumber = (
  v: unknown,
  label: string,
  opts?: { min?: number; max?: number },
): string | undefined => {
  const s = sanitizeText(v);
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n)) return `${label} must be a number.`;
  if (n < 0) return `${label} cannot be negative.`;
  if (opts?.min !== undefined && n < opts.min)
    return `${label} must be at least ${opts.min}.`;
  if (opts?.max !== undefined && n > opts.max)
    return `${label} cannot exceed ${opts.max}.`;
  return undefined;
};

export function validateFRField(
  field: FRFieldName,
  value: unknown,
  ctx: Partial<FRFormValues> = {},
): string | undefined {
  switch (field) {
    case "request_type":
      if (value !== "vehicle" && value !== "generator")
        return "Choose whether this fuel request is for a vehicle or a generator.";
      return undefined;

    case "vehicle_id":
      if (ctx.request_type === "vehicle") return requireString(value, "Vehicle");
      return undefined;

    case "generator_id":
      if (ctx.request_type === "generator") return requireString(value, "Generator");
      return undefined;

    case "driver_id":
      if (ctx.request_type === "vehicle") return requireString(value, "Driver");
      return undefined;

    case "driver_type":
      if (ctx.request_type === "vehicle") return requireString(value, "Driver type");
      return undefined;

    case "driver_phone":
    case "phone_number": {
      // driver_phone is required for vehicle requests; phone_number is optional
      const sanitized = sanitizePhone(value);
      const isRequired = field === "driver_phone" && ctx.request_type === "vehicle";
      if (!sanitized) {
        return isRequired
          ? "Driver phone is required so the dispatcher can reach the driver."
          : undefined;
      }
      if (!isEthiopianPhone(sanitized))
        return "Enter a valid Ethiopian phone number — e.g. 0911234567 or +251911234567.";
      return undefined;
    }

    case "email": {
      const s = sanitizeEmail(value);
      if (!s) return undefined;
      if (!EMAIL_RE.test(s))
        return "Enter a valid email address — e.g. name@example.com.";
      if (s.length > 254) return "Email is too long (max 254 characters).";
      return undefined;
    }

    case "current_odometer":
      if (ctx.request_type === "vehicle")
        return requirePositiveNumber(value, "Current odometer (km)", {
          min: 1,
          max: 9_999_999,
        });
      return undefined;

    case "running_hours":
      return optionalNumber(value, "Running hours", { min: 0, max: 1_000_000 });

    case "liters_requested":
      return requirePositiveNumber(value, "Liters requested", {
        min: 0.1,
        max: 100_000,
      });

    case "estimated_cost":
      return optionalNumber(value, "Estimated cost", { min: 0, max: 10_000_000 });

    case "fuel_in_telebirr":
      return optionalNumber(value, "Fuel in Telebirr", { min: 0, max: 10_000_000 });

    case "fuel_by_cash_coupon":
      return optionalNumber(value, "Fuel by cash/coupon", { min: 0, max: 10_000_000 });

    case "fuel_type":
      return requireString(value, "Fuel type");

    case "fuel_request_type":
      return requireString(value, "Fuel request type");

    case "assigned_department":
      return requireString(value, "Assigned department");

    case "requestor_department":
      return requireString(value, "Requestor department");

    case "priority":
      return requireString(value, "Priority");

    case "context_value":
      return requireString(value, "Context value");

    case "technician_name":
      if (ctx.request_type === "generator")
        return requireString(value, "Technician name");
      return undefined;

    case "request_by_start_date":
      return requireString(value, "Request start date");

    case "request_by_completion_date": {
      const msg = requireString(value, "Request completion date");
      if (msg) return msg;
      const start = sanitizeText(ctx.request_by_start_date);
      const end = sanitizeText(value);
      if (start && end) {
        const startMs = new Date(start).getTime();
        const endMs = new Date(end).getTime();
        if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs <= startMs)
          return "Completion date must be after the start date.";
      }
      return undefined;
    }

    case "project_number": {
      const s = sanitizeProjectNumber(value);
      if (!s) return undefined;
      if (!/^[A-Z0-9][A-Z0-9_\-/]{1,29}$/.test(s))
        return "Project number must be 2–30 chars: letters, digits, '-', '_' or '/'.";
      return undefined;
    }

    case "purpose":
    case "remark":
    case "additional_description":
    case "notes": {
      const s = sanitizeText(value);
      if (s.length > 1000)
        return "This field is too long (max 1000 characters).";
      return undefined;
    }

    default:
      return undefined;
  }
}

// ─── whole-form validation (submit) ───────────────────────────────────────

export function validateFuelRequestForm(values: FRFormValues): {
  ok: boolean;
  errors: Partial<Record<FRFieldName, string>>;
  sanitized: FRFormValues;
} {
  const sanitized: FRFormValues = {
    ...values,
    driver_phone: sanitizePhone(values.driver_phone),
    phone_number: sanitizePhone(values.phone_number),
    email: sanitizeEmail(values.email),
    project_number: sanitizeProjectNumber(values.project_number),
    purpose: sanitizeText(values.purpose),
    remark: sanitizeText(values.remark),
    additional_description: sanitizeText(values.additional_description),
    notes: sanitizeText(values.notes),
    technician_name: sanitizeShortText(values.technician_name),
  };

  const fields: FRFieldName[] = [
    "request_type",
    "vehicle_id",
    "generator_id",
    "driver_id",
    "driver_type",
    "driver_phone",
    "phone_number",
    "email",
    "current_odometer",
    "running_hours",
    "liters_requested",
    "estimated_cost",
    "fuel_in_telebirr",
    "fuel_by_cash_coupon",
    "fuel_type",
    "fuel_request_type",
    "assigned_department",
    "requestor_department",
    "priority",
    "context_value",
    "technician_name",
    "request_by_start_date",
    "request_by_completion_date",
    "project_number",
    "purpose",
    "remark",
    "additional_description",
    "notes",
  ];

  const errors: Partial<Record<FRFieldName, string>> = {};
  for (const f of fields) {
    const msg = validateFRField(f, (sanitized as any)[f], sanitized);
    if (msg) errors[f] = msg;
  }
  return { ok: Object.keys(errors).length === 0, errors, sanitized };
}

// ─── zod schema (server/parsing-style usage) ──────────────────────────────

export const fuelRequestSchema = z.object({
  request_type: z.enum(["vehicle", "generator"]),
  vehicle_id: z.string().optional(),
  generator_id: z.string().optional(),
  driver_id: z.string().optional(),
  liters_requested: z.coerce.number().positive(),
  fuel_type: z.string().min(1),
  priority: z.string().min(1),
});
