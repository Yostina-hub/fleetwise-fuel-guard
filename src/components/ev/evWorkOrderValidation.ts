/**
 * EV Work Order — validation schema & sanitizers
 * ----------------------------------------------
 * Targeted validation for the mandatory header fields plus EV-specific
 * safety/business rules (SoC bounds, energy/cost sanity, released-status
 * gates). The form has ~50 fields across an Accordion; only required-by-
 * business and safety-critical numerics are gated here.
 */
import { z } from "zod";

export const EV_WO_ASSET_GROUPS = ["vehicle", "battery", "charger"] as const;
export const EV_WO_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const EV_WO_STATUSES = [
  "draft",
  "released",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
] as const;
export const EV_WO_TYPES = [
  "charging",
  "battery_service",
  "maintenance",
  "inspection",
  "diagnostic",
] as const;
export const EV_CHARGING_TYPES = ["level1", "level2", "ac", "dc_fast"] as const;

export const evWorkOrderSchema = z
  .object({
    work_order_number: z
      .string({ required_error: "Work order number is required" })
      .trim()
      .min(3, "Work order number must be at least 3 characters")
      .max(60, "Work order number must be under 60 characters"),
    vehicle_id: z
      .string({ required_error: "EV vehicle is required" })
      .trim()
      .min(1, "EV vehicle is required"),
    asset_number: z
      .string()
      .trim()
      .max(60, "Asset number must be under 60 characters")
      .optional()
      .or(z.literal("")),
    asset_group: z.enum(EV_WO_ASSET_GROUPS, {
      errorMap: () => ({ message: "Asset group is required" }),
    }),
    wip_accounting_class: z
      .string({ required_error: "WIP accounting class is required" })
      .trim()
      .min(1, "WIP accounting class is required")
      .max(60, "WIP accounting class must be under 60 characters"),
    scheduled_start_date: z.string().trim().optional().or(z.literal("")),
    scheduled_completion_date: z.string().trim().optional().or(z.literal("")),
    duration: z
      .number({ invalid_type_error: "Duration must be a number" })
      .min(0, "Duration cannot be negative")
      .max(10_000, "Duration is unrealistically high"),
    priority: z.enum(EV_WO_PRIORITIES, {
      errorMap: () => ({ message: "Priority is required" }),
    }),
    wo_status: z.enum(EV_WO_STATUSES, {
      errorMap: () => ({ message: "Status is required" }),
    }),
    work_order_type: z.enum(EV_WO_TYPES, {
      errorMap: () => ({ message: "Work order type is required" }),
    }),
    charging_type: z.enum(EV_CHARGING_TYPES, {
      errorMap: () => ({ message: "Charging type is required" }),
    }),
    current_soc_percent: z
      .number({ invalid_type_error: "Current SoC must be a number" })
      .min(0, "Current SoC cannot be negative")
      .max(100, "Current SoC cannot exceed 100%"),
    target_soc_percent: z
      .number({ invalid_type_error: "Target SoC must be a number" })
      .min(0, "Target SoC cannot be negative")
      .max(100, "Target SoC cannot exceed 100%"),
    energy_required_kwh: z
      .number({ invalid_type_error: "Energy required must be a number" })
      .min(0, "Energy required cannot be negative")
      .max(1000, "Energy required is unrealistically high"),
    energy_delivered_kwh: z
      .number({ invalid_type_error: "Energy delivered must be a number" })
      .min(0, "Energy delivered cannot be negative")
      .max(1000, "Energy delivered is unrealistically high"),
    cost_per_kwh: z
      .number({ invalid_type_error: "Cost per kWh must be a number" })
      .min(0, "Cost per kWh cannot be negative")
      .max(100_000, "Cost per kWh is unrealistically high"),
    estimated_cost: z
      .number({ invalid_type_error: "Estimated cost must be a number" })
      .min(0, "Estimated cost cannot be negative")
      .max(10_000_000, "Estimated cost is unrealistically high"),
    actual_cost: z
      .number({ invalid_type_error: "Actual cost must be a number" })
      .min(0, "Actual cost cannot be negative")
      .max(10_000_000, "Actual cost is unrealistically high"),
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
    // Asset number is mandatory for vehicle / battery groups.
    if (
      (data.asset_group === "vehicle" || data.asset_group === "battery") &&
      !data.asset_number?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["asset_number"],
        message: "Asset number is required for vehicle and battery work orders",
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
    // Charging WOs: target SoC must exceed current SoC.
    if (
      data.work_order_type === "charging" &&
      data.target_soc_percent <= data.current_soc_percent
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["target_soc_percent"],
        message: "Target SoC must be greater than current SoC for charging",
      });
    }
    // Completed WOs should record energy delivered.
    if (data.wo_status === "completed" && data.energy_delivered_kwh <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["energy_delivered_kwh"],
        message: "Record delivered energy before marking completed",
      });
    }
  });

export type EVWorkOrderValues = z.infer<typeof evWorkOrderSchema>;
export type EVWorkOrderFieldKey = keyof EVWorkOrderValues;

export const buildEVWorkOrderPayload = (
  values: Partial<EVWorkOrderValues>,
) => ({
  work_order_number: values.work_order_number ?? "",
  vehicle_id: values.vehicle_id ?? "",
  asset_number: values.asset_number ?? "",
  asset_group: (values.asset_group ?? "vehicle") as EVWorkOrderValues["asset_group"],
  wip_accounting_class: values.wip_accounting_class ?? "",
  scheduled_start_date: values.scheduled_start_date ?? "",
  scheduled_completion_date: values.scheduled_completion_date ?? "",
  duration: typeof values.duration === "number" ? values.duration : 0,
  priority: (values.priority ?? "medium") as EVWorkOrderValues["priority"],
  wo_status: (values.wo_status ?? "draft") as EVWorkOrderValues["wo_status"],
  work_order_type: (values.work_order_type ?? "charging") as EVWorkOrderValues["work_order_type"],
  charging_type: (values.charging_type ?? "ac") as EVWorkOrderValues["charging_type"],
  current_soc_percent:
    typeof values.current_soc_percent === "number" ? values.current_soc_percent : 0,
  target_soc_percent:
    typeof values.target_soc_percent === "number" ? values.target_soc_percent : 100,
  energy_required_kwh:
    typeof values.energy_required_kwh === "number" ? values.energy_required_kwh : 0,
  energy_delivered_kwh:
    typeof values.energy_delivered_kwh === "number" ? values.energy_delivered_kwh : 0,
  cost_per_kwh: typeof values.cost_per_kwh === "number" ? values.cost_per_kwh : 0,
  estimated_cost:
    typeof values.estimated_cost === "number" ? values.estimated_cost : 0,
  actual_cost: typeof values.actual_cost === "number" ? values.actual_cost : 0,
});

export const validateEVWorkOrderField = (
  field: EVWorkOrderFieldKey,
  values: Partial<EVWorkOrderValues>,
): string | undefined => {
  const result = evWorkOrderSchema.safeParse(buildEVWorkOrderPayload(values));
  if (result.success) return undefined;
  const issue = result.error.issues.find((i) => i.path[0] === field);
  return issue?.message;
};

export const sanitizeDecimal = (v: unknown): string =>
  String(v ?? "").replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
