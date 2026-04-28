/**
 * Tire Request — validation schema, sanitizers, and field-level helpers.
 * Mirrors fuel/maintenance/roadside/inspection patterns.
 */
import { z } from "zod";

export const FUEL_LEVELS = ["empty", "quarter", "half", "three_quarter", "full"] as const;
export const REQUEST_TYPES = ["replacement", "rotation", "repair", "new_install"] as const;
export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const DRIVER_TYPES = ["company", "contract", "outsourced", "self"] as const;
export const POSITIONS = [
  "Front Left", "Front Right",
  "Rear Left Outer", "Rear Left Inner",
  "Rear Right Outer", "Rear Right Inner",
  "Spare",
] as const;

export const tireLineItemSchema = z.object({
  position: z.string().trim().min(1, "Position is required"),
  tire_size: z.string().trim().max(50).optional().or(z.literal("")),
  preferred_brand: z.string().trim().max(80).optional().or(z.literal("")),
  preferred_model: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const tireRequestSchema = z
  .object({
    vehicle_id: z.string().trim().min(1, "Asset (vehicle) is required").uuid("Invalid vehicle"),
    assigned_department_id: z.string().trim().min(1, "Assigned department is required").uuid("Invalid department"),
    requestor_department_id: z.string().trim().min(1, "Requestor department is required").uuid("Invalid department"),
    request_type: z.enum(REQUEST_TYPES),
    priority: z.enum(PRIORITIES),
    request_by_start_date: z.string().trim().min(1, "Start date is required"),
    request_by_completion_date: z.string().trim().min(1, "Completion date is required"),
    additional_description: z.string().trim().min(5, "Provide at least 5 characters").max(2000),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
    reason: z.string().trim().max(300).optional().or(z.literal("")),
    estimated_cost: z
      .string()
      .trim()
      .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 10_000_000), {
        message: "Enter a positive cost (max 10,000,000 ETB)",
      })
      .optional()
      .or(z.literal("")),
    km_reading: z
      .string()
      .trim()
      .min(1, "KM reading is required")
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 9_999_999, {
        message: "Enter a valid odometer (0–9,999,999)",
      }),
    driver_type: z.enum(DRIVER_TYPES, { errorMap: () => ({ message: "Driver type is required" }) }),
    driver_name: z.string().trim().max(120).optional().or(z.literal("")),
    driver_phone: z
      .string()
      .trim()
      .min(1, "Driver phone is required")
      .regex(/^(\+251|0)?9\d{8}$/, "Use Ethiopian format (e.g. 0912345678 or +251912345678)"),
    fuel_level_in_tank: z.enum(FUEL_LEVELS, { errorMap: () => ({ message: "Fuel level is required" }) }),
    contact_phone: z
      .string()
      .trim()
      .refine((v) => v === "" || /^(\+251|0)?9\d{8}$/.test(v), "Use Ethiopian format")
      .optional()
      .or(z.literal("")),
    contact_email: z
      .string()
      .trim()
      .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email")
      .optional()
      .or(z.literal("")),
    contact_preference: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.request_by_start_date && data.request_by_completion_date) {
      const start = new Date(data.request_by_start_date).getTime();
      const end = new Date(data.request_by_completion_date).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["request_by_completion_date"],
          message: "Completion date must be after the start date",
        });
      }
    }
  });

export type TireRequestFormValues = z.infer<typeof tireRequestSchema>;
export type TireRequestFieldKey = keyof TireRequestFormValues;

/** Sanitizers — keep input strict before it ever reaches the schema. */
export const sanitizeNumeric = (v: unknown) => String(v ?? "").replace(/[^\d]/g, "");
export const sanitizeDecimal = (v: unknown) => {
  const s = String(v ?? "").replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  return dot === -1 ? s : s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
};
export const sanitizePhone = (v: unknown) => {
  const raw = String(v ?? "").trim();
  const plus = raw.startsWith("+") ? "+" : "";
  return plus + raw.replace(/[^\d]/g, "");
};

export const validateTireField = (
  field: TireRequestFieldKey,
  values: Partial<TireRequestFormValues>,
): string | undefined => {
  const result = tireRequestSchema.safeParse({
    vehicle_id: values.vehicle_id ?? "",
    assigned_department_id: values.assigned_department_id ?? "",
    requestor_department_id: values.requestor_department_id ?? "",
    request_type: values.request_type ?? "replacement",
    priority: values.priority ?? "normal",
    request_by_start_date: values.request_by_start_date ?? "",
    request_by_completion_date: values.request_by_completion_date ?? "",
    additional_description: values.additional_description ?? "",
    notes: values.notes ?? "",
    reason: values.reason ?? "",
    estimated_cost: values.estimated_cost ?? "",
    km_reading: values.km_reading ?? "",
    driver_type: (values.driver_type as any) ?? undefined,
    driver_name: values.driver_name ?? "",
    driver_phone: values.driver_phone ?? "",
    fuel_level_in_tank: (values.fuel_level_in_tank as any) ?? undefined,
    contact_phone: values.contact_phone ?? "",
    contact_email: values.contact_email ?? "",
    contact_preference: values.contact_preference ?? "",
  });
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path[0] === field)?.message;
};
