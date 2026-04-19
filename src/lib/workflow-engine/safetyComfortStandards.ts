// Standard Safety & Comfort material lists per Vehicle Group.
// Source: paper SOP "Group of safety & comfort standard lists" (FMG-SAF 15).
// Each group has 4 sections; each section has its own item list. The checklist
// renderer uses these to build the form dynamically once the user picks a group.

export type SafetyComfortGroup = "group_1" | "group_2" | "group_3";

export interface ChecklistItem {
  name: string;
  /** Recommended usability period in months. null = lifetime of vehicle. */
  usabilityMonths: number | null;
  /** Human label for the recommended usability period (matches paper SOP). */
  usabilityLabel: string;
  /** Remark / replacement guidance from the SOP. */
  remark: string;
}

export interface ChecklistSection {
  id: string;
  label: string;
  items: ChecklistItem[];
}

export const SAFETY_COMFORT_GROUPS: { value: SafetyComfortGroup; label: string }[] = [
  { value: "group_1", label: "Group 1 (Standard)" },
  { value: "group_2", label: "Group 2 (Extended)" },
  { value: "group_3", label: "Group 3 (Premium)" },
];

// Common defaults pulled from the SOP table the user provided.
const REMARK_INSPECTION = "Can be replaced upon request and inspection result";
const REMARK_INSPECTION_CHANGE = "Will be changed upon inspection result";
const REMARK_HEAVY = "For Heavy Vehicles Drivers";
const REMARK_LIFETIME = "Can be repaired or replaced upon request and inspection result";

// Catalog of standard items keyed by item name. Used to build each group's list.
const ITEM_CATALOG: Record<string, Omit<ChecklistItem, "name">> = {
  "Fire Extinguisher":            { usabilityMonths: 12, usabilityLabel: "Checked & corrected per year", remark: REMARK_INSPECTION },
  "Fire Extinguisher (1 Kg)":     { usabilityMonths: 12, usabilityLabel: "Checked & corrected per year", remark: REMARK_INSPECTION },
  "First Aid-Kit":                { usabilityMonths: 12, usabilityLabel: "Checked & corrected per year", remark: REMARK_INSPECTION },
  "Triangular Reflector":         { usabilityMonths: 24, usabilityLabel: "At least 2 years",             remark: REMARK_INSPECTION },
  "Canvas for Tent":              { usabilityMonths: 6,  usabilityLabel: "At least 6 months",            remark: REMARK_INSPECTION },
  "Tire Safety Lock Cable":       { usabilityMonths: 6,  usabilityLabel: "At least 6 months",            remark: "Checked & corrected, or replaced" },
  "Light Visible Vest":           { usabilityMonths: 12, usabilityLabel: "At least 1 year",              remark: REMARK_HEAVY },
  "Nylon Rope and Ramp belt":     { usabilityMonths: 6,  usabilityLabel: "At least 6 months",            remark: REMARK_INSPECTION_CHANGE },
  "Steel Cable with Clamp":       { usabilityMonths: 6,  usabilityLabel: "At least 6 months",            remark: REMARK_INSPECTION_CHANGE },
  "Winch for Steel Cable":        { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_INSPECTION },
  "Pole Carrier Front and Rear":  { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_INSPECTION },
  "Safety Belt for Passenger and Driver": { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_INSPECTION },
  "Reflector Sticker":            { usabilityMonths: 12, usabilityLabel: "At least 1 year",              remark: REMARK_INSPECTION },
  // Helping tools — generally lifetime
  "Car Jack":                     { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_LIFETIME },
  "Car Jack 3 Ton":               { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_LIFETIME },
  "Car Jack with 3 Ton":          { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_LIFETIME },
  "Tire Wrench":                  { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_LIFETIME },
  "Lever long":                   { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_LIFETIME },
  "10, 12, 14 mm Combination Wrench": { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_LIFETIME },
  "All in one Philips and Flat Screw Driver": { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_LIFETIME },
  "Conventional Pliers":          { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_LIFETIME },
  // Accessories
  "Spare Tire":                   { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_INSPECTION },
  "CD Player":                    { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_LIFETIME },
  "Jumper Battery With Cable":    { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_LIFETIME },
  "Tow Strap":                    { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_LIFETIME },
  "Water Tanker":                 { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_INSPECTION },
  "Central Lock and Alarm":       { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_LIFETIME },
  "Dash Board Cream":             { usabilityMonths: 3,  usabilityLabel: "At least 3 months",            remark: REMARK_INSPECTION },
  "Leather Sheet for Cleaning":   { usabilityMonths: 6,  usabilityLabel: "At least 6 months",            remark: REMARK_INSPECTION },
  "Perfume":                      { usabilityMonths: 3,  usabilityLabel: "At least 3 months",            remark: REMARK_INSPECTION },
  // Comfort materials — usually replaced on inspection
  "Floor Mat Ready Made":         { usabilityMonths: 24, usabilityLabel: "At least 2 years",             remark: REMARK_INSPECTION_CHANGE },
  "Floor Mat Prepared":           { usabilityMonths: 12, usabilityLabel: "At least 1 year",              remark: REMARK_INSPECTION_CHANGE },
  "Heat Protector":               { usabilityMonths: 24, usabilityLabel: "At least 2 years",             remark: REMARK_INSPECTION },
  "Seat Cover Ready Made":        { usabilityMonths: 24, usabilityLabel: "At least 2 years",             remark: REMARK_INSPECTION_CHANGE },
  "Seat Cover Prepared":          { usabilityMonths: 12, usabilityLabel: "At least 1 year",              remark: REMARK_INSPECTION_CHANGE },
  "Steering Wheel Cover":         { usabilityMonths: 12, usabilityLabel: "At least 1 year",              remark: REMARK_INSPECTION_CHANGE },
  "Sun Visor":                    { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_INSPECTION },
  "Wind Protector":               { usabilityMonths: null, usabilityLabel: "Throughout lifetime of vehicle", remark: REMARK_INSPECTION },
  "Door Buffer":                  { usabilityMonths: 24, usabilityLabel: "At least 2 years",             remark: REMARK_INSPECTION_CHANGE },
  "Curtain":                      { usabilityMonths: 12, usabilityLabel: "At least 1 year",              remark: REMARK_INSPECTION_CHANGE },
  "Dash Board Cover":             { usabilityMonths: 12, usabilityLabel: "At least 1 year",              remark: REMARK_INSPECTION_CHANGE },
};

function build(names: string[]): ChecklistItem[] {
  return names.map((name) => {
    const meta = ITEM_CATALOG[name] ?? {
      usabilityMonths: null,
      usabilityLabel: "Throughout lifetime of vehicle",
      remark: REMARK_LIFETIME,
    };
    return { name, ...meta };
  });
}

export const SAFETY_COMFORT_STANDARDS: Record<SafetyComfortGroup, ChecklistSection[]> = {
  group_1: [
    { id: "fleet_safety", label: "List of Fleet Safety Material",
      items: build(["Fire Extinguisher","First Aid-Kit","Triangular Reflector","Safety Belt for Passenger and Driver","Tire Safety Lock Cable","Reflector Sticker"]) },
    { id: "helping_tools", label: "List of Vehicles Helping Tools",
      items: build(["Car Jack 3 Ton","Tire Wrench","10, 12, 14 mm Combination Wrench","All in one Philips and Flat Screw Driver","Conventional Pliers"]) },
    { id: "accessories", label: "Vehicle Accessories",
      items: build(["Spare Tire","CD Player","Jumper Battery With Cable","Tow Strap"]) },
    { id: "comfort", label: "Vehicle Comfort Materials",
      items: build(["Floor Mat Ready Made","Floor Mat Prepared","Heat Protector","Seat Cover Ready Made","Seat Cover Prepared","Steering Wheel Cover","Sun Visor","Wind Protector","Door Buffer","Curtain","Dash Board Cover"]) },
  ],
  group_2: [
    { id: "fleet_safety", label: "List of Fleet Safety Material",
      items: build(["Fire Extinguisher","First Aid-Kit","Triangular Reflector","Canvas for Tent","Tire Safety Lock Cable","Light Visible Vest","Nylon Rope and Ramp belt","Steel Cable with Clamp","Winch for Steel Cable","Pole Carrier Front and Rear","Reflector Sticker"]) },
    { id: "helping_tools", label: "List of Vehicles Helping Tools",
      items: build(["Car Jack","Tire Wrench","Lever long","10, 12, 14 mm Combination Wrench","All in one Philips and Flat Screw Driver","Conventional Pliers"]) },
    { id: "accessories", label: "Vehicle Accessories",
      items: build(["Spare Tire","CD Player","Water Tanker"]) },
    { id: "comfort", label: "Vehicle Comfort Materials",
      items: build(["Seat Cover Ready Made","Seat Cover Prepared","Heat Protector","Floor Mat Prepared","Floor Mat Ready Made","Sun Visor","Steering Wheel Cover","Curtain","Dash Board Cover"]) },
  ],
  group_3: [
    { id: "fleet_safety", label: "List of Fleet Safety Material",
      items: build(["Fire Extinguisher (1 Kg)","First Aid-Kit","Triangular Reflector","Safety Belt for Passenger and Driver","Tire Safety Lock Cable","Reflector Sticker"]) },
    { id: "helping_tools", label: "List of Vehicles Helping Tools",
      items: build(["Car Jack with 3 Ton","Tire Wrench","10, 12, 14 mm Combination Wrench","All in one Philips and Flat Screw Driver","Conventional Pliers"]) },
    { id: "accessories", label: "Vehicle Accessories",
      items: build(["Spare Tire","Central Lock and Alarm","CD Player","Jumper Battery With Cable","Dash Board Cream","Leather Sheet for Cleaning","Perfume"]) },
    { id: "comfort", label: "Vehicle Comfort Materials",
      items: build(["Floor Mat Ready Made","Heat Protector","Seat Cover Ready Made","Steering Wheel Cover","Floor Mat Prepared","Seat Cover Prepared","Sun Visor","Wind Protector","Door Buffer","Dash Board Cover"]) },
  ],
};

export const CONDITION_OPTIONS = [
  { value: "good",     label: "Good" },
  { value: "fair",     label: "Fair" },
  { value: "poor",     label: "Poor" },
  { value: "missing",  label: "Missing" },
] as const;

/** Shape stored under the form field key. */
export interface ChecklistEntry {
  present: boolean;
  condition?: string;
  notes?: string;
  /** ISO date (YYYY-MM-DD) the item was installed/last replaced. */
  installed_at?: string;
}

export type ChecklistValue = {
  group?: SafetyComfortGroup;
  /** keyed by `${sectionId}::${itemName}` */
  items?: Record<string, ChecklistEntry>;
};

/**
 * Compute expiry info for an item based on its install date and usability period.
 * Returns `null` if no install date is set or item has lifetime usability.
 */
export function computeExpiry(
  installedAt: string | undefined,
  usabilityMonths: number | null,
): { expiresOn: Date; daysLeft: number; expired: boolean; dueSoon: boolean } | null {
  if (!installedAt || !usabilityMonths) return null;
  const start = new Date(installedAt);
  if (Number.isNaN(start.getTime())) return null;
  const expiresOn = new Date(start);
  expiresOn.setMonth(expiresOn.getMonth() + usabilityMonths);
  const now = new Date();
  const diffMs = expiresOn.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return {
    expiresOn,
    daysLeft,
    expired: daysLeft < 0,
    dueSoon: daysLeft >= 0 && daysLeft <= 30,
  };
}
