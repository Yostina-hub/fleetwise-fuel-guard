/**
 * Fuel Work Order — validation schema & sanitizers
 * ------------------------------------------------
 * Targeted validation for the mandatory header fields of the Fuel WO form.
 * The form has ~50 fields across an Accordion; only the required-by-business
 * fields and a handful of safety-critical numerics are gated here.
 */
import { z } from "zod";

export const FUEL_WO_ASSET_GROUPS = ["vehicle", "generator", "equipment"] as const;
export const FUEL_WO_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const FUEL_WO_STATUSES = [
  "draft",
  "released",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export const fuelWorkOrderSchema = z
  .object({
    work_order_number: z
      .string({ required_error: "Work order number is required" })
      .trim()
      .min(3, "Work order number must be at least 3 characters")
      .max(60, "Work order number must be under 60 characters"),
    asset_number: z
      .string()
      .trim()
      .max(60, "Asset number must be under 60 characters")
      .optional()
      .or(z.literal("")),
    asset_group: z.enum(FUEL_WO_ASSET_GROUPS, {
      errorMap: () => ({ message: "Asset group is required" }),
    }),
    wip_accounting_class: z
      .string({ required_error: "WIP accounting class is required" })
      .trim()
      .min(1, "WIP accounting class is required")
      .max(60, "WIP accounting class must be under 60 characters"),
    asset_activity: z
      .string({ required_error: "Asset activity is required" })
      .trim()
      .min(2, "Asset activity must be at least 2 characters")
      .max(120, "Asset activity must be under 120 characters"),
    scheduled_start_date: z.string().trim().optional().or(z.literal("")),
    scheduled_completion_date: z.string().trim().optional().or(z.literal("")),
    duration: z
      .number({ invalid_type_error: "Duration must be a number" })
      .min(0, "Duration cannot be negative")
      .max(10_000, "Duration is unrealistically high"),
    priority: z.enum(FUEL_WO_PRIORITIES, {
      errorMap: () => ({ message: "Priority is required" }),
    }),
    wo_status: z.enum(FUEL_WO_STATUSES, {
      errorMap: () => ({ message: "Status is required" }),
    }),
    emoney_amount: z
      .number({ invalid_type_error: "E-money amount must be a number" })
      .min(0, "E-money amount cannot be negative")
      .max(10_000_000, "E-money amount is unrealistically high"),
  })
  .superRefine((data, ctx) => {
    // Completion must be after start (when both provided).
    if (
      data.scheduled_start_date &&
      data.scheduled_completion_date &&
      new Date(data.scheduled_completion_date).getTime() <
        new Date(data.scheduled_start_date).getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduled_completion_date"],
        message: "Completion must be after the scheduled start",
      });
    }
    // Asset number is mandatory for vehicle / generator groups.
    if (
      (data.asset_group === "vehicle" || data.asset_group === "generator") &&
      !data.asset_number?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["asset_number"],
        message: "Asset number is required for vehicle and generator work orders",
      });
    }
    // Released WOs must have a planned start date.
    if (data.wo_status === "released" && !data.scheduled_start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduled_start_date"],
        message: "Set a scheduled start date before releasing",
      });
    }
  });

export type FuelWorkOrderValues = z.infer<typeof fuelWorkOrderSchema>;
export type FuelWorkOrderFieldKey = keyof FuelWorkOrderValues;

export const buildFuelWorkOrderPayload = (
  values: Partial<FuelWorkOrderValues>,
) => ({
  work_order_number: values.work_order_number ?? "",
  asset_number: values.asset_number ?? "",
  asset_group: (values.asset_group ?? "vehicle") as FuelWorkOrderValues["asset_group"],
  wip_accounting_class: values.wip_accounting_class ?? "",
  asset_activity: values.asset_activity ?? "",
  scheduled_start_date: values.scheduled_start_date ?? "",
  scheduled_completion_date: values.scheduled_completion_date ?? "",
  duration: typeof values.duration === "number" ? values.duration : 0,
  priority: (values.priority ?? "medium") as FuelWorkOrderValues["priority"],
  wo_status: (values.wo_status ?? "draft") as FuelWorkOrderValues["wo_status"],
  emoney_amount:
    typeof values.emoney_amount === "number" ? values.emoney_amount : 0,
});

export const validateFuelWorkOrderField = (
  field: FuelWorkOrderFieldKey,
  values: Partial<FuelWorkOrderValues>,
): string | undefined => {
  const result = fuelWorkOrderSchema.safeParse(buildFuelWorkOrderPayload(values));
  if (result.success) return undefined;
  const issue = result.error.issues.find((i) => i.path[0] === field);
  return issue?.message;
};

export const sanitizeDecimal = (v: unknown): string =>
  String(v ?? "").replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
