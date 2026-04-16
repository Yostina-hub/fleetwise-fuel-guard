import { z } from "zod";

export const ASSET_TYPES = ["Capital", "Expense", "Group"] as const;
export const CRITICALITIES = ["low", "medium", "high", "critical"] as const;
export const ASSET_STATUSES = [
  "CREATED",
  "ACTIVE",
  "IN_SERVICE",
  "OUT_OF_SERVICE",
  "UNDER_MAINTENANCE",
  "RETIRED",
] as const;
export const FUEL_TYPES = ["diesel", "petrol", "gas", "biofuel"] as const;
export const HAZARD_CLASSES = ["none", "flammable", "noise", "high_voltage", "chemical"] as const;
export const PPE_OPTIONS = ["helmet", "gloves", "ear_protection", "eye_protection", "boots", "high_vis"] as const;

const optionalText = z
  .string()
  .trim()
  .max(255, { message: "Must be less than 255 characters" })
  .optional()
  .or(z.literal("").transform(() => undefined));

export const generatorSchema = z.object({
  // Identity
  asset_number: z
    .string()
    .trim()
    .max(64, { message: "Asset number must be less than 64 characters" })
    .optional()
    .or(z.literal("").transform(() => undefined)),
  name: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(120, { message: "Name must be less than 120 characters" }),
  asset_group: optionalText,
  asset_serial_number: z
    .string()
    .trim()
    .min(1, { message: "Serial number is required" })
    .max(120, { message: "Serial number must be less than 120 characters" }),
  asset_category: optionalText,
  asset_type: z.enum(ASSET_TYPES),
  parent_asset_id: z.string().uuid().nullable().optional(),

  // Main
  owning_department: optionalText,
  criticality: z.enum(CRITICALITIES),
  wip_accounting_class: optionalText,
  asset_status: z.enum(ASSET_STATUSES),
  is_maintainable: z.boolean(),
  is_gis_asset: z.boolean(),
  operation_log_enabled: z.boolean(),
  status: z.enum(["active", "inactive", "maintenance"]).default("active"),
  warranty_expiration: z.string().optional().or(z.literal("").transform(() => undefined)),
  checked_out: z.boolean(),

  // Specs
  model: optionalText,
  fuel_type: z.enum(FUEL_TYPES),
  tank_capacity_liters: z
    .number()
    .min(0, { message: "Must be ≥ 0" })
    .max(1_000_000, { message: "Unrealistically large" })
    .optional()
    .nullable(),
  current_fuel_level_percent: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .nullable(),

  // Location
  area: optionalText,
  location: optionalText,
  address: optionalText,
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),

  // Safety
  hazard_class: z.enum(HAZARD_CLASSES).optional().nullable(),
  safety_notes: z
    .string()
    .trim()
    .max(2000, { message: "Must be less than 2000 characters" })
    .optional()
    .or(z.literal("").transform(() => undefined)),
  lockout_tagout_required: z.boolean(),
  ppe_required: z.array(z.enum(PPE_OPTIONS)).default([]),
  inspection_frequency_days: z
    .number()
    .int()
    .min(0)
    .max(3650)
    .optional()
    .nullable(),

  // Others
  manufacturer: optionalText,
  manufacture_date: z.string().optional().or(z.literal("").transform(() => undefined)),
  commission_date: z.string().optional().or(z.literal("").transform(() => undefined)),
  purchase_cost: z.number().min(0).max(1_000_000_000).optional().nullable(),
  supplier: optionalText,
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type GeneratorFormValues = z.infer<typeof generatorSchema>;

export const defaultGeneratorValues: GeneratorFormValues = {
  asset_number: undefined,
  name: "",
  asset_group: undefined,
  asset_serial_number: "",
  asset_category: undefined,
  asset_type: "Capital",
  parent_asset_id: null,
  owning_department: undefined,
  criticality: "medium",
  wip_accounting_class: undefined,
  asset_status: "CREATED",
  is_maintainable: true,
  is_gis_asset: false,
  operation_log_enabled: false,
  status: "active",
  warranty_expiration: undefined,
  checked_out: false,
  model: undefined,
  fuel_type: "diesel",
  tank_capacity_liters: null,
  current_fuel_level_percent: null,
  area: undefined,
  location: undefined,
  address: undefined,
  latitude: null,
  longitude: null,
  hazard_class: null,
  safety_notes: undefined,
  lockout_tagout_required: false,
  ppe_required: [],
  inspection_frequency_days: null,
  manufacturer: undefined,
  manufacture_date: undefined,
  commission_date: undefined,
  purchase_cost: null,
  supplier: undefined,
  notes: undefined,
};
