/**
 * maintenanceRequestValidation
 * ----------------------------
 * Per-field + whole-form validation and sanitization for the Create Work
 * Request (maintenance) dialog. Mirrors the Vehicle Request and Fuel Request
 * standards exactly:
 *
 *   • Trim + strip control chars from free-text
 *   • Normalize Ethiopian phone numbers (+251 / 0 prefixes)
 *   • Numeric guards with clear, actionable messages
 *   • Conditional rules per context (trip_inspection / safety_comfort /
 *     vehicle_maintenance) and per work_request_type
 */
import { z } from "zod";
import {
  sanitizeText,
  sanitizeShortText,
  sanitizePhone,
  sanitizeEmail,
  sanitizeNumeric,
  isEthiopianPhone,
} from "@/components/fuel/fuelRequestValidation";

export {
  sanitizeText,
  sanitizeShortText,
  sanitizePhone,
  sanitizeEmail,
  sanitizeNumeric,
  isEthiopianPhone,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ─── field set ────────────────────────────────────────────────────────────

export type MRContextValue =
  | "Veh. Trip Inspection request"
  | "Vehicle Maintenance request"
  | "V Safety & Comfort Request"
  | "Generator Maintenance request"
  | "Equipment Maintenance request";

export type MRFieldName =
  | "asset_number"
  | "assigned_dept"
  | "request_start_date"
  | "completion_date"
  | "work_request_type"
  | "priority"
  | "context_value"
  | "additional_description"
  | "phone_number"
  | "email"
  | "requestor_department"
  | "requestor_pool"
  | "requestor_employee_id"
  | "driver_type"
  | "driver_name"
  | "driver_phone"
  | "maintenance_type_req"
  | "inspection_sub_type"
  | "km_reading"
  | "fuel_level"
  | "requested_quantity"
  | "remark";

export interface MRFormValues {
  asset_number?: string;
  assigned_dept?: string;
  request_start_date?: string; // ISO
  completion_date?: string; // ISO
  work_request_type?: string;
  priority?: string;
  context_value?: MRContextValue | string;
  additional_description?: string;
  phone_number?: string;
  email?: string;
  requestor_department?: string;
  requestor_pool?: string;
  requestor_employee_id?: string;
  driver_type?: string;
  driver_name?: string;
  driver_phone?: string;
  maintenance_type_req?: string;
  inspection_sub_type?: string;
  km_reading?: string;
  fuel_level?: string;
  requested_quantity?: string;
  remark?: string;
}

const isTripInspectionCtx = (ctx: Partial<MRFormValues>) =>
  ctx.context_value === "Veh. Trip Inspection request";
const isSafetyComfortCtx = (ctx: Partial<MRFormValues>) =>
  ctx.context_value === "V Safety & Comfort Request";

// ─── helpers ──────────────────────────────────────────────────────────────

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
  if (n < 0) return `${label} cannot be negative.`;
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

// ─── per-field validators ─────────────────────────────────────────────────

export function validateMRField(
  field: MRFieldName,
  value: unknown,
  ctx: Partial<MRFormValues> = {},
): string | undefined {
  const trip = isTripInspectionCtx(ctx);
  const safety = isSafetyComfortCtx(ctx);

  switch (field) {
    case "asset_number":
      return requireString(value, "Asset Number");

    case "assigned_dept":
      return requireString(value, "Assigned Department");

    case "request_start_date":
      return requireString(value, "Request By Start Date");

    case "completion_date": {
      const s = sanitizeText(value);
      if (!s) return undefined; // optional
      const start = sanitizeText(ctx.request_start_date);
      if (start) {
        const startMs = new Date(start).getTime();
        const endMs = new Date(s).getTime();
        if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs <= startMs)
          return "Completion date must be after the start date.";
      }
      return undefined;
    }

    case "priority":
      return requireString(value, "Priority");

    case "context_value":
      return requireString(value, "Context Value");

    case "work_request_type":
      return requireString(value, "Work Request Type");

    case "additional_description": {
      const msg = requireString(value, "Additional Description");
      if (msg) return msg;
      const s = sanitizeText(value);
      if (s.length < 5)
        return "Additional Description is too short — please describe the issue (min 5 chars).";
      if (s.length > 2000) return "Additional Description is too long (max 2000 characters).";
      return undefined;
    }

    case "phone_number": {
      const sanitized = sanitizePhone(value);
      if (!sanitized) return undefined;
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

    case "requestor_department":
      if (!trip && !safety) return requireString(value, "Requestor Department");
      return undefined;

    case "requestor_pool":
      if (trip || safety) return requireString(value, "Requestor Pool");
      return undefined;

    case "requestor_employee_id": {
      const s = sanitizeText(value);
      if (!s) return undefined;
      if (s.length > 30) return "Employee ID is too long (max 30 characters).";
      return undefined;
    }

    case "driver_type":
      if (trip || safety) return requireString(value, "Driver type");
      return undefined;

    case "driver_name": {
      const s = sanitizeText(value);
      if (s && s.length > 120) return "Driver Name is too long (max 120 characters).";
      return undefined;
    }

    case "driver_phone": {
      const sanitized = sanitizePhone(value);
      if (!sanitized)
        return "Driver Phone No. is required so the dispatcher can reach the driver.";
      if (!isEthiopianPhone(sanitized))
        return "Enter a valid Ethiopian phone number — e.g. 0911234567 or +251911234567.";
      return undefined;
    }

    case "maintenance_type_req":
      if (safety) return requireString(value, "Type of Request");
      if (!trip) return requireString(value, "Type of maintenance request");
      return undefined;

    case "inspection_sub_type":
      if (trip || ctx.work_request_type === "inspection")
        return requireString(value, "Type of Request (sub-type)");
      return undefined;

    case "km_reading":
      return requirePositiveNumber(value, "KM reading", {
        min: 0,
        max: 9_999_999,
        integer: true,
      });

    case "fuel_level":
      if (!trip && !safety)
        return requirePositiveNumber(value, "Fuel level in the tank", {
          min: 0,
          max: 100,
        });
      return undefined;

    case "requested_quantity":
      return optionalNumber(value, "Requested Quantity", { min: 0, max: 1_000_000 });

    case "remark": {
      const s = sanitizeText(value);
      if (s.length > 1000) return "Remark is too long (max 1000 characters).";
      return undefined;
    }

    default:
      return undefined;
  }
}

// ─── whole-form validation (submit) ───────────────────────────────────────

export function validateMaintenanceRequestForm(values: MRFormValues): {
  ok: boolean;
  errors: Partial<Record<MRFieldName, string>>;
  sanitized: MRFormValues;
} {
  const sanitized: MRFormValues = {
    ...values,
    asset_number: sanitizeShortText(values.asset_number),
    assigned_dept: sanitizeShortText(values.assigned_dept),
    additional_description: sanitizeText(values.additional_description),
    phone_number: sanitizePhone(values.phone_number),
    email: sanitizeEmail(values.email),
    requestor_department: sanitizeShortText(values.requestor_department),
    requestor_pool: sanitizeShortText(values.requestor_pool),
    requestor_employee_id: sanitizeShortText(values.requestor_employee_id),
    driver_name: sanitizeShortText(values.driver_name),
    driver_phone: sanitizePhone(values.driver_phone),
    remark: sanitizeText(values.remark),
  };

  const fields: MRFieldName[] = [
    "asset_number",
    "assigned_dept",
    "request_start_date",
    "completion_date",
    "work_request_type",
    "priority",
    "context_value",
    "additional_description",
    "phone_number",
    "email",
    "requestor_department",
    "requestor_pool",
    "requestor_employee_id",
    "driver_type",
    "driver_name",
    "driver_phone",
    "maintenance_type_req",
    "inspection_sub_type",
    "km_reading",
    "fuel_level",
    "requested_quantity",
    "remark",
  ];

  const errors: Partial<Record<MRFieldName, string>> = {};
  for (const f of fields) {
    const msg = validateMRField(f, (sanitized as any)[f], sanitized);
    if (msg) errors[f] = msg;
  }
  return { ok: Object.keys(errors).length === 0, errors, sanitized };
}

// ─── zod schema (server/parsing-style usage) ──────────────────────────────

export const maintenanceRequestSchema = z.object({
  asset_number: z.string().trim().min(1),
  assigned_dept: z.string().trim().min(1),
  additional_description: z.string().trim().min(5).max(2000),
  priority: z.string().min(1),
  work_request_type: z.string().min(1),
  km_reading: z.coerce.number().min(0).max(9_999_999),
  driver_phone: z.string().trim().min(1),
});
