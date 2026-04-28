/**
 * Schedule Maintenance — validation schema & sanitizers
 * -----------------------------------------------------
 * Mirrors the pattern established by Vehicle / Fuel / Maintenance / Roadside /
 * Inspection / Tire request forms (Zod schema + `validateField` helper +
 * sanitizers).
 */
import { z } from "zod";

export const INTERVAL_TYPES = ["mileage", "hours", "calendar"] as const;
export const PRIORITIES = ["low", "medium", "high"] as const;

export const scheduleMaintenanceSchema = z
  .object({
    vehicle_id: z
      .string({ required_error: "Vehicle is required" })
      .trim()
      .min(1, "Vehicle is required")
      .uuid("Invalid vehicle"),
    service_type: z
      .string({ required_error: "Service type is required" })
      .trim()
      .min(2, "Service type must be at least 2 characters")
      .max(120, "Service type must be under 120 characters"),
    interval_type: z.enum(INTERVAL_TYPES, {
      errorMap: () => ({ message: "Interval type is required" }),
    }),
    interval_value: z
      .number({ invalid_type_error: "Interval must be a number" })
      .int("Interval must be a whole number")
      .min(1, "Interval must be at least 1")
      .max(1_000_000, "Interval is unrealistically high"),
    priority: z.enum(PRIORITIES, {
      errorMap: () => ({ message: "Priority is required" }),
    }),
    reminder_days_before: z
      .number({ invalid_type_error: "Reminder must be a number" })
      .int("Reminder must be a whole number")
      .min(0, "Reminder cannot be negative")
      .max(365, "Reminder cannot exceed 365 days"),
    reminder_km_before: z
      .number({ invalid_type_error: "Reminder must be a number" })
      .int("Reminder must be a whole number")
      .min(0, "Reminder cannot be negative")
      .max(100_000, "Reminder cannot exceed 100,000 km"),
  })
  .superRefine((data, ctx) => {
    // Reminder threshold cannot exceed the interval itself.
    if (
      data.interval_type === "mileage" &&
      data.reminder_km_before >= data.interval_value
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reminder_km_before"],
        message: "Reminder must be smaller than the mileage interval",
      });
    }
    if (
      data.interval_type === "calendar" &&
      data.reminder_days_before >= data.interval_value
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reminder_days_before"],
        message: "Reminder must be smaller than the calendar interval",
      });
    }
  });

export type ScheduleMaintenanceValues = z.infer<typeof scheduleMaintenanceSchema>;
export type ScheduleMaintenanceFieldKey = keyof ScheduleMaintenanceValues;

const buildPayload = (values: Partial<ScheduleMaintenanceValues>) => ({
  vehicle_id: values.vehicle_id ?? "",
  service_type: values.service_type ?? "",
  interval_type: (values.interval_type ?? "mileage") as ScheduleMaintenanceValues["interval_type"],
  interval_value: values.interval_value ?? 0,
  priority: (values.priority ?? "medium") as ScheduleMaintenanceValues["priority"],
  reminder_days_before: values.reminder_days_before ?? 0,
  reminder_km_before: values.reminder_km_before ?? 0,
});

/** Field-level validator that returns the first error string (or undefined). */
export const validateScheduleMaintenanceField = (
  field: ScheduleMaintenanceFieldKey,
  values: Partial<ScheduleMaintenanceValues>,
): string | undefined => {
  const result = scheduleMaintenanceSchema.safeParse(buildPayload(values));
  if (result.success) return undefined;
  const issue = result.error.issues.find((i) => i.path[0] === field);
  return issue?.message;
};

export const scheduleMaintenancePayload = buildPayload;

/** Strip everything that isn't a digit. */
export const sanitizeNumeric = (v: unknown): string =>
  String(v ?? "").replace(/[^\d]/g, "");
