// ============================================================================
// Standard Safety & Comfort Lists
// ----------------------------------------------------------------------------
// Source: Fleet Safety & Comfort master spreadsheet (3 vehicle groups).
// Each group represents a vehicle class with its mandated checklist of:
//   - Fleet safety material
//   - Vehicle helping tools
//   - Vehicle accessories
//   - Vehicle comfort materials
// Used by SafetyComfortReportDialog and inspection workflows.
// ============================================================================

export type ChecklistCategory =
  | "fleet_safety_material"
  | "vehicle_helping_tools"
  | "vehicle_accessories"
  | "vehicle_comfort_materials";

export const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  fleet_safety_material: "Fleet Safety Material",
  vehicle_helping_tools: "Vehicle Helping Tools",
  vehicle_accessories: "Vehicle Accessories",
  vehicle_comfort_materials: "Vehicle Comfort Materials",
};

export interface ChecklistItem {
  key: string;
  label: string;
  category: ChecklistCategory;
  /** Items considered safety-critical (auto-escalate severity if missing/broken). */
  critical?: boolean;
}

/** Standardized usability period & remarks per item key (per spreadsheet §2.1). */
export interface ItemStandard {
  /** Required quantity per vehicle. Most items are "Per Standard". */
  requiredQty: string;
  /** Recommended usability period before mandatory check / replacement. */
  usabilityPeriod: string;
  /** Standard remark / replacement policy. */
  remark: string;
}

export const ITEM_STANDARDS: Record<string, ItemStandard> = {
  // --- Fleet Safety Material ---
  fire_extinguisher:       { requiredQty: "Per Standard", usabilityPeriod: "It will be checked and corrected per year",
                             remark: "It can be replaced up on request and based on inspection result" },
  fire_extinguisher_1kg:   { requiredQty: "Per Standard", usabilityPeriod: "It will be checked and corrected per year",
                             remark: "It can be replaced up on request and based on inspection result" },
  first_aid_kit:           { requiredQty: "Per Standard", usabilityPeriod: "It will be checked and corrected per year",
                             remark: "It can be replaced up on request and based on inspection result" },
  triangular_reflector:    { requiredQty: "Per Standard", usabilityPeriod: "At least 2 years",
                             remark: "It can be replaced up on request and based on inspection result" },
  canvas_for_tent:         { requiredQty: "Per Standard", usabilityPeriod: "At least six months",
                             remark: "It will be changed as per inspection result" },
  tire_safety_lock_cable:  { requiredQty: "Per Standard", usabilityPeriod: "At least six months",
                             remark: "It will be checked and corrected or replaced as per inspection result" },
  light_visible_vest:      { requiredQty: "Per Standard", usabilityPeriod: "At least 1 year",
                             remark: "For Heavy Vehicles Drivers" },
  nylon_rope_ramp_belt:    { requiredQty: "Per Standard", usabilityPeriod: "At least six months",
                             remark: "It will be changed as per inspection result" },
  steel_cable_with_clamp:  { requiredQty: "Per Standard", usabilityPeriod: "At least six months",
                             remark: "It will be changed as per inspection result" },
  winch_for_steel_cable:   { requiredQty: "Per Standard", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "It can be replaced up on request and based on inspection result" },
  pole_carrier:            { requiredQty: "Per Standard", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "It can be replaced up on request and based on inspection result" },
  seat_belt:               { requiredQty: "Per Standard", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "It will be changed as per inspection result" },
  reflector_sticker:       { requiredQty: "Per Standard", usabilityPeriod: "At least 1 year",
                             remark: "It can be replaced up on request and based on inspection result" },

  // --- Vehicle Helping Tools ---
  car_jack_3ton:           { requiredQty: "1", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "It can be repair or replace up on request and inspection result" },
  car_jack:                { requiredQty: "1", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "It can be repair or replace up on request and inspection result" },
  tire_wrench:             { requiredQty: "Per Standard", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "It can be replaced up on request and based on inspection result" },
  lever_long:              { requiredQty: "Per Standard", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "It can be replaced up on request and based on inspection result" },
  combination_wrench_set:  { requiredQty: "Per Standard", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "It can be replaced up on request and based on inspection result" },
  screwdriver_set:         { requiredQty: "Per Standard", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "It can be replaced up on request and based on inspection result" },
  conventional_pliers:     { requiredQty: "Per Standard", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "It can be replaced up on request and based on inspection result" },

  // --- Vehicle Accessories ---
  spare_tire:              { requiredQty: "1", usabilityPeriod: "As per tire wear standard",
                             remark: "Replaced based on tread depth & inspection result" },
  cd_player:               { requiredQty: "1", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "Repair or replace based on inspection result" },
  jumper_battery_cable:    { requiredQty: "1", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "Replaced on inspection result" },
  tow_strap:               { requiredQty: "1", usabilityPeriod: "At least 2 years",
                             remark: "Replaced on inspection result" },
  water_tanker:            { requiredQty: "Per Standard", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "Replaced on inspection result" },
  central_lock_alarm:      { requiredQty: "Per Standard", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "Repair or replace based on inspection result" },
  dash_board_cream:        { requiredQty: "Per Standard", usabilityPeriod: "Per consumption",
                             remark: "Refilled per consumption schedule" },
  leather_sheet_cleaning:  { requiredQty: "Per Standard", usabilityPeriod: "Per consumption",
                             remark: "Refilled per consumption schedule" },
  perfume:                 { requiredQty: "Per Standard", usabilityPeriod: "Per consumption",
                             remark: "Refilled per consumption schedule" },

  // --- Vehicle Comfort Materials ---
  floor_mat_ready:         { requiredQty: "Per Standard", usabilityPeriod: "At least 1 year",
                             remark: "Replaced on inspection result" },
  floor_mat_prepared:      { requiredQty: "Per Standard", usabilityPeriod: "At least 1 year",
                             remark: "Replaced on inspection result" },
  heat_protector:          { requiredQty: "Per Standard", usabilityPeriod: "At least 2 years",
                             remark: "Replaced on inspection result" },
  seat_cover_ready:        { requiredQty: "Per Standard", usabilityPeriod: "At least 2 years",
                             remark: "Replaced on inspection result" },
  seat_cover_prepared:     { requiredQty: "Per Standard", usabilityPeriod: "At least 2 years",
                             remark: "Replaced on inspection result" },
  steering_wheel_cover:    { requiredQty: "1",            usabilityPeriod: "At least 1 year",
                             remark: "Replaced on inspection result" },
  sun_visor:               { requiredQty: "Per Standard", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "Repair or replace based on inspection result" },
  wind_protector:          { requiredQty: "Per Standard", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "Repair or replace based on inspection result" },
  door_buffer:             { requiredQty: "Per Standard", usabilityPeriod: "Throughout lifetime of the vehicles",
                             remark: "Replaced on inspection result" },
  curtain:                 { requiredQty: "Per Standard", usabilityPeriod: "At least 2 years",
                             remark: "Replaced on inspection result" },
  dash_board_cover:        { requiredQty: "Per Standard", usabilityPeriod: "At least 2 years",
                             remark: "Replaced on inspection result" },
};

/** Get standard for an item; falls back to "Per Standard" defaults if unknown. */
export function getItemStandard(key: string): ItemStandard {
  return ITEM_STANDARDS[key] || {
    requiredQty: "Per Standard",
    usabilityPeriod: "Throughout lifetime of the vehicles",
    remark: "It can be replaced up on request and based on inspection result",
  };
}

export interface VehicleGroupStandard {
  id: "group_one" | "group_two" | "group_three";
  label: string;
  description: string;
  items: ChecklistItem[];
}

// ---------------------------------------------------------------------------
// Group One — Standard light/utility vehicles
// ---------------------------------------------------------------------------
const GROUP_ONE: VehicleGroupStandard = {
  id: "group_one",
  label: "Group 1 — Standard Vehicles",
  description: "Light vehicles, sedans, station wagons, and small utilities.",
  items: [
    { key: "fire_extinguisher",        label: "Fire Extinguisher",                    category: "fleet_safety_material",     critical: true },
    { key: "first_aid_kit",            label: "First Aid Kit",                        category: "fleet_safety_material",     critical: true },
    { key: "triangular_reflector",     label: "Triangular Reflector",                 category: "fleet_safety_material",     critical: true },
    { key: "seat_belt",                label: "Safety Belt for Passenger and Driver", category: "fleet_safety_material",     critical: true },
    { key: "tire_safety_lock_cable",   label: "Tire Safety Lock Cable",               category: "fleet_safety_material" },
    { key: "reflector_sticker",        label: "Reflector Sticker",                    category: "fleet_safety_material" },

    { key: "car_jack_3ton",            label: "Car Jack (3 Ton)",                     category: "vehicle_helping_tools",     critical: true },
    { key: "tire_wrench",              label: "Tire Wrench",                          category: "vehicle_helping_tools" },
    { key: "combination_wrench_set",   label: "10/12/14 mm Combination Wrench",       category: "vehicle_helping_tools" },
    { key: "screwdriver_set",          label: "All-in-One Philips & Flat Screwdriver",category: "vehicle_helping_tools" },
    { key: "conventional_pliers",      label: "Conventional Pliers",                  category: "vehicle_helping_tools" },

    { key: "spare_tire",               label: "Spare Tire",                           category: "vehicle_accessories",       critical: true },
    { key: "cd_player",                label: "CD Player",                            category: "vehicle_accessories" },
    { key: "jumper_battery_cable",     label: "Jumper Battery with Cable",            category: "vehicle_accessories" },
    { key: "tow_strap",                label: "Tow Strap",                            category: "vehicle_accessories" },

    { key: "floor_mat_ready",          label: "Floor Mat (Ready Made)",               category: "vehicle_comfort_materials" },
    { key: "floor_mat_prepared",       label: "Floor Mat (Prepared)",                 category: "vehicle_comfort_materials" },
    { key: "heat_protector",           label: "Heat Protector",                       category: "vehicle_comfort_materials" },
    { key: "seat_cover_ready",         label: "Seat Cover (Ready Made)",              category: "vehicle_comfort_materials" },
    { key: "seat_cover_prepared",      label: "Seat Cover (Prepared)",                category: "vehicle_comfort_materials" },
    { key: "steering_wheel_cover",     label: "Steering Wheel Cover",                 category: "vehicle_comfort_materials" },
    { key: "sun_visor",                label: "Sun Visor",                            category: "vehicle_comfort_materials" },
    { key: "wind_protector",           label: "Wind Protector",                       category: "vehicle_comfort_materials" },
    { key: "door_buffer",              label: "Door Buffer",                          category: "vehicle_comfort_materials" },
    { key: "curtain",                  label: "Curtain",                              category: "vehicle_comfort_materials" },
    { key: "dash_board_cover",         label: "Dash Board Cover",                     category: "vehicle_comfort_materials" },
  ],
};

// ---------------------------------------------------------------------------
// Group Two — Heavy / Field operation vehicles (trucks, 4x4, field crew)
// ---------------------------------------------------------------------------
const GROUP_TWO: VehicleGroupStandard = {
  id: "group_two",
  label: "Group 2 — Heavy / Field Vehicles",
  description: "Trucks, 4x4s, crew vehicles requiring extended recovery & safety kit.",
  items: [
    { key: "fire_extinguisher",        label: "Fire Extinguisher",                    category: "fleet_safety_material",     critical: true },
    { key: "first_aid_kit",            label: "First Aid Kit",                        category: "fleet_safety_material",     critical: true },
    { key: "triangular_reflector",     label: "Triangular Reflector",                 category: "fleet_safety_material",     critical: true },
    { key: "canvas_for_tent",          label: "Canvas for Tent",                      category: "fleet_safety_material" },
    { key: "tire_safety_lock_cable",   label: "Tire Safety Lock Cable",               category: "fleet_safety_material" },
    { key: "light_visible_vest",       label: "Light Visible Vest",                   category: "fleet_safety_material",     critical: true },
    { key: "nylon_rope_ramp_belt",     label: "Nylon Rope and Ramp Belt",             category: "fleet_safety_material" },
    { key: "steel_cable_with_clamp",   label: "Steel Cable with Clamp",               category: "fleet_safety_material" },
    { key: "winch_for_steel_cable",    label: "Winch for Steel Cable",                category: "fleet_safety_material" },
    { key: "pole_carrier",             label: "Pole Carrier (Front and Rear)",        category: "fleet_safety_material" },
    { key: "reflector_sticker",        label: "Reflector Sticker",                    category: "fleet_safety_material" },

    { key: "car_jack",                 label: "Car Jack",                             category: "vehicle_helping_tools",     critical: true },
    { key: "tire_wrench",              label: "Tire Wrench",                          category: "vehicle_helping_tools" },
    { key: "lever_long",               label: "Lever (Long)",                         category: "vehicle_helping_tools" },
    { key: "combination_wrench_set",   label: "10/12/14 mm Combination Wrench",       category: "vehicle_helping_tools" },
    { key: "screwdriver_set",          label: "All-in-One Philips & Flat Screwdriver",category: "vehicle_helping_tools" },
    { key: "conventional_pliers",      label: "Conventional Pliers",                  category: "vehicle_helping_tools" },

    { key: "spare_tire",               label: "Spare Tire",                           category: "vehicle_accessories",       critical: true },
    { key: "cd_player",                label: "CD Player",                            category: "vehicle_accessories" },
    { key: "water_tanker",             label: "Water Tanker",                         category: "vehicle_accessories" },

    { key: "seat_cover_ready",         label: "Seat Cover (Ready Made)",              category: "vehicle_comfort_materials" },
    { key: "seat_cover_prepared",      label: "Seat Cover (Prepared)",                category: "vehicle_comfort_materials" },
    { key: "heat_protector",           label: "Heat Protector",                       category: "vehicle_comfort_materials" },
    { key: "floor_mat_prepared",       label: "Floor Mat (Prepared)",                 category: "vehicle_comfort_materials" },
    { key: "floor_mat_ready",          label: "Floor Mat (Ready Made)",               category: "vehicle_comfort_materials" },
    { key: "sun_visor",                label: "Sun Visor",                            category: "vehicle_comfort_materials" },
    { key: "steering_wheel_cover",     label: "Steering Wheel Cover",                 category: "vehicle_comfort_materials" },
    { key: "curtain",                  label: "Curtain",                              category: "vehicle_comfort_materials" },
    { key: "dash_board_cover",         label: "Dash Board Cover",                     category: "vehicle_comfort_materials" },
  ],
};

// ---------------------------------------------------------------------------
// Group Three — Executive / Premium vehicles (extended comfort spec)
// ---------------------------------------------------------------------------
const GROUP_THREE: VehicleGroupStandard = {
  id: "group_three",
  label: "Group 3 — Executive / Premium Vehicles",
  description: "Executive vehicles with extended comfort & security specifications.",
  items: [
    { key: "fire_extinguisher_1kg",    label: "Fire Extinguisher (1 Kg)",             category: "fleet_safety_material",     critical: true },
    { key: "first_aid_kit",            label: "First Aid Kit",                        category: "fleet_safety_material",     critical: true },
    { key: "triangular_reflector",     label: "Triangular Reflector",                 category: "fleet_safety_material",     critical: true },
    { key: "seat_belt",                label: "Safety Belt for Passenger and Driver", category: "fleet_safety_material",     critical: true },
    { key: "tire_safety_lock_cable",   label: "Tire Safety Lock Cable",               category: "fleet_safety_material" },
    { key: "reflector_sticker",        label: "Reflector Sticker",                    category: "fleet_safety_material" },

    { key: "car_jack_3ton",            label: "Car Jack (3 Ton)",                     category: "vehicle_helping_tools",     critical: true },
    { key: "tire_wrench",              label: "Tire Wrench",                          category: "vehicle_helping_tools" },
    { key: "combination_wrench_set",   label: "10/12/14 mm Combination Wrench",       category: "vehicle_helping_tools" },
    { key: "screwdriver_set",          label: "All-in-One Philips & Flat Screwdriver",category: "vehicle_helping_tools" },
    { key: "conventional_pliers",      label: "Conventional Pliers",                  category: "vehicle_helping_tools" },

    { key: "spare_tire",               label: "Spare Tire",                           category: "vehicle_accessories",       critical: true },
    { key: "central_lock_alarm",       label: "Central Lock and Alarm",               category: "vehicle_accessories",       critical: true },
    { key: "cd_player",                label: "CD Player",                            category: "vehicle_accessories" },
    { key: "jumper_battery_cable",     label: "Jumper Battery with Cable",            category: "vehicle_accessories" },
    { key: "dash_board_cream",         label: "Dash Board Cream",                     category: "vehicle_accessories" },
    { key: "leather_sheet_cleaning",   label: "Leather Sheet for Cleaning",           category: "vehicle_accessories" },
    { key: "perfume",                  label: "Perfume",                              category: "vehicle_accessories" },

    { key: "floor_mat_ready",          label: "Floor Mat (Ready Made)",               category: "vehicle_comfort_materials" },
    { key: "heat_protector",           label: "Heat Protector",                       category: "vehicle_comfort_materials" },
    { key: "seat_cover_ready",         label: "Seat Cover (Ready Made)",              category: "vehicle_comfort_materials" },
    { key: "steering_wheel_cover",     label: "Steering Wheel Cover",                 category: "vehicle_comfort_materials" },
    { key: "floor_mat_prepared",       label: "Floor Mat (Prepared)",                 category: "vehicle_comfort_materials" },
    { key: "seat_cover_prepared",      label: "Seat Cover (Prepared)",                category: "vehicle_comfort_materials" },
    { key: "sun_visor",                label: "Sun Visor",                            category: "vehicle_comfort_materials" },
    { key: "wind_protector",           label: "Wind Protector",                       category: "vehicle_comfort_materials" },
    { key: "door_buffer",              label: "Door Buffer",                          category: "vehicle_comfort_materials" },
    { key: "dash_board_cover",         label: "Dash Board Cover",                     category: "vehicle_comfort_materials" },
  ],
};

export const VEHICLE_GROUPS: VehicleGroupStandard[] = [GROUP_ONE, GROUP_TWO, GROUP_THREE];

export const VEHICLE_GROUPS_MAP: Record<string, VehicleGroupStandard> = {
  group_one: GROUP_ONE,
  group_two: GROUP_TWO,
  group_three: GROUP_THREE,
};

/** Item status when reporting/inspecting. */
export type ItemStatus = "ok" | "missing" | "damaged" | "expired" | "needs_replacement";

export const ITEM_STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: "ok",                 label: "OK / Available" },
  { value: "missing",            label: "Missing" },
  { value: "damaged",            label: "Damaged" },
  { value: "expired",            label: "Expired" },
  { value: "needs_replacement",  label: "Needs Replacement" },
];

/** Group items by category for tabbed/sectioned UI rendering. */
export function groupItemsByCategory(group: VehicleGroupStandard) {
  const out: Record<ChecklistCategory, ChecklistItem[]> = {
    fleet_safety_material: [],
    vehicle_helping_tools: [],
    vehicle_accessories: [],
    vehicle_comfort_materials: [],
  };
  for (const item of group.items) out[item.category].push(item);
  return out;
}
