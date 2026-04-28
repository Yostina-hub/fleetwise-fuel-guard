/**
 * Vehicle Inspection — validation schema & sanitizers
 * --------------------------------------------------
 * Mirrors the pattern established by Vehicle / Fuel / Maintenance / Roadside
 * request forms (Zod schema + `validateField` helper + sanitizers).
 */
import { z } from "zod";

export const INSPECTION_TYPES = [
  "pre_trip",
  "post_trip",
  "daily",
  "weekly",
  "monthly",
  "annual",
] as const;

export const inspectionSchema = z
  .object({
    vehicle_id: z
      .string({ required_error: "Vehicle is required" })
      .trim()
      .min(1, "Vehicle is required")
      .uuid("Invalid vehicle"),
    driver_id: z
      .string()
      .trim()
      .uuid("Invalid inspector")
      .optional()
      .or(z.literal("")),
    inspection_type: z.enum(INSPECTION_TYPES, {
      errorMap: () => ({ message: "Inspection type is required" }),
    }),
    odometer_km: z
      .number({ invalid_type_error: "Odometer must be a number" })
      .int("Odometer must be a whole number")
      .min(0, "Odometer cannot be negative")
      .max(9_999_999, "Odometer is unrealistically high")
      .optional(),
    defects_text: z
      .string()
      .trim()
      .max(1000, "Defects description must be under 1000 characters")
      .optional()
      .or(z.literal("")),
    mechanic_notes: z
      .string()
      .trim()
      .max(1000, "Notes must be under 1000 characters")
      .optional()
      .or(z.literal("")),
    certified_safe: z.boolean(),
    has_failures: z.boolean(),
  })
  .superRefine((data, ctx) => {
    // If the inspector left checklist failures, they MUST describe them or
    // un-check the safety certification — block "clean" submissions on a dirty
    // checklist with no certification toggle.
    if (data.has_failures && data.certified_safe && !data.defects_text?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["defects_text"],
        message:
          "Describe the failed items or uncheck the safety certification",
      });
    }
  });

export type InspectionFormValues = z.infer<typeof inspectionSchema>;
export type InspectionFieldKey = keyof Omit<InspectionFormValues, "has_failures">;

/** Field-level validator that returns the first error string (or undefined). */
export const validateInspectionField = (
  field: InspectionFieldKey,
  values: Partial<InspectionFormValues> & { has_failures?: boolean },
): string | undefined => {
  const result = inspectionSchema.safeParse({
    vehicle_id: values.vehicle_id ?? "",
    driver_id: values.driver_id ?? "",
    inspection_type: values.inspection_type ?? "pre_trip",
    odometer_km: values.odometer_km,
    defects_text: values.defects_text ?? "",
    mechanic_notes: values.mechanic_notes ?? "",
    certified_safe: values.certified_safe ?? true,
    has_failures: values.has_failures ?? false,
  });
  if (result.success) return undefined;
  const issue = result.error.issues.find((i) => i.path[0] === field);
  return issue?.message;
};

/** Strip everything that isn't a digit — used by the odometer input. */
export const sanitizeNumeric = (v: unknown): string =>
  String(v ?? "").replace(/[^\d]/g, "");
