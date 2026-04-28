/**
 * roadsideRequestValidation
 * -------------------------
 * Per-field + whole-form validation and sanitization for the
 * NewRoadsideRequestDialog. Mirrors the Vehicle / Fuel / Maintenance Request
 * standard:
 *
 *   • Trim + strip control chars from free-text
 *   • Normalize Ethiopian phone numbers
 *   • Numeric guards with clear, actionable messages
 *   • Coordinate bounds (lat -90..90, lng -180..180) to satisfy the map
 *     data-integrity contract.
 */
import { z } from "zod";
import {
  sanitizeText,
  sanitizeShortText,
  sanitizePhone,
  sanitizeNumeric,
  isEthiopianPhone,
} from "@/components/fuel/fuelRequestValidation";

export {
  sanitizeText,
  sanitizeShortText,
  sanitizePhone,
  sanitizeNumeric,
  isEthiopianPhone,
};

export type RSFieldName =
  | "vehicle_id"
  | "driver_id"
  | "breakdown_type"
  | "priority"
  | "description"
  | "location_name"
  | "lat"
  | "lng"
  | "service_provider"
  | "provider_phone"
  | "eta_minutes"
  | "estimated_cost";

export interface RSFormValues {
  vehicle_id?: string;
  driver_id?: string;
  breakdown_type?: string;
  priority?: string;
  description?: string;
  location_name?: string;
  lat?: string;
  lng?: string;
  service_provider?: string;
  provider_phone?: string;
  eta_minutes?: string;
  estimated_cost?: string;
}

const requireString = (v: unknown, label: string): string | undefined => {
  const s = sanitizeText(v);
  if (!s) return `${label} is required. Please select or fill it in.`;
  return undefined;
};

const optionalNumber = (
  v: unknown,
  label: string,
  opts?: { min?: number; max?: number; integer?: boolean },
): string | undefined => {
  const s = sanitizeText(v);
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n)) return `${label} must be a number.`;
  if (opts?.integer && !Number.isInteger(n))
    return `${label} must be a whole number — no decimals.`;
  if (opts?.min !== undefined && n < opts.min)
    return `${label} must be at least ${opts.min}.`;
  if (opts?.max !== undefined && n > opts.max)
    return `${label} cannot exceed ${opts.max}.`;
  return undefined;
};

export function validateRSField(
  field: RSFieldName,
  value: unknown,
  ctx: Partial<RSFormValues> = {},
): string | undefined {
  switch (field) {
    case "vehicle_id":
      return requireString(value, "Vehicle");

    case "driver_id":
      return undefined; // optional

    case "breakdown_type":
      return requireString(value, "Breakdown Type");

    case "priority":
      return requireString(value, "Priority");

    case "description": {
      const s = sanitizeText(value);
      if (s.length > 2000) return "Description is too long (max 2000 characters).";
      return undefined;
    }

    case "location_name": {
      const s = sanitizeText(value);
      if (s.length > 200) return "Location is too long (max 200 characters).";
      return undefined;
    }

    case "lat": {
      const s = sanitizeText(value);
      const lngStr = sanitizeText(ctx.lng);
      if (!s && !lngStr) return undefined; // both empty is fine
      if (!s) return "Latitude is required when longitude is provided.";
      const n = Number(s);
      if (!Number.isFinite(n)) return "Latitude must be a number (e.g. 9.0157).";
      if (n < -90 || n > 90) return "Latitude must be between -90 and 90.";
      return undefined;
    }

    case "lng": {
      const s = sanitizeText(value);
      const latStr = sanitizeText(ctx.lat);
      if (!s && !latStr) return undefined;
      if (!s) return "Longitude is required when latitude is provided.";
      const n = Number(s);
      if (!Number.isFinite(n)) return "Longitude must be a number (e.g. 38.7468).";
      if (n < -180 || n > 180) return "Longitude must be between -180 and 180.";
      return undefined;
    }

    case "service_provider": {
      const s = sanitizeText(value);
      if (s.length > 120) return "Provider name is too long (max 120 characters).";
      return undefined;
    }

    case "provider_phone": {
      const sanitized = sanitizePhone(value);
      if (!sanitized) return undefined;
      if (!isEthiopianPhone(sanitized))
        return "Enter a valid Ethiopian phone number — e.g. 0911234567 or +251911234567.";
      return undefined;
    }

    case "eta_minutes":
      return optionalNumber(value, "ETA (minutes)", { min: 0, max: 1440, integer: true });

    case "estimated_cost":
      return optionalNumber(value, "Estimated cost", { min: 0, max: 10_000_000 });

    default:
      return undefined;
  }
}

export function validateRoadsideRequestForm(values: RSFormValues): {
  ok: boolean;
  errors: Partial<Record<RSFieldName, string>>;
  sanitized: RSFormValues;
} {
  const sanitized: RSFormValues = {
    ...values,
    description: sanitizeText(values.description),
    location_name: sanitizeShortText(values.location_name),
    service_provider: sanitizeShortText(values.service_provider),
    provider_phone: sanitizePhone(values.provider_phone),
  };

  const fields: RSFieldName[] = [
    "vehicle_id",
    "driver_id",
    "breakdown_type",
    "priority",
    "description",
    "location_name",
    "lat",
    "lng",
    "service_provider",
    "provider_phone",
    "eta_minutes",
    "estimated_cost",
  ];

  const errors: Partial<Record<RSFieldName, string>> = {};
  for (const f of fields) {
    const msg = validateRSField(f, (sanitized as any)[f], sanitized);
    if (msg) errors[f] = msg;
  }
  return { ok: Object.keys(errors).length === 0, errors, sanitized };
}

export const roadsideRequestSchema = z.object({
  vehicle_id: z.string().trim().min(1),
  breakdown_type: z.string().min(1),
  priority: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});
