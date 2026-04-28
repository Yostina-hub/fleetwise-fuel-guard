/**
 * Schedule Inspection — validation schema & sanitizers
 * ----------------------------------------------------
 * Mirrors the Inspection / Tire / Schedule Maintenance pattern (Zod schema +
 * `validateField` helper). Date must be today or future; inspector + notes
 * are bounded; type is a strict enum.
 */
import { z } from "zod";

export const SCHEDULE_INSPECTION_TYPES = [
  "annual",
  "pre_trip",
  "post_trip",
  "internal",
  "roadworthiness",
  "routine",
] as const;

const todayISO = () => new Date().toISOString().slice(0, 10);

export const scheduleInspectionSchema = z
  .object({
    vehicle_id: z
      .string({ required_error: "Vehicle is required" })
      .trim()
      .min(1, "Vehicle is required")
      .uuid("Invalid vehicle"),
    inspection_type: z.enum(SCHEDULE_INSPECTION_TYPES, {
      errorMap: () => ({ message: "Inspection type is required" }),
    }),
    inspection_date: z
      .string({ required_error: "Date is required" })
      .trim()
      .min(1, "Date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    inspector: z
      .string()
      .trim()
      .max(120, "Inspector name must be under 120 characters")
      .optional()
      .or(z.literal("")),
    notes: z
      .string()
      .trim()
      .max(1000, "Notes must be under 1000 characters")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // Date must be today or in the future.
    if (data.inspection_date && data.inspection_date < todayISO()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inspection_date"],
        message: "Inspection date cannot be in the past",
      });
    }
  });

export type ScheduleInspectionValues = z.infer<typeof scheduleInspectionSchema>;
export type ScheduleInspectionFieldKey = keyof ScheduleInspectionValues;

const buildPayload = (values: Partial<ScheduleInspectionValues>) => ({
  vehicle_id: values.vehicle_id ?? "",
  inspection_type: (values.inspection_type ?? "annual") as ScheduleInspectionValues["inspection_type"],
  inspection_date: values.inspection_date ?? "",
  inspector: values.inspector ?? "",
  notes: values.notes ?? "",
});

export const validateScheduleInspectionField = (
  field: ScheduleInspectionFieldKey,
  values: Partial<ScheduleInspectionValues>,
): string | undefined => {
  const result = scheduleInspectionSchema.safeParse(buildPayload(values));
  if (result.success) return undefined;
  const issue = result.error.issues.find((i) => i.path[0] === field);
  return issue?.message;
};

export const scheduleInspectionPayload = buildPayload;
